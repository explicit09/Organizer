import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../lib/auth";
import {
  buildPlannerContext,
  getPlannerSystemPrompt,
  parsePlannerActions,
  executePlannerAction,
  type PlannerMode,
  type PlannerResult,
} from "../../../../lib/ai-planner";
import {
  createConversation,
  getConversation,
  addMessageToConversation,
} from "../../../../lib/plans";

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
    const { message, mode = "general", conversationId, history = [] } = body as {
      message: string;
      mode?: PlannerMode;
      conversationId?: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build context for the AI
    const context = buildPlannerContext(mode, { userId });
    const systemPrompt = getPlannerSystemPrompt(context);

    // Prepare messages for the LLM
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    // Call the LLM
    const llmResponse = await callLLM(messages);

    // Parse actions from the response
    const actions = parsePlannerActions(llmResponse);

    // Execute all actions
    const results: PlannerResult[] = [];
    const allArtifacts: Array<{
      type: "plan" | "code" | "search_results" | "repo_analysis" | "pr_draft";
      title: string;
      content: unknown;
    }> = [];

    for (const action of actions) {
      const result = await executePlannerAction(action, { userId });
      results.push(result);
      if (result.artifacts) {
        allArtifacts.push(...result.artifacts);
      }
    }

    // Build the response message
    const responseMessage = buildResponseMessage(results);

    // Save to conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const conversation = createConversation({ mode }, { userId });
      activeConversationId = conversation.id;
    }

    // Add messages to conversation
    addMessageToConversation(activeConversationId, {
      role: "user",
      content: message,
    }, { userId });

    addMessageToConversation(activeConversationId, {
      role: "assistant",
      content: responseMessage,
      actions: actions.map((a, i) => ({
        type: a.type,
        status: results[i].success ? "completed" : "failed",
        result: results[i].data,
      })),
      artifacts: allArtifacts,
    }, { userId });

    return NextResponse.json({
      response: responseMessage,
      conversationId: activeConversationId,
      actions: actions.map((a, i) => ({
        type: a.type,
        status: results[i].success ? "completed" : "failed",
        message: results[i].message,
        data: results[i].data,
      })),
      artifacts: allArtifacts,
    });
  } catch (error) {
    console.error("Planner chat error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function callLLM(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    return callClaude(messages, anthropicKey);
  }

  if (openaiKey) {
    return callOpenAI(messages, openaiKey);
  }

  // Fallback response
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
      max_tokens: 2048,
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
      max_tokens: 2048,
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
  const systemMessage = messages[0]?.content || "";
  
  // Detect mode from system message
  const isResearchMode = systemMessage.includes("MODE: RESEARCH");
  const isCodeMode = systemMessage.includes("MODE: CODE");
  const isPlanningMode = systemMessage.includes("MODE: PLANNING");

  // Research mode responses
  if (isResearchMode) {
    if (userMessage.includes("internship") || userMessage.includes("job")) {
      return JSON.stringify({
        action: "web_search",
        data: {
          query: userMessage,
          filters: { type: "internships" },
        },
      });
    }
    if (userMessage.includes("company") || userMessage.includes("companies")) {
      return JSON.stringify({
        action: "web_search",
        data: {
          query: userMessage,
          filters: { type: "companies" },
        },
      });
    }
  }

  // Code mode responses
  if (isCodeMode) {
    if (userMessage.includes("analyze") || userMessage.includes("structure")) {
      return JSON.stringify({
        action: "analyze_repo",
        data: {
          analysisType: "full",
        },
      });
    }
    if (userMessage.includes("implement") || userMessage.includes("feature")) {
      const feature = userMessage.replace(/implement|add|create|build/gi, "").trim();
      return JSON.stringify({
        action: "suggest_implementation",
        data: {
          feature: feature || "new feature",
        },
      });
    }
  }

  // Planning mode responses
  if (isPlanningMode) {
    if (userMessage.includes("plan") || userMessage.includes("break down")) {
      return JSON.stringify({
        action: "create_plan",
        data: {
          title: "New Plan",
          goal: userMessage,
          steps: [
            { title: "Research and understand requirements", estimatedMinutes: 30 },
            { title: "Break down into smaller tasks", estimatedMinutes: 20 },
            { title: "Prioritize and schedule", estimatedMinutes: 15 },
            { title: "Begin execution", estimatedMinutes: 60 },
          ],
        },
      });
    }
    if (userMessage.includes("schedule") || userMessage.includes("task")) {
      return JSON.stringify({
        action: "schedule_tasks",
        data: {
          tasks: [
            { title: "Task from planning session", priority: "medium" },
          ],
          strategy: "smart",
        },
      });
    }
  }

  // Default: create a task or respond
  if (userMessage.includes("create") || userMessage.includes("add") || userMessage.includes("new task")) {
    const titleMatch = userMessage.match(/(?:create|add|new)\s+(?:a\s+)?(?:task\s+)?(?:called|named|:)?\s*["']?([^"'\n]+)["']?/i);
    const title = titleMatch?.[1]?.trim() || "New task";
    
    return JSON.stringify({
      action: "create_task",
      data: {
        title,
        priority: "medium",
      },
    });
  }

  // Fallback: helpful response based on mode
  const modeHelp: Record<string, string> = {
    research: "I can help you find internships, companies, and resources. Try asking:\n- Find software engineering internships\n- Research companies hiring junior developers\n- What skills should I learn?",
    code: "I can help you with code analysis and implementation. Try asking:\n- Analyze my repository structure\n- Help me implement a new feature\n- Generate a PR for these changes",
    planning: "I can help you create plans and schedule tasks. Try asking:\n- Help me plan my week\n- Break down this project into steps\n- Schedule these tasks smartly",
    general: "I can help you with task management and productivity. Try asking:\n- Create a new task\n- What should I focus on today?\n- Show me my upcoming items",
  };

  const mode = isResearchMode ? "research" : isCodeMode ? "code" : isPlanningMode ? "planning" : "general";

  return JSON.stringify({
    action: "respond",
    data: {
      message: `I'm here to help! ${modeHelp[mode]}`,
    },
  });
}

function buildResponseMessage(results: PlannerResult[]): string {
  const messages: string[] = [];

  for (const result of results) {
    if (result.success) {
      messages.push(result.message);
    } else {
      messages.push(`Error: ${result.message}`);
    }
  }

  return messages.join("\n\n");
}
