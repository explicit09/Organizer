"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/Dialog";
import { VisuallyHidden } from "./ui/VisuallyHidden";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  Calendar,
  BarChart3,
  Target,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";

// Normalize markdown content to ensure proper rendering
function normalizeMarkdown(content: string): string {
  return content
    // Normalize various asterisk characters to standard ASCII asterisk
    .replace(/[\u2217\uFE61\uFF0A]/g, '*')
    // Normalize various dash/hyphen characters
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    // Normalize backtick characters
    .replace(/[\u2018\u2019\u201C\u201D]/g, (match) => {
      return match === '\u2018' || match === '\u2019' ? "'" : '"';
    })
    // Ensure proper line breaks
    .replace(/\r\n/g, '\n');
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Array<{
    type: string;
    success: boolean;
    message: string;
  }>;
  timestamp: Date;
};

export function AIAgent() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+J to open AI
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        actions: data.actions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle navigation if needed
      if (data.navigate) {
        setTimeout(() => {
          setOpen(false);
          router.push(data.navigate);
        }, 500);
      }
    } catch (error) {
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
  }, [input, loading, messages, router]);

  function clearChat() {
    setMessages([]);
  }

  const suggestions = [
    { icon: ListTodo, text: "Create a task called 'Review proposal' due tomorrow", category: "Create" },
    { icon: CheckCircle2, text: "Mark 'Review documents' as complete", category: "Update" },
    { icon: Calendar, text: "Reschedule 'Team meeting' to next Monday", category: "Schedule" },
    { icon: BarChart3, text: "Show my productivity analytics", category: "Analyze" },
    { icon: Target, text: "Set 'Project deadline' to urgent priority", category: "Prioritize" },
    { icon: Clock, text: "What are my overdue tasks?", category: "Query" },
  ];

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    // Use a ref to trigger send after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-all hover:scale-105 group glow-pulse"
        style={{
          background: 'linear-gradient(135deg, hsl(280 60% 55%) 0%, hsl(238 65% 62%) 50%, hsl(200 80% 55%) 100%)',
          boxShadow: '0 0 30px hsl(238 65% 62% / 0.4), 0 0 60px hsl(280 60% 55% / 0.2), 0 8px 32px hsl(0 0% 0% / 0.3)',
        }}
        title="Open AI Assistant (⌘J)"
      >
        <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />
      </button>

      {/* Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 h-[600px] max-h-[80vh] flex flex-col" hideCloseButton aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>AI Assistant</DialogTitle>
          </VisuallyHidden>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0 bg-gradient-to-r from-violet-500/[0.03] via-transparent to-blue-500/[0.03]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-primary to-blue-500 shadow-lg shadow-primary/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  AI Assistant
                  <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-primary/10 text-primary rounded">Beta</span>
                </h3>
                <p className="text-[10px] text-muted-foreground">Create, update, and organize tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Clear chat"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="text-center mb-6 pt-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-primary/20 to-blue-500/20 mb-3">
                    <Bot size={24} className="text-primary" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">What can I do for you?</h4>
                  <p className="text-sm text-muted-foreground">
                    Create, update, organize, and analyze your tasks
                  </p>
                </div>

                {/* Capability cards */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { icon: ListTodo, label: "Create Tasks", color: "text-emerald-400" },
                    { icon: CheckCircle2, label: "Mark Complete", color: "text-blue-400" },
                    { icon: Calendar, label: "Reschedule", color: "text-amber-400" },
                    { icon: BarChart3, label: "Analytics", color: "text-violet-400" },
                  ].map((cap) => (
                    <div key={cap.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <cap.icon size={14} className={cap.color} />
                      <span className="text-xs text-muted-foreground">{cap.label}</span>
                    </div>
                  ))}
                </div>

                {/* Suggestions */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">Try saying...</p>
                  {suggestions.slice(0, 4).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="group w-full flex items-center gap-3 text-left text-sm px-3 py-2.5 rounded-lg border border-transparent hover:bg-accent hover:border-border transition-all"
                    >
                      <suggestion.icon size={14} className="text-muted-foreground group-hover:text-primary shrink-0" />
                      <span className="flex-1 text-foreground/80 group-hover:text-foreground line-clamp-1">{suggestion.text}</span>
                      <ArrowUpRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  "flex gap-2.5",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 via-primary/20 to-blue-500/20 mt-0.5">
                    <Bot size={14} className="text-primary" />
                  </div>
                )}
                <div
                  className={clsx(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                    message.role === "user"
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-md"
                      : "bg-white/[0.04] border border-white/[0.06] rounded-bl-md"
                  )}
                >
                  <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {normalizeMarkdown(message.content)}
                    </ReactMarkdown>
                  </div>

                  {/* Action badges */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                      {message.actions
                        .filter((a) => a.type !== "respond")
                        .map((action, i) => (
                          <div
                            key={i}
                            className={clsx(
                              "flex items-center gap-2 text-xs px-2 py-1 rounded-md",
                              action.success 
                                ? "bg-emerald-500/10 text-emerald-400" 
                                : "bg-rose-500/10 text-rose-400"
                            )}
                          >
                            {action.success ? (
                              <CheckCircle2 size={12} className="shrink-0" />
                            ) : (
                              <AlertCircle size={12} className="shrink-0" />
                            )}
                            <span className="leading-tight">{action.message}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 mt-0.5">
                    <User size={14} className="text-primary" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-3 shrink-0 glass-subtle">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Create a task, update status, ask questions..."
                  className="w-full rounded-xl border border-border/50 bg-card pl-4 pr-14 py-3.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-white disabled:opacity-30 transition-all hover:scale-105"
                  style={{
                    background: input.trim() && !loading 
                      ? 'linear-gradient(135deg, hsl(280 60% 55%) 0%, hsl(238 65% 62%) 100%)' 
                      : 'hsl(228 10% 20%)',
                    boxShadow: input.trim() && !loading 
                      ? '0 0 15px hsl(238 65% 62% / 0.3)' 
                      : 'none',
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px]">⌘</kbd>
                <kbd className="rounded border border-border/30 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px]">J</kbd>
                <span className="ml-1">open</span>
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px]">↵</kbd>
                <span className="ml-1">send</span>
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px]">Esc</kbd>
                <span className="ml-1">close</span>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
