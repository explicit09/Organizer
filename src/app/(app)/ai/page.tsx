"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  useAIChat,
  formatToolName,
  normalizeMarkdown,
  chatSuggestions,
  type AIChatMode,
  type Conversation,
} from "@/hooks/useAIChat";
import { ChatArtifacts } from "@/components/ai/ChatArtifacts";
import { PlannerContext } from "@/components/PlannerContext";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  Calendar,
  BarChart3,
  Target,
  Clock,
  Code,
  Search,
  FileText,
  MessageSquare,
  History,
  ChevronRight,
  Plus,
  PanelRight,
  PanelLeft,
  Copy,
  Check,
  RefreshCw,
  MoreHorizontal,
  Pin,
  Wand2,
  Zap,
  Brain,
  Lightbulb,
  ArrowRight,
  X,
  ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";

// Icon map for suggestions
const iconMap: Record<string, React.ElementType> = {
  ListTodo,
  CheckCircle2,
  Calendar,
  BarChart3,
  Target,
  Clock,
};

// Mode configuration with enhanced styling
const modes: Array<{
  id: AIChatMode;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bgColor: string;
}> = [
  {
    id: "general",
    label: "General",
    icon: MessageSquare,
    description: "Create, update, and organize tasks",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10 hover:bg-violet-500/20",
  },
  {
    id: "planning",
    label: "Planning",
    icon: Target,
    description: "Break down projects and create plans",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
  },
  {
    id: "research",
    label: "Research",
    icon: Search,
    description: "Research topics and gather information",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
  },
  {
    id: "code",
    label: "Code",
    icon: Code,
    description: "Analyze repos and help with code",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
  },
];

// Quick action suggestions for empty state
const quickActions = [
  { icon: Zap, label: "Quick task", prompt: "Create a task for ", color: "text-amber-400" },
  { icon: Brain, label: "Plan project", prompt: "Help me plan ", color: "text-violet-400" },
  { icon: Lightbulb, label: "Get ideas", prompt: "Give me ideas for ", color: "text-blue-400" },
  { icon: BarChart3, label: "View analytics", prompt: "Show my productivity analytics", color: "text-emerald-400" },
];

// Group conversations by date
function groupConversationsByDate(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: { label: string; conversations: Conversation[] }[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Last 7 days", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      groups[0].conversations.push(conv);
    } else if (date.getTime() === yesterday.getTime()) {
      groups[1].conversations.push(conv);
    } else if (date > lastWeek) {
      groups[2].conversations.push(conv);
    } else {
      groups[3].conversations.push(conv);
    }
  });

  return groups.filter(g => g.conversations.length > 0);
}

