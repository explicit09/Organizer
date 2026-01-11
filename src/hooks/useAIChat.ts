"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type ToolExecution = {
  name: string;
  status: "running" | "completed" | "error";
  success?: boolean;
};

export type Artifact = {
  type: "plan" | "code" | "search_results" | "repo_analysis" | "pr_draft";
  title: string;
  content: unknown;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Array<{
    type: string;
    success: boolean;
    message: string;
  }>;
  tools?: ToolExecution[];
  artifacts?: Artifact[];
  isStreaming?: boolean;
  timestamp: Date;
};

export type AIChatMode = "general" | "planning" | "research" | "code";

export type Conversation = {
  id: string;
  title: string;
  mode: AIChatMode;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

interface UseAIChatOptions {
  mode?: AIChatMode;
  onNavigate?: (path: string) => void;
  onArtifact?: (artifact: Artifact) => void;
}

// Format tool names for display
export function formatToolName(name: string): string {
  const toolLabels: Record<string, string> = {
    create_item: "Creating item",
    list_items: "Listing items",
    update_item: "Updating item",
    delete_item: "Deleting item",
    mark_complete: "Marking complete",
    batch_update: "Batch updating",
    bulk_create: "Creating items",
    search_items: "Searching",
    search_web: "Searching web",
    fetch_webpage: "Reading page",
    research_topic: "Researching",
    break_down_task: "Breaking down task",
    create_plan: "Creating plan",
    suggest_schedule: "Analyzing schedule",
    get_analytics: "Getting analytics",
    analyze_patterns: "Analyzing patterns",
    get_dependency_graph: "Getting dependencies",
    get_summary: "Getting summary",
    remember_preference: "Remembering",
    recall_context: "Recalling",
    log_observation: "Logging observation",
    start_focus_session: "Starting focus",
    get_calendar_context: "Checking calendar",
    navigate: "Navigating",
  };
  return toolLabels[name] || name.replace(/_/g, " ");
}

// Normalize markdown content to ensure proper rendering
export function normalizeMarkdown(content: string): string {
  return content
    .replace(/[\u2217\uFE61\uFF0A]/g, "*")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019\u201C\u201D]/g, (match) => {
      return match === "\u2018" || match === "\u2019" ? "'" : '"';
    })
    .replace(/\r\n/g, "\n");
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { mode = "general", onNavigate, onArtifact } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/planner/conversations");
      if (res.ok) {
        const data = await res.json();
        // API returns dates as strings, convert them to Date objects
        type ApiMessage = Omit<Message, "timestamp"> & { timestamp: string };
        type ApiConversation = Omit<Conversation, "messages" | "createdAt" | "updatedAt"> & {
          messages: ApiMessage[];
          createdAt: string;
          updatedAt: string;
        };
        setConversations(
          (data.conversations || []).map((c: ApiConversation) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt || c.createdAt),
            messages: (c.messages || []).map((m: ApiMessage) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setConversationId(id);
      setMessages(conv.messages);
      // Collect artifacts from messages
      const allArtifacts: Artifact[] = [];
      conv.messages.forEach((m) => {
        if (m.artifacts) {
          allArtifacts.push(...m.artifacts);
        }
      });
      setArtifacts(allArtifacts);
    }
  }, [conversations]);

  // Streaming send function
  const sendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      tools: [],
      isStreaming: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          mode,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let currentContent = "";
      let currentTools: ToolExecution[] = [];
      let currentArtifacts: Artifact[] = [];
      let navigateTo: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "start":
                setConversationId(data.conversationId);
                break;

              case "text":
                currentContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: currentContent }
                      : m
                  )
                );
                break;

              case "tool_start":
                currentTools = [
                  ...currentTools,
                  { name: data.toolName, status: "running" },
                ];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, tools: currentTools }
                      : m
                  )
                );
                break;

              case "tool_end":
                currentTools = currentTools.map((t) =>
                  t.name === data.toolName && t.status === "running"
                    ? { ...t, status: "completed", success: data.result?.success }
                    : t
                );
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, tools: currentTools }
                      : m
                  )
                );
                break;

              case "artifact":
                const newArtifact: Artifact = {
                  type: data.artifactType,
                  title: data.title,
                  content: data.content,
                };
                currentArtifacts = [...currentArtifacts, newArtifact];
                setArtifacts((prev) => [...prev, newArtifact]);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, artifacts: currentArtifacts }
                      : m
                  )
                );
                if (onArtifact) {
                  onArtifact(newArtifact);
                }
                break;

              case "done":
                if (data.navigate) {
                  navigateTo = data.navigate;
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, isStreaming: false }
                      : m
                  )
                );
                // Refresh conversations list
                loadConversations();
                break;

              case "error":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: currentContent || `Error: ${data.error}`,
                          isStreaming: false,
                        }
                      : m
                  )
                );
                break;
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }

      // Handle navigation after streaming completes
      if (navigateTo && onNavigate) {
        setTimeout(() => {
          onNavigate(navigateTo!);
        }, 500);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: "Sorry, I encountered an error. Please try again.",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, mode, onNavigate]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setArtifacts([]);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/planner/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        startNewConversation();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }, [conversationId, startNewConversation]);

  return {
    messages,
    input,
    setInput,
    loading,
    conversationId,
    conversations,
    artifacts,
    messagesEndRef,
    inputRef,
    sendMessage,
    clearChat,
    focusInput,
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteConversation,
  };
}

// Suggestions for empty chat state
export const chatSuggestions = [
  { icon: "ListTodo", text: "Create a task called 'Review proposal' due tomorrow", category: "Create" },
  { icon: "CheckCircle2", text: "Mark 'Review documents' as complete", category: "Update" },
  { icon: "Calendar", text: "Reschedule 'Team meeting' to next Monday", category: "Schedule" },
  { icon: "BarChart3", text: "Show my productivity analytics", category: "Analyze" },
  { icon: "Target", text: "Set 'Project deadline' to urgent priority", category: "Prioritize" },
  { icon: "Clock", text: "What are my overdue tasks?", category: "Query" },
];
