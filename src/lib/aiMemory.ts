import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getDefaultUserId } from "./auth";
import type { AgentAction } from "./ai-agent";

// ========== Types ==========

export type ConversationMessage = {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  actions?: AgentAction[];
  createdAt: string;
};

type MessageRow = {
  id: string;
  user_id: string;
  role: string;
  content: string;
  actions_json: string | null;
  created_at: string;
};

// ========== Helpers ==========

function mapRow(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role as "user" | "assistant",
    content: row.content,
    actions: row.actions_json ? JSON.parse(row.actions_json) : undefined,
    createdAt: row.created_at,
  };
}

// ========== CRUD ==========

export function saveMessage(
  message: {
    role: "user" | "assistant";
    content: string;
    actions?: AgentAction[];
  },
  options?: { userId?: string }
): ConversationMessage {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO ai_conversations (id, user_id, role, content, actions_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    message.role,
    message.content,
    message.actions ? JSON.stringify(message.actions) : null,
    now
  );

  return getMessage(id, { userId })!;
}

export function getMessage(
  id: string,
  options?: { userId?: string }
): ConversationMessage | null {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  const row = db
    .prepare(`SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?`)
    .get(id, userId) as MessageRow | undefined;

  return row ? mapRow(row) : null;
}

export function getRecentContext(
  options?: { userId?: string; limit?: number }
): ConversationMessage[] {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();
  const limit = options?.limit ?? 10;

  const rows = db
    .prepare(
      `SELECT * FROM ai_conversations
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as MessageRow[];

  return rows.map(mapRow).reverse(); // Return in chronological order
}

export function clearConversationHistory(options?: { userId?: string }): void {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  db.prepare(`DELETE FROM ai_conversations WHERE user_id = ?`).run(userId);
}

// ========== Context Summary ==========

export type ConversationContext = {
  recentMessages: ConversationMessage[];
  recentActions: AgentAction[];
  summary: string;
};

export function getConversationContext(
  options?: { userId?: string }
): ConversationContext {
  const recentMessages = getRecentContext({ ...options, limit: 10 });

  // Extract recent actions
  const recentActions: AgentAction[] = [];
  for (const msg of recentMessages) {
    if (msg.actions) {
      recentActions.push(...msg.actions);
    }
  }

  // Generate a summary of recent conversation
  const topics = new Set<string>();
  for (const action of recentActions.slice(-5)) {
    if (action.type === "create_item") {
      const data = action.data as { title?: string } | undefined;
      if (data?.title) topics.add(data.title);
    }
  }

  const summary = topics.size > 0
    ? `Recent topics: ${Array.from(topics).slice(0, 3).join(", ")}`
    : "No recent conversation context";

  return {
    recentMessages,
    recentActions: recentActions.slice(-10),
    summary,
  };
}

// ========== Pattern Learning ==========

export type UserPattern = {
  // Time preferences
  preferredWorkHours: { start: number; end: number };
  peakProductivityTime: "morning" | "afternoon" | "evening";

  // Task patterns
  averageTaskDuration: number;
  commonTags: string[];
  completionRateByDayOfWeek: Record<string, number>;

  // Behavior patterns
  typicalPriority: string;
  mostActiveAreas: string[];
};

export function analyzeUserPatterns(options?: { userId?: string }): UserPattern {
  const db = getDb();
  const userId = options?.userId ?? getDefaultUserId();

  // Get completed items with timing
  const completedItems = db
    .prepare(
      `SELECT * FROM items
       WHERE user_id = ? AND status = 'completed'
       ORDER BY updated_at DESC
       LIMIT 100`
    )
    .all(userId) as Array<{
      priority: string;
      tags_json: string | null;
      estimated_minutes: number | null;
      updated_at: string;
      area: string | null;
    }>;

  // Analyze priority preference
  const priorityCounts: Record<string, number> = {};
  for (const item of completedItems) {
    priorityCounts[item.priority] = (priorityCounts[item.priority] ?? 0) + 1;
  }
  const typicalPriority = Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "medium";

  // Analyze common tags
  const tagCounts: Record<string, number> = {};
  for (const item of completedItems) {
    if (item.tags_json) {
      const tags = JSON.parse(item.tags_json) as string[];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
  }
  const commonTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Analyze completion by day of week
  const completionByDay: Record<string, { completed: number; total: number }> = {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const day of days) {
    completionByDay[day] = { completed: 0, total: 0 };
  }

  for (const item of completedItems) {
    const day = days[new Date(item.updated_at).getDay()];
    completionByDay[day].completed++;
    completionByDay[day].total++;
  }

  const completionRateByDayOfWeek: Record<string, number> = {};
  for (const day of days) {
    const { completed, total } = completionByDay[day];
    completionRateByDayOfWeek[day] = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  // Find peak day
  const peakDay = Object.entries(completionRateByDayOfWeek).sort((a, b) => b[1] - a[1])[0]?.[0];
  const isWeekend = peakDay === "Sat" || peakDay === "Sun";

  // Average task duration
  const durationsWithValues = completedItems
    .filter((i) => i.estimated_minutes)
    .map((i) => i.estimated_minutes!);
  const averageTaskDuration = durationsWithValues.length
    ? Math.round(durationsWithValues.reduce((a, b) => a + b, 0) / durationsWithValues.length)
    : 30;

  // Most active areas
  const areaCounts: Record<string, number> = {};
  for (const item of completedItems) {
    if (item.area) {
      areaCounts[item.area] = (areaCounts[item.area] ?? 0) + 1;
    }
  }
  const mostActiveAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area]) => area);

  return {
    preferredWorkHours: { start: 9, end: 18 }, // Default, could be learned from focus sessions
    peakProductivityTime: isWeekend ? "afternoon" : "morning",
    averageTaskDuration,
    commonTags,
    completionRateByDayOfWeek,
    typicalPriority,
    mostActiveAreas,
  };
}

export function suggestOptimalSchedule(
  taskTitle: string,
  options?: { userId?: string }
): string {
  const patterns = analyzeUserPatterns(options);

  const suggestions: string[] = [];

  // Suggest based on peak time
  if (patterns.peakProductivityTime === "morning") {
    suggestions.push("Schedule for morning (9-12 AM) when you're most productive");
  } else if (patterns.peakProductivityTime === "afternoon") {
    suggestions.push("Schedule for afternoon (1-5 PM) based on your patterns");
  } else {
    suggestions.push("Schedule for evening when you tend to focus best");
  }

  // Suggest duration
  suggestions.push(`Estimate ${patterns.averageTaskDuration} minutes based on similar tasks`);

  // Suggest best day
  const bestDays = Object.entries(patterns.completionRateByDayOfWeek)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([day]) => day);

  if (bestDays.length > 0) {
    suggestions.push(`${bestDays.join(" or ")} tend to be your most productive days`);
  }

  return suggestions.join(". ");
}