export default function AIPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AIChatMode>("general");
  const [showHistory, setShowHistory] = useState(true);
  const [showContext, setShowContext] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedInput, setExpandedInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
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
    loadConversation,
    startNewConversation,
    deleteConversation,
  } = useAIChat({
    mode,
    onNavigate: (path) => router.push(path),
    onArtifact: () => setShowArtifacts(true),
  });

  // Filter and group conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.messages.some((m) => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  // Focus input on mount
  useEffect(() => {
    focusInput();
  }, [focusInput]);

  // Show artifacts panel when artifacts exist
  useEffect(() => {
    if (artifacts.length > 0) {
      setShowArtifacts(true);
    }
  }, [artifacts]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    focusInput();
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentMode = modes.find((m) => m.id === mode) || modes[0];

  return (
    <div className="page-full-bleed flex overflow-hidden bg-background">
      {/* History Sidebar */}
      <div
        className={clsx(
          "border-r border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 ease-out overflow-hidden flex flex-col",
          showHistory ? "w-80" : "w-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/50 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <History size={14} className="text-muted-foreground" />
              Conversations
            </h3>
            <button
              onClick={startNewConversation}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus size={12} />
              New
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border/50 bg-background/50 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {groupedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <MessageSquare size={20} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {searchQuery ? "No matching conversations" : "No conversations yet"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Start chatting to create one
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {groupedConversations.map((group) => (
                <div key={group.label}>
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.conversations.map((conv) => (
                      <div
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => loadConversation(conv.id)}
                        onKeyDown={(e) => e.key === "Enter" && loadConversation(conv.id)}
                        className={clsx(
                          "w-full text-left px-3 py-2.5 rounded-lg transition-all group cursor-pointer",
                          conversationId === conv.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-accent/50 border border-transparent"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {conv.messages[0]?.content.slice(0, 40) || "Empty"}...
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            modes.find(m => m.id === conv.mode)?.bgColor || "bg-muted"
                          )}>
                            {conv.mode}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {conv.messages.length} messages
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border/50 px-6 py-4 shrink-0 bg-gradient-to-r from-violet-500/[0.02] via-transparent to-blue-500/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={clsx(
                  "p-2 rounded-lg transition-all",
                  showHistory
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title="Toggle history"
              >
                <History size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-primary to-blue-500 shadow-lg shadow-primary/25">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold flex items-center gap-2">
                    AI Assistant
                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-primary rounded-full">
                      Beta
                    </span>
                  </h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className={currentMode.color}>{currentMode.label}</span>
                    <span className="text-muted-foreground/40">·</span>
                    {currentMode.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowContext(!showContext)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  showContext
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title="Toggle context panel"
              >
                <PanelLeft size={14} />
                <span className="hidden sm:inline">Context</span>
              </button>

              {artifacts.length > 0 && (
                <button
                  onClick={() => setShowArtifacts(!showArtifacts)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    showArtifacts
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  title="Toggle artifacts"
                >
                  <PanelRight size={14} />
                  <span className="hidden sm:inline">Artifacts</span>
                  <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">
                    {artifacts.length}
                  </span>
                </button>
              )}

              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  mode === m.id
                    ? `${m.bgColor} ${m.color} border border-current/20 shadow-sm`
                    : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
                )}
              >
                <m.icon size={14} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {messages.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center min-h-[500px] animate-in fade-in duration-500">
                {/* Hero */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-violet-500/20 via-primary/20 to-blue-500/20 rounded-full scale-150" />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 via-primary to-blue-500 flex items-center justify-center shadow-2xl shadow-primary/30">
                    <Wand2 size={36} className="text-white" />
                  </div>
                </div>

                <h2 className="text-2xl font-semibold mb-2 text-center">
                  What would you like to accomplish?
                </h2>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                  I can help you manage tasks, plan projects, research topics, and analyze your productivity patterns.
                </p>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 w-full max-w-2xl">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSuggestionClick(action.prompt)}
                      className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card hover:border-border hover:shadow-lg hover:shadow-primary/5 transition-all"
                    >
                      <div className={clsx(
                        "h-10 w-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                        action.color.replace("text-", "bg-").replace("400", "500/10")
                      )}>
                        <action.icon size={18} className={action.color} />
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Suggestions */}
                <div className="w-full max-w-2xl">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-3 px-1 font-medium">
                    Or try one of these
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {chatSuggestions.slice(0, 4).map((suggestion, i) => {
                      const Icon = iconMap[suggestion.icon] || ListTodo;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion.text)}
                          className="group flex items-center gap-3 text-left text-sm px-4 py-3 rounded-xl border border-border/30 bg-card/20 hover:bg-card hover:border-border transition-all"
                        >
                          <Icon size={16} className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                          <span className="flex-1 text-muted-foreground group-hover:text-foreground line-clamp-1 transition-colors">
                            {suggestion.text}
                          </span>
                          <ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Messages */
              <>
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={clsx(
                      "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 via-primary/20 to-blue-500/20 border border-primary/10">
                        <Bot size={16} className="text-primary" />
                      </div>
                    )}

                    <div className="group max-w-[80%] space-y-2">
                      <div
                        className={clsx(
                          "relative rounded-2xl px-5 py-4",
                          message.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
                            : "bg-card border border-border/50 rounded-bl-md"
                        )}
                      >
                        <div className={clsx(
                          "text-sm leading-relaxed prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                          message.role === "assistant" ? "prose-invert" : ""
                        )}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {normalizeMarkdown(message.content)}
                          </ReactMarkdown>
                        </div>

                        {/* Tool execution indicators */}
                        {message.tools && message.tools.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                            {message.tools.map((tool, i) => (
                              <div
                                key={i}
                                className={clsx(
                                  "flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg",
                                  tool.status === "running"
                                    ? "bg-blue-500/10 text-blue-400"
                                    : tool.success
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                                )}
                              >
                                {tool.status === "running" ? (
                                  <Loader2 size={12} className="shrink-0 animate-spin" />
                                ) : tool.success ? (
                                  <CheckCircle2 size={12} className="shrink-0" />
                                ) : (
                                  <AlertCircle size={12} className="shrink-0" />
                                )}
                                <span className="font-medium">{formatToolName(tool.name)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Streaming indicator */}
                        {message.isStreaming && (
                          <span className="inline-flex ml-1">
                            <span className="animate-pulse">▊</span>
                          </span>
                        )}
                      </div>

                      {/* Message Actions */}
                      {message.role === "assistant" && !message.isStreaming && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <button
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="Regenerate"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/10">
                        <User size={16} className="text-primary" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && !messages.some((m) => m.isStreaming) && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 via-primary/20 to-blue-500/20 border border-primary/10">
                      <Bot size={16} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-card border border-border/50 px-5 py-4 rounded-bl-md">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 p-4 shrink-0 bg-gradient-to-t from-card/80 to-transparent backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setExpandedInput(true)}
                onBlur={() => !input && setExpandedInput(false)}
                placeholder={`Message AI Assistant... (${currentMode.label} mode)`}
                rows={1}
                className={clsx(
                  "w-full rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm pl-5 pr-14 py-4 text-sm outline-none placeholder:text-muted-foreground/50 resize-none transition-all",
                  "focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-card",
                  expandedInput ? "min-h-[100px]" : "min-h-[56px]"
                )}
                disabled={loading}
              />

              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {input.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/50">
                    {input.length}
                  </span>
                )}
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all",
                    input.trim() && !loading
                      ? "bg-gradient-to-br from-violet-500 to-primary shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground/40">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px]">
                  ⏎
                </kbd>
                <span>send</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px]">
                  ⇧⏎
                </kbd>
                <span>new line</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘J
                </kbd>
                <span>quick access</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      {showContext && (
        <div className="w-80 border-l border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden animate-in slide-in-from-right duration-300">
          <PlannerContext mode={mode} />
        </div>
      )}

      {/* Artifacts Panel */}
      {showArtifacts && artifacts.length > 0 && (
        <div className="animate-in slide-in-from-right duration-300">
          <ChatArtifacts
            artifacts={artifacts}
            onClose={() => setShowArtifacts(false)}
          />
        </div>
      )}
    </div>
  );
}
