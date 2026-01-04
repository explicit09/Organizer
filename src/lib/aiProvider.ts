import type { ItemPriority, ItemType, RecurrenceRule } from "./items";
import { routeInput } from "./ai";
import { extractDueDateFromText } from "./dateParser";

export type AiItem = {
  type: ItemType;
  title: string;
  priority?: ItemPriority;
  subtasks?: string[];
  estimatedMinutes?: number;
  dueAt?: string;
  recurrenceRule?: RecurrenceRule;
  agenda?: string;
};

export type AiPlan = {
  items: AiItem[];
  rationale: string;
};

// Time estimation based on task type and complexity
function estimateTime(title: string, type: ItemType): number {
  const lower = title.toLowerCase();

  // Meeting durations
  if (type === "meeting") {
    if (lower.includes("quick") || lower.includes("brief") || lower.includes("standup")) {
      return 15;
    }
    if (lower.includes("1:1") || lower.includes("check-in") || lower.includes("sync")) {
      return 30;
    }
    if (lower.includes("workshop") || lower.includes("training")) {
      return 120;
    }
    return 60; // Default meeting
  }

  // School work
  if (type === "school") {
    if (lower.includes("quiz") || lower.includes("homework")) {
      return 45;
    }
    if (lower.includes("exam") || lower.includes("test")) {
      return 120;
    }
    if (lower.includes("essay") || lower.includes("paper") || lower.includes("report")) {
      return 180;
    }
    if (lower.includes("project")) {
      return 240;
    }
    if (lower.includes("study") || lower.includes("review")) {
      return 60;
    }
    return 60;
  }

  // Tasks
  if (lower.includes("quick") || lower.includes("small") || lower.includes("minor")) {
    return 15;
  }
  if (lower.includes("review") || lower.includes("check")) {
    return 30;
  }
  if (lower.includes("write") || lower.includes("create") || lower.includes("draft")) {
    return 60;
  }
  if (lower.includes("research") || lower.includes("analyze")) {
    return 90;
  }
  if (lower.includes("build") || lower.includes("implement") || lower.includes("develop")) {
    return 120;
  }
  if (lower.includes("plan") || lower.includes("design")) {
    return 60;
  }

  return 30; // Default task
}

function fallbackBreakdown(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("exam") || lower.includes("study")) {
    return ["Review syllabus", "Plan study blocks", "Practice questions"];
  }
  if (lower.includes("project")) {
    return ["Define scope", "Create outline", "Execute first draft"];
  }
  if (lower.includes("meeting")) {
    return ["Draft agenda", "Collect materials", "Send prep note"];
  }
  if (lower.includes("essay") || lower.includes("paper")) {
    return ["Research topic", "Create outline", "Write first draft", "Edit and revise"];
  }
  if (lower.includes("presentation")) {
    return ["Outline key points", "Create slides", "Practice delivery"];
  }
  return [];
}

function detectRecurrence(text: string): RecurrenceRule | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("every day") || lower.includes("daily")) return "daily";
  if (lower.includes("every week") || lower.includes("weekly")) return "weekly";
  if (lower.includes("bi-weekly") || lower.includes("every two weeks")) return "biweekly";
  if (lower.includes("every month") || lower.includes("monthly")) return "monthly";
  if (lower.includes("every year") || lower.includes("yearly") || lower.includes("annual")) return "yearly";
  return undefined;
}

function generateAgenda(title: string): string | undefined {
  const lower = title.toLowerCase();

  if (lower.includes("1:1") || lower.includes("one on one")) {
    return `## Agenda
1. Check-in / How are things going?
2. Updates since last meeting
3. Blockers or challenges
4. Priorities for the coming week
5. Action items and next steps`;
  }

  if (lower.includes("standup") || lower.includes("daily")) {
    return `## Daily Standup
- What did you accomplish yesterday?
- What are you working on today?
- Any blockers?`;
  }

  if (lower.includes("review") || lower.includes("retrospective")) {
    return `## Review Agenda
1. What went well?
2. What could be improved?
3. Action items for next iteration`;
  }

  if (lower.includes("planning") || lower.includes("kickoff")) {
    return `## Planning Agenda
1. Project overview and goals
2. Scope and deliverables
3. Timeline and milestones
4. Roles and responsibilities
5. Next steps`;
  }

  return undefined;
}

