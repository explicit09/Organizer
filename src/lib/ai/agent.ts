import Anthropic from "@anthropic-ai/sdk";
import type { AgentContext, AgentResponse, ToolExecutionContext, ToolResult } from "./types";
import { getToolsForAPI } from "./tools";
import { executeTool } from "./executors";
import { buildSystemPrompt } from "./prompts";

// Initialize Anthropic client
const anthropic = new Anthropic();

// Maximum number of tool call iterations to prevent infinite loops
const MAX_ITERATIONS = 10;

// Model to use
const MODEL = "claude-sonnet-4-20250514";

interface RunAgentOptions {
  userMessage: string;
  context: AgentContext;
  executionContext: ToolExecutionContext;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string | Anthropic.ContentBlock[];
  }>;
  onToolStart?: (toolName: string, input: Record<string, unknown>) => void;
  onToolEnd?: (toolName: string, result: ToolResult) => void;
  onText?: (text: string) => void;
}

export async function runAgent(options: RunAgentOptions): Promise<AgentResponse> {
  const {
    userMessage,
    context,
    executionContext,
    conversationHistory = [],
    onToolStart,
    onToolEnd,
    onText,
  } = options;

  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  // Get system prompt
  const systemPrompt = buildSystemPrompt(context);

  // Get tools for API
  const tools = getToolsForAPI();

  // Track tools used for response
  const toolsUsed: AgentResponse["toolsUsed"] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let iterations = 0;

  // Agentic loop
  while (iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      // Call Claude
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as Anthropic.Tool[],
        messages,
      });

      // Track tokens
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Process response content
      const toolResults: Anthropic.MessageParam["content"] = [];
      let textContent = "";

      for (const block of response.content) {
        if (block.type === "text") {
          textContent += block.text;
          onText?.(block.text);
        } else if (block.type === "tool_use") {
          // Tool call detected
          onToolStart?.(block.name, block.input as Record<string, unknown>);

          // Execute the tool
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            executionContext
          );

          // Track tool usage
          toolsUsed.push({
            name: block.name,
            input: block.input as Record<string, unknown>,
            result,
          });

          onToolEnd?.(block.name, result);

          // Add tool result for next iteration
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // If no tool calls, we're done
      if (response.stop_reason === "end_turn" || toolResults.length === 0) {
        return {
          content: textContent,
          toolsUsed,
          tokensUsed: {
            input: totalInputTokens,
            output: totalOutputTokens,
          },
        };
      }

      // Continue loop with tool results
      messages.push({
        role: "assistant",
        content: response.content,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });
    } catch (error) {
      console.error("[Agent] Error in agentic loop:", error);
      throw error;
    }
  }

  // Max iterations reached
  return {
    content: "I've completed multiple steps but need to stop to prevent an infinite loop. Here's what I've done so far.",
    toolsUsed,
    tokensUsed: {
      input: totalInputTokens,
      output: totalOutputTokens,
    },
  };
}

// Streaming version for real-time responses
export async function runAgentStreaming(
  options: RunAgentOptions & {
    onStream: (chunk: string) => void;
  }
): Promise<AgentResponse> {
  const {
    userMessage,
    context,
    executionContext,
    conversationHistory = [],
    onToolStart,
    onToolEnd,
    onStream,
  } = options;

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const systemPrompt = buildSystemPrompt(context);
  const tools = getToolsForAPI();
  const toolsUsed: AgentResponse["toolsUsed"] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let iterations = 0;
  let fullTextContent = "";

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      // Use streaming for the API call
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as Anthropic.Tool[],
        messages,
      });

      // Collect content blocks for processing
      const contentBlocks: Anthropic.ContentBlock[] = [];
      let currentText = "";

      // Process stream events
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "text") {
            currentText = "";
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            currentText += event.delta.text;
            fullTextContent += event.delta.text;
            onStream(event.delta.text);
          }
        } else if (event.type === "content_block_stop") {
          // Block completed
        }
      }

      // Get final message
      const finalMessage = await stream.finalMessage();

      // Track tokens
      totalInputTokens += finalMessage.usage.input_tokens;
      totalOutputTokens += finalMessage.usage.output_tokens;

      // Process tool calls
      const toolResults: Anthropic.MessageParam["content"] = [];

      for (const block of finalMessage.content) {
        if (block.type === "tool_use") {
          onToolStart?.(block.name, block.input as Record<string, unknown>);
          onStream(`\n[Using tool: ${block.name}...]\n`);

          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            executionContext
          );

          toolsUsed.push({
            name: block.name,
            input: block.input as Record<string, unknown>,
            result,
          });

          onToolEnd?.(block.name, result);
          onStream(`[Tool ${block.name} completed]\n`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // If no tool calls, we're done
      if (finalMessage.stop_reason === "end_turn" || toolResults.length === 0) {
        return {
          content: fullTextContent,
          toolsUsed,
          tokensUsed: {
            input: totalInputTokens,
            output: totalOutputTokens,
          },
        };
      }

      // Continue with tool results
      messages.push({
        role: "assistant",
        content: finalMessage.content,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });
    } catch (error) {
      console.error("[Agent Streaming] Error:", error);
      throw error;
    }
  }

  return {
    content: fullTextContent,
    toolsUsed,
    tokensUsed: {
      input: totalInputTokens,
      output: totalOutputTokens,
    },
  };
}
