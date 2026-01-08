"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
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
  ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";

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

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        title="Open AI Assistant (Cmd+J)"
      >
        <Sparkles size={24} />
      </button>

      {/* Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 h-[600px] max-h-[80vh] flex flex-col" hideCloseButton aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>AI Assistant</DialogTitle>
          </VisuallyHidden>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80">
                <Sparkles size={16} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI Assistant</h3>
                <p className="text-[10px] text-muted-foreground">I can help organize your work</p>
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
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                  <Bot size={32} className="text-primary" />
                </div>
                <h4 className="font-medium mb-2">How can I help?</h4>
                <p className="text-sm text-muted-foreground max-w-xs">
                  I can create tasks, schedule meetings, organize your work, and help you stay productive.
                </p>
                <div className="mt-6 space-y-2 w-full max-w-xs">
                  {[
                    "Create a task for tomorrow",
                    "Show my summary for today",
                    "What's on my schedule?",
                    "Mark all overdue as high priority",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                    <Bot size={16} className="text-primary" />
                  </div>
                )}
                <div
                  className={clsx(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Action badges */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                      {message.actions
                        .filter((a) => a.type !== "respond")
                        .map((action, i) => (
                          <div
                            key={i}
                            className={clsx(
                              "flex items-center gap-1.5 text-xs",
                              action.success ? "text-emerald-600" : "text-rose-600"
                            )}
                          >
                            {action.success ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <AlertCircle size={12} />
                            )}
                            <span>{action.message}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <User size={16} className="text-primary" />
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
          <div className="border-t border-border p-4 shrink-0">
            <div className="flex items-center gap-2">
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
                placeholder="Ask me anything..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Press <kbd className="rounded border border-border bg-muted px-1">Cmd</kbd> + <kbd className="rounded border border-border bg-muted px-1">J</kbd> to open
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