export async function generateAiPlan(text: string): Promise<AiPlan> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Extract date from text for fallback
  const { dueAt, cleanedText } = extractDueDateFromText(text);
  const recurrence = detectRecurrence(text);

  if (!apiKey) {
    const routed = routeInput(cleanedText || text);
    return {
      items: routed.map((entry) => ({
        type: entry.type,
        title: entry.title,
        subtasks: fallbackBreakdown(entry.title),
        estimatedMinutes: estimateTime(entry.title, entry.type),
        dueAt: dueAt ?? undefined,
        recurrenceRule: recurrence,
        agenda: entry.type === "meeting" ? generateAgenda(entry.title) : undefined,
      })),
      rationale: "Fallback routing (no AI key configured). Time estimates based on task complexity.",
    };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an intelligent task organizer. Analyze user input and create structured items.
For each item, determine:
- type: "task" | "meeting" | "school"
- title: clear, actionable title
- priority: "urgent" | "high" | "medium" | "low" based on deadline/importance cues
- estimatedMinutes: realistic time estimate (15-480 minutes)
- subtasks: break complex items into 2-5 subtasks
- dueAt: ISO date string if mentioned (e.g., "2024-01-15T23:59:59.999Z")
- recurrenceRule: "daily" | "weekly" | "biweekly" | "monthly" | "yearly" if recurring
- agenda: for meetings, provide a structured agenda

Consider urgency keywords: "ASAP", "urgent", "by tomorrow", "this week"
Consider complexity: longer tasks need more time, meetings typically 30-60 min`,
        },
        {
          role: "user",
          content: `Parse this and return JSON with shape:
{
  "items": [
    {
      "type": "task|meeting|school",
      "title": "...",
      "priority": "urgent|high|medium|low",
      "estimatedMinutes": number,
      "subtasks": ["..."],
      "dueAt": "ISO date or null",
      "recurrenceRule": "daily|weekly|biweekly|monthly|yearly or null",
      "agenda": "markdown agenda for meetings or null"
    }
  ],
  "rationale": "brief explanation of categorization and time estimates"
}

Input: ${text}`,
        },
      ],
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "AI request failed");
  }

  const content = body.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content) as AiPlan;
    return {
      items: (parsed.items ?? []).map((item) => ({
        ...item,
        // Ensure time estimate is reasonable
        estimatedMinutes: item.estimatedMinutes
          ? Math.max(15, Math.min(480, item.estimatedMinutes))
          : estimateTime(item.title, item.type),
      })),
      rationale: parsed.rationale ?? "AI-powered routing and time estimation",
    };
  } catch {
    // Fallback if JSON parsing fails
    const routed = routeInput(text);
    return {
      items: routed.map((entry) => ({
        type: entry.type,
        title: entry.title,
        subtasks: fallbackBreakdown(entry.title),
        estimatedMinutes: estimateTime(entry.title, entry.type),
        dueAt: dueAt ?? undefined,
      })),
      rationale: "Fallback routing (AI response parsing failed)",
    };
  }
}

// ========== Time Estimation API ==========

export async function estimateTaskTime(
  title: string,
  details?: string,
  type: ItemType = "task"
): Promise<{ minutes: number; confidence: "low" | "medium" | "high"; reasoning: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback estimation
  const fallbackMinutes = estimateTime(title, type);

  if (!apiKey) {
    return {
      minutes: fallbackMinutes,
      confidence: "low",
      reasoning: "Estimated based on task keywords and type.",
    };
  }

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You estimate task durations. Return JSON: {"minutes": number, "confidence": "low"|"medium"|"high", "reasoning": "brief explanation"}
Consider: task complexity, typical durations for similar tasks, any mentioned constraints.
Minutes should be between 15 and 480.`,
          },
          {
            role: "user",
            content: `Estimate time for this ${type}:
Title: ${title}
${details ? `Details: ${details}` : ""}`,
          },
        ],
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error("API error");
    }

    const content = body.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);

    return {
      minutes: Math.max(15, Math.min(480, parsed.minutes ?? fallbackMinutes)),
      confidence: parsed.confidence ?? "medium",
      reasoning: parsed.reasoning ?? "AI-based estimation",
    };
  } catch {
    return {
      minutes: fallbackMinutes,
      confidence: "low",
      reasoning: "Estimated based on task keywords and type (AI unavailable).",
    };
  }
}

// ========== Meeting Agenda Generation ==========

export async function generateMeetingAgenda(
  title: string,
  attendees?: string[],
  context?: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback agenda
  const fallback = generateAgenda(title) ?? `## Meeting: ${title}

1. Welcome and introductions
2. Review agenda and objectives
3. Main discussion topics
4. Action items and assignments
5. Next steps and follow-up`;

  if (!apiKey) {
    return fallback;
  }

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "Generate professional, structured meeting agendas in markdown format.",
          },
          {
            role: "user",
            content: `Create an agenda for this meeting:
Title: ${title}
${attendees?.length ? `Attendees: ${attendees.join(", ")}` : ""}
${context ? `Context: ${context}` : ""}

Return a well-structured markdown agenda with time allocations.`,
          },
        ],
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      return fallback;
    }

    return body.choices?.[0]?.message?.content ?? fallback;
  } catch {
    return fallback;
  }
}
