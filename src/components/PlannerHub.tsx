"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { clsx } from "clsx";
import {
  Send,
  Loader2,
  Bot,
  User,
  Search,
  Code2,
  Target,
  Sparkles,
  MessageSquare,
  PanelRightOpen,
  PanelRightClose,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Globe,
  Lightbulb,
  ListTodo,
  Calendar,
  Clock,
  Zap,
  FileText,
  ChevronRight,
  Trash2,
  History,
} from "lucide-react";
import { PlannerModes, type PlanMode } from "./PlannerModes";
import { PlannerContext } from "./PlannerContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Array<{
    type: string;
    status: "pending" | "executing" | "completed" | "failed";
    message?: string;
  }>;
  artifacts?: Array<{
    type: "plan" | "code" | "search_results" | "repo_analysis" | "pr_draft";
    title: string;
    content: unknown;
  }>;
  timestamp: Date;
};

type Conversation = {
  id: string;
  title: string;
  mode: PlanMode;
  messages: Message[];
  createdAt: Date;
};

const modeConfig: Record<PlanMode, { icon: typeof Search; color: string; gradient: string; label: string; description: string }> = {
  research: {
    icon: Globe,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-cyan-500/20",
    label: "Research",
    description: "Find internships, companies, resources",
  },
  code: {
    icon: Code2,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-teal-500/20",
    label: "Code",
    description: "Analyze repos, suggest implementations",
  },
  planning: {
    icon: Target,
    color: "text-violet-400",
    gradient: "from-violet-500/20 to-purple-500/20",
    label: "Planning",
    description: "Create plans, schedule tasks",
  },
  general: {
    icon: Sparkles,
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-orange-500/20",
    label: "General",
    description: "General assistance and chat",
  },
};

const quickPrompts: Record<PlanMode, Array<{ icon: typeof Search; text: string }>> = {
  research: [
    { icon: Search, text: "Find software engineering internships for summer 2026" },
    { icon: Globe, text: "Research top companies hiring junior developers" },
    { icon: Lightbulb, text: "What skills should I learn for full-stack roles?" },
  ],
  code: [
    { icon: Code2, text: "Analyze my project structure and suggest improvements" },
    { icon: GitBranch, text: "Help me implement a new feature in my repo" },
    { icon: FileText, text: "Generate a PR for the changes we discussed" },
  ],
  planning: [
    { icon: Target, text: "Help me plan my week's tasks" },
    { icon: Calendar, text: "Create a study plan for my upcoming exams" },
    { icon: ListTodo, text: "Break down this project into actionable steps" },
  ],
  general: [
    { icon: Sparkles, text: "What should I focus on today?" },
    { icon: Clock, text: "Analyze my productivity patterns" },
    { icon: Zap, text: "Suggest ways to improve my workflow" },
  ],
};

