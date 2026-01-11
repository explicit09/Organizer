import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "../../../../../lib/auth";
import { runAgentStreaming } from "../../../../../lib/ai/agent";
import { buildAgentContext } from "../../../../../lib/ai/context";
import { getDb } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const userId = session ? getSessionUserId(session) : null;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { message, conversationId } = body as {
      message: string;
      conversationId?: string;
    };

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get conversation history if conversationId provided
    const history = conversationId ? getConversationHistory(userId, conversationId) : [];

    // Build context
    const context = buildAgentContext({ userId });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Save user message
          const convId = conversationId || generateId();
          saveMessage(userId, convId, "user", message);

          // Send conversation ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "start", conversationId: convId })}\n\n`)
          );

          let fullResponse = "";
          const toolsUsed: Array<{
            name: string;
            input: Record<string, unknown>;
            result: unknown;
          }> = [];

          // Run agent with streaming
          const response = await runAgentStreaming({
            userMessage: message,
            context,
            executionContext: { userId },
            conversationHistory: history,
            onStream: (chunk) => {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`)
              );
            },
            onToolStart: (toolName, input) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_start", toolName, input })}\n\n`)
              );
            },
            onToolEnd: (toolName, result) => {
              toolsUsed.push({ name: toolName, input: {}, result });
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_end", toolName, result })}\n\n`)
              );
            },
          });

          // Save assistant response
          saveMessage(userId, convId, "assistant", response.content, {
            toolsUsed: response.toolsUsed,
            tokensUsed: response.tokensUsed,
          });

          // Check for navigation in tool results
          let navigate: string | undefined;
          for (const tool of response.toolsUsed) {
            const result = tool.result as { data?: { navigate?: string } };
            if (result.data?.navigate) {
              navigate = result.data.navigate;
              break;
            }
          }

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                conversationId: convId,
                toolsUsed: response.toolsUsed.map((t) => ({
                  name: t.name,
                  success: t.result.success,
                })),
                tokensUsed: response.tokensUsed,
                navigate,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("[Stream] Error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Stream] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Helper functions
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function getConversationHistory(
  userId: string,
  conversationId: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT role, content FROM ai_conversations
      WHERE user_id = ? AND id LIKE ?
      ORDER BY created_at ASC
      LIMIT 20
    `
    )
    .all(userId, `${conversationId}%`) as Array<{ role: string; content: string }>;

  return rows.map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));
}

function saveMessage(
  userId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: {
    toolsUsed?: Array<{ name: string; input: Record<string, unknown>; result: unknown }>;
    tokensUsed?: { input: number; output: number };
  }
) {
  const db = getDb();
  const id = `${conversationId}_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO ai_conversations (id, user_id, role, content, tool_calls_json, tokens_used, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    userId,
    role,
    content,
    metadata?.toolsUsed ? JSON.stringify(metadata.toolsUsed) : null,
    metadata?.tokensUsed ? metadata.tokensUsed.input + metadata.tokensUsed.output : null,
    now
  );
}
