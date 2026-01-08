"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CreateItemForm } from "./CreateItemForm";
import { NotificationCenter } from "./NotificationCenter";
import type { Item } from "../lib/items";
import { Search, Plus, X, Menu, Sparkles, Send, ArrowRight } from "lucide-react";
import { clsx } from "clsx";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/tasks": "Tasks",
  "/today": "Today",
  "/habits": "Habits",
  "/schedule": "Schedule",
  "/meetings": "Meetings",
  "/school": "School",
  "/courses": "Courses",
  "/projects": "Projects",
  "/progress": "Progress",
  "/notes": "Notes",
  "/review": "Weekly Review",
  "/integrations": "Integrations",
};

// Quick capture parsing
function parseQuickCapture(input: string): {
  title: string;
  type: "task" | "meeting" | "school";
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  dueAt?: string;
} {
  let title = input;
  let type: "task" | "meeting" | "school" = "task";
  let priority: "low" | "medium" | "high" | "urgent" = "medium";
  const tags: string[] = [];
  let dueAt: string | undefined;

  // Extract tags (#tag)
  const tagMatches = input.match(/#(\w+)/g);
  if (tagMatches) {
    tagMatches.forEach((t) => {
      tags.push(t.slice(1));
      title = title.replace(t, "").trim();
    });
  }

  // Extract priority (!high, !urgent, etc.)
  const priorityMatch = input.match(/!(urgent|high|medium|low)/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as typeof priority;
    title = title.replace(priorityMatch[0], "").trim();
  }

  // Extract type (@meeting, @school)
  const typeMatch = input.match(/@(task|meeting|school)/i);
  if (typeMatch) {
    type = typeMatch[1].toLowerCase() as typeof type;
    title = title.replace(typeMatch[0], "").trim();
  }

  // Extract due date keywords
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);

  if (/\btomorrow\b/i.test(input)) {
    dueAt = tomorrow.toISOString();
    title = title.replace(/\btomorrow\b/i, "").trim();
  } else if (/\bnext week\b/i.test(input)) {
    dueAt = nextWeek.toISOString();
    title = title.replace(/\bnext week\b/i, "").trim();
  } else if (/\btoday\b/i.test(input)) {
    const today = new Date();
    today.setHours(18, 0, 0, 0);
    dueAt = today.toISOString();
    title = title.replace(/\btoday\b/i, "").trim();
  }

  // Clean up title
  title = title.replace(/\s+/g, " ").trim();

  return { title, type, priority, tags, dueAt };
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pageTitle = pageTitles[pathname] || "Organizer";

  // Detect if input looks like a capture (starts with action verb or has markers)
  const looksLikeCapture = useCallback((input: string) => {
    const capturePatterns = [
      /^(add|create|make|schedule|buy|call|email|send|finish|complete|review|prepare|do|write|read|study|meet|remind)/i,
      /#\w+/,  // Has tags
      /!(urgent|high|medium|low)/i,  // Has priority
      /@(task|meeting|school)/i,  // Has type
    ];
    return capturePatterns.some((p) => p.test(input.trim()));
  }, []);

  // Handle quick capture submission
  const handleQuickCapture = async () => {
    if (!query.trim()) return;

    setIsCapturing(true);
    const parsed = parseQuickCapture(query);

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          type: parsed.type,
          priority: parsed.priority,
          tags: parsed.tags,
          dueAt: parsed.dueAt,
          status: "not_started",
        }),
      });

      if (res.ok) {
        setQuery("");
        setCaptureMode(false);
        // Show success feedback (could add toast here)
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create item:", error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && captureMode) {
      e.preventDefault();
      handleQuickCapture();
    }
    if (e.key === "Escape") {
      setCaptureMode(false);
      setQuery("");
    }
  };

  function navigateToItem(item: Item) {
    setQuery("");
    const typeRoutes: Record<string, string> = {
      task: "/tasks",
      meeting: "/meetings",
      school: "/school",
    };
    const route = typeRoutes[item.type] || "/inbox";
    router.push(`${route}?highlight=${item.id}`);
  }

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const body = await res.json();
        if (res.ok) {
          setResults(body.items ?? []);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="flex flex-col border-b border-border">
      {/* Top Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <Menu size={18} />
          </button>
          <h1 className="text-[15px] font-semibold text-foreground">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickAdd((prev) => !prev)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {showQuickAdd ? <X size={16} /> : <Plus size={16} />}
            <span className="hidden sm:inline">{showQuickAdd ? "Close" : "Add"}</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          {/* Search / Quick Capture */}
          <div className="relative">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {captureMode ? <Sparkles size={14} className="text-primary" /> : <Search size={14} />}
            </div>
            <input
              ref={inputRef}
              className={clsx(
                "h-8 rounded-lg border bg-background pl-8 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none transition-all",
                captureMode
                  ? "w-80 border-primary/50 ring-2 ring-primary/20"
                  : "w-48 border-border hover:border-border focus:border-ring focus:ring-1 focus:ring-ring"
              )}
              placeholder={captureMode ? "Add task tomorrow #work !high" : "Search or type to add..."}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // Auto-detect capture mode
                if (looksLikeCapture(event.target.value) && !captureMode) {
                  setCaptureMode(true);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (looksLikeCapture(query)) {
                  setCaptureMode(true);
                }
              }}
            />

            {/* Capture Submit Button */}
            {captureMode && query.trim() && (
              <button
                onClick={handleQuickCapture}
                disabled={isCapturing}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-md bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isCapturing ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={12} />
                )}
              </button>
            )}

            {/* Search Results Dropdown */}
            {query.trim().length >= 2 && !captureMode && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 w-72 rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {isSearching ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">Searching...</div>
                ) : results.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">No results found</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {results.map((item) => (
                      <button
                        key={item.id}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                        onClick={() => navigateToItem(item)}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {item.type} · {item.status.replace("_", " ")}
                          </div>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 rounded bg-muted shrink-0">
                          {item.priority}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Capture Mode Preview */}
            {captureMode && query.trim() && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-80 rounded-lg border border-primary/20 bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {(() => {
                  const parsed = parseQuickCapture(query);
                  return (
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles size={12} className="text-primary" />
                        Creating {parsed.type}:
                      </div>
                      <div className="text-sm font-medium text-white">{parsed.title || "(no title)"}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          parsed.type === "task" && "bg-purple-500/20 text-purple-400",
                          parsed.type === "meeting" && "bg-blue-500/20 text-blue-400",
                          parsed.type === "school" && "bg-amber-500/20 text-amber-400"
                        )}>
                          {parsed.type}
                        </span>
                        <span className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          parsed.priority === "urgent" && "bg-rose-500/20 text-rose-400",
                          parsed.priority === "high" && "bg-amber-500/20 text-amber-400",
                          parsed.priority === "medium" && "bg-blue-500/20 text-blue-400",
                          parsed.priority === "low" && "bg-slate-500/20 text-slate-400"
                        )}>
                          {parsed.priority}
                        </span>
                        {parsed.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            #{tag}
                          </span>
                        ))}
                        {parsed.dueAt && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            {new Date(parsed.dueAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-white/[0.04]">
                        <kbd className="px-1 rounded bg-white/[0.06]">Enter</kbd> to create
                        <span className="mx-1">·</span>
                        <kbd className="px-1 rounded bg-white/[0.06]">Esc</kbd> to cancel
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        </div>

        {/* Notifications */}
        <NotificationCenter />
      </div>

      {/* Quick Add Panel */}
      {showQuickAdd && (
        <div className="border-t border-border p-4 bg-card">
          <CreateItemForm
            compact
            onCreated={() => setShowQuickAdd(false)}
          />
        </div>
      )}
    </div>
  );
}
