import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import {
  buildAgentContext,
  getSystemPrompt,
  parseActionsFromResponse,
  executeAction,
  type AgentAction,
  type ActionResult,
} from "../../../../lib/ai-agent";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build context for the AI
    const context = buildAgentContext({ userId });
    const systemPrompt = getSystemPrompt(context);

    // Prepare messages for the LLM
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    // Call the LLM (supports multiple providers)
    const llmResponse = await callLLM(messages);

    // Parse actions from the response
    const actions = parseActionsFromResponse(llmResponse);

    // Execute all actions
    const results: ActionResult[] = [];
    for (const action of actions) {
      const result = await executeAction(action, { userId });
      results.push(result);
    }

    // Build the response message
    const responseMessage = buildResponseMessage(actions, results);
    const navigateTo = results.find((r) => r.navigate)?.navigate;

    return NextResponse.json({
      response: responseMessage,
      actions: actions.map((a, i) => ({
        type: a.type,
        success: results[i].success,
        message: results[i].message,
        data: results[i].data,
      })),
      navigate: navigateTo,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function callLLM(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  // Check for API keys in order of preference
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    return callClaude(messages, anthropicKey);
  }

  if (openaiKey) {
    return callOpenAI(messages, openaiKey);
  }

  // Fallback to a simple rule-based response if no API key
  return generateFallbackResponse(messages);
}

async function callClaude(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  apiKey: string
): Promise<string> {
  const systemMessage = messages.find((m) => m.role === "system")?.content || "";
  const chatMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: systemMessage,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Claude API error");
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

async function callOpenAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API error");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

function generateFallbackResponse(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): string {
  const userMessage = messages[messages.length - 1]?.content.toLowerCase() || "";

  // Simple pattern matching for common requests
  if (userMessage.includes("create") || userMessage.includes("add") || userMessage.includes("new")) {
    // Try to extract title and type
    const titleMatch = userMessage.match(/(?:create|add|new)\s+(?:a\s+)?(?:task|meeting|item)?\s*(?:called|named|:)?\s*["']?([^"'\n]+)["']?/i);
    const title = titleMatch?.[1]?.trim() || "New Item";

    let type: "task" | "meeting" | "school" = "task";
    if (userMessage.includes("meeting")) type = "meeting";
    if (userMessage.includes("school") || userMessage.includes("study") || userMessage.includes("homework")) type = "school";

    return JSON.stringify({
      action: "create_item",
      data: {
        title,
        type,
        priority: "medium",
      },
    });
  }

  if (userMessage.includes("complete") || userMessage.includes("done") || userMessage.includes("finish")) {
    return JSON.stringify({
      action: "respond",
      data: {
        message: "I can help you mark items as complete. Could you tell me which specific task you'd like to complete? You can say something like 'mark [task name] as done'.",
      },
    });
  }

  if (userMessage.includes("summary") || userMessage.includes("overview") || userMessage.includes("status")) {
    return JSON.stringify({
      action: "get_summary",
      data: { period: "today" },
    });
  }

  if (userMessage.includes("list") || userMessage.includes("show") || userMessage.includes("what")) {
    let type: string | undefined;
    if (userMessage.includes("task")) type = "task";
    if (userMessage.includes("meeting")) type = "meeting";
    if (userMessage.includes("school")) type = "school";

    return JSON.stringify({
      action: "list_items",
      data: { type, limit: 10 },
    });
  }

  if (userMessage.includes("go to") || userMessage.includes("navigate") || userMessage.includes("open")) {
    let to = "/dashboard";
    if (userMessage.includes("task")) to = "/tasks";
    if (userMessage.includes("meeting")) to = "/meetings";
    if (userMessage.includes("school")) to = "/school";
    if (userMessage.includes("inbox")) to = "/inbox";
    if (userMessage.includes("schedule")) to = "/schedule";

    return JSON.stringify({
      action: "navigate",
      data: { to },
    });
  }

  // Default response
  return JSON.stringify({
    action: "respond",
    data: {
      message: "I'm here to help you organize your tasks, meetings, and school work. You can ask me to:\n\n" +
        "- Create a new task, meeting, or school item\n" +
        "- Show your current tasks or summary\n" +
        "- Mark items as complete\n" +
        "- Reschedule or prioritize items\n" +
        "- Navigate to different sections\n\n" +
        "What would you like to do?",
    },
  });
}

function buildResponseMessage(actions: AgentAction[], results: ActionResult[]): string {
  const messages: string[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const result = results[i];

    if (action.type === "respond") {
      messages.push(action.data.message);
    } else if (action.type === "get_summary" && result.success && result.data) {
      const data = result.data as {
        stats: {
          total: number;
          completed: number;
          inProgress: number;
          notStarted: number;
          overdue: number;
        };
        upcomingDue: Array<{ title: string; dueAt: string }>;
      };

      messages.push(
        `Here's your ${action.data.period || "today"}'s summary:\n\n` +
        `- Total items: ${data.stats.total}\n` +
        `- Completed: ${data.stats.completed}\n` +
        `- In progress: ${data.stats.inProgress}\n` +
        `- Not started: ${data.stats.notStarted}\n` +
        `- Overdue: ${data.stats.overdue}\n\n` +
        (data.upcomingDue.length > 0
          ? "Upcoming:\n" + data.upcomingDue.map((i) => `- ${i.title} (${new Date(i.dueAt).toLocaleDateString()})`).join("\n")
          : "No upcoming deadlines.")
      );
    } else if (action.type === "list_items" && result.success && result.data) {
      const items = result.data as Array<{ title: string; type: string; status: string; priority: string }>;
      if (items.length === 0) {
        messages.push("No items found.");
      } else {
        messages.push(
          `Found ${items.length} item(s):\n\n` +
          items.map((i) => `- [${i.type}] ${i.title} (${i.status}, ${i.priority})`).join("\n")
        );
      }
    } else if (result.success) {
      messages.push(result.message);
    } else {
      messages.push(`Failed: ${result.message}`);
    }
  }

  return messages.join("\n\n");
}