export function PlannerHub() {
  const [mode, setMode] = useState<PlanMode>("general");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  // Focus input on mount and mode change
  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/planner/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations.map((c: { id: string; title: string; mode: PlanMode; messages: Message[]; createdAt: string }) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          messages: c.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })),
        })));
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const createNewConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/planner/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv: Conversation = {
          id: data.conversation.id,
          title: data.conversation.title,
          mode: data.conversation.mode,
          messages: [],
          createdAt: new Date(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [mode]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/planner/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          mode,
          conversationId: activeConversationId,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        actions: data.actions,
        artifacts: data.artifacts,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update conversation ID if new
      if (data.conversationId && !activeConversationId) {
        setActiveConversationId(data.conversationId);
        loadConversations();
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, mode, activeConversationId, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMode(conv.mode);
    setMessages(conv.messages);
    setShowHistory(false);
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const ModeIcon = modeConfig[mode].icon;

  return (
    <div className="flex h-[calc(100vh-var(--space-12))] gap-0 -m-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-4">
            {/* History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                "transition-all duration-200",
                showHistory
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <History size={16} />
              <span className="hidden sm:inline">History</span>
            </button>

            <div className="h-6 w-px bg-border" />

            {/* Mode Selector */}
            <PlannerModes mode={mode} onModeChange={setMode} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            <button
              onClick={() => setShowContext(!showContext)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                "transition-all duration-200",
                showContext
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {showContext ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              <span className="hidden sm:inline">Context</span>
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex flex-1 min-h-0">
          {/* History Panel */}
          {showHistory && (
            <div className="w-72 border-r border-border/50 flex flex-col bg-card/30">
              <div className="p-4 border-b border-border/50">
                <h3 className="text-sm font-semibold">Conversations</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No conversations yet
                  </p>
                ) : (
                  conversations.map((conv) => {
                    const ConvIcon = modeConfig[conv.mode].icon;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => selectConversation(conv)}
                        className={clsx(
                          "w-full flex items-start gap-3 p-3 rounded-lg text-left",
                          "transition-all duration-150",
                          activeConversationId === conv.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-accent border border-transparent"
                        )}
                      >
                        <ConvIcon size={16} className={clsx("shrink-0 mt-0.5", modeConfig[conv.mode].color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {conv.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                /* Empty State */
                <div className="h-full flex flex-col items-center justify-center px-6 py-12">
                  <div className={clsx(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
                    "bg-gradient-to-br",
                    modeConfig[mode].gradient
                  )}>
                    <ModeIcon size={28} className={modeConfig[mode].color} />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2">
                    {modeConfig[mode].label} Mode
                  </h2>
                  <p className="text-muted-foreground text-center mb-8 max-w-md">
                    {modeConfig[mode].description}. Start a conversation to begin planning and executing.
                  </p>

                  {/* Quick Prompts */}
                  <div className="w-full max-w-xl space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 text-center">
                      Try asking...
                    </p>
                    {quickPrompts[mode].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(prompt.text)}
                        className={clsx(
                          "group w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                          "border border-border/50 hover:border-primary/30",
                          "bg-card/50 hover:bg-card transition-all duration-200",
                          "text-left"
                        )}
                      >
                        <prompt.icon size={16} className={clsx("shrink-0", modeConfig[mode].color)} />
                        <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground">
                          {prompt.text}
                        </span>
                        <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
                <div className="p-6 space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={clsx(
                        "flex gap-4",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className={clsx(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          "bg-gradient-to-br",
                          modeConfig[mode].gradient
                        )}>
                          <Bot size={18} className={modeConfig[mode].color} />
                        </div>
                      )}

                      <div
                        className={clsx(
                          "max-w-[80%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border/50 rounded-bl-md"
                        )}
                      >
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>

                        {/* Actions */}
                        {message.actions && message.actions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                            {message.actions.map((action, i) => (
                              <div
                                key={i}
                                className={clsx(
                                  "flex items-center gap-2 text-xs px-2 py-1.5 rounded-md",
                                  action.status === "completed"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : action.status === "failed"
                                    ? "bg-rose-500/10 text-rose-400"
                                    : "bg-amber-500/10 text-amber-400"
                                )}
                              >
                                {action.status === "completed" ? (
                                  <CheckCircle2 size={12} />
                                ) : action.status === "failed" ? (
                                  <AlertCircle size={12} />
                                ) : (
                                  <Loader2 size={12} className="animate-spin" />
                                )}
                                <span>{action.message || action.type}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Artifacts */}
                        {message.artifacts && message.artifacts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                            {message.artifacts.map((artifact, i) => (
                              <button
                                key={i}
                                className={clsx(
                                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
                                  "bg-accent/50 hover:bg-accent transition-colors",
                                  "text-left"
                                )}
                              >
                                {artifact.type === "plan" && <Target size={14} className="text-violet-400" />}
                                {artifact.type === "code" && <Code2 size={14} className="text-emerald-400" />}
                                {artifact.type === "search_results" && <Globe size={14} className="text-blue-400" />}
                                {artifact.type === "repo_analysis" && <GitBranch size={14} className="text-amber-400" />}
                                {artifact.type === "pr_draft" && <FileText size={14} className="text-cyan-400" />}
                                <span className="flex-1 text-sm truncate">{artifact.title}</span>
                                <ChevronRight size={14} className="text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                          <User size={18} className="text-primary" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-4">
                      <div className={clsx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        "bg-gradient-to-br",
                        modeConfig[mode].gradient
                      )}>
                        <Bot size={18} className={modeConfig[mode].color} />
                      </div>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border/50">
                        <Loader2 size={16} className="animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50 bg-gradient-to-t from-background to-transparent">
              <div className={clsx(
                "relative flex items-end gap-3 p-3 rounded-2xl",
                "border border-border/50",
                "bg-card/80 backdrop-blur-sm",
                "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
                "transition-all duration-200"
              )}>
                {/* Mode indicator */}
                <div className={clsx(
                  "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                  "bg-gradient-to-br",
                  modeConfig[mode].gradient
                )}>
                  <ModeIcon size={16} className={modeConfig[mode].color} />
                </div>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${modeConfig[mode].label.toLowerCase()}...`}
                  className={clsx(
                    "flex-1 bg-transparent border-0 resize-none",
                    "text-sm placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-0",
                    "min-h-[24px] max-h-[120px]"
                  )}
                  rows={1}
                  disabled={loading}
                />

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className={clsx(
                    "flex items-center justify-center w-9 h-9 rounded-xl shrink-0",
                    "transition-all duration-200",
                    input.trim() && !loading
                      ? "bg-gradient-to-r from-primary to-[hsl(280_60%_55%)] text-white hover:scale-105"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>

              {/* Keyboard hints */}
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/30 border border-border/30 font-mono">↵</kbd>
                  send
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/30 border border-border/30 font-mono">Shift</kbd>
                  +
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/30 border border-border/30 font-mono">↵</kbd>
                  new line
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      {showContext && (
        <PlannerContext mode={mode} />
      )}
    </div>
  );
}
