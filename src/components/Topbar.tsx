"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CreateItemForm } from "./CreateItemForm";
import { NotificationCenter } from "./NotificationCenter";
import type { Item } from "../lib/items";
import { 
  Search, 
  Plus, 
  X, 
  Menu, 
  Sparkles, 
  Send, 
  ChevronRight,
  Keyboard,
  Wand2,
  Loader2,
  CheckCircle2,
  Calendar,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./ui/Button";

const pageMeta: Record<string, { title: string; parent?: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/inbox": { title: "Inbox" },
  "/tasks": { title: "Tasks" },
  "/today": { title: "Today" },
  "/habits": { title: "Habits" },
  "/schedule": { title: "Schedule" },
  "/meetings": { title: "Meetings" },
  "/school": { title: "School" },
  "/courses": { title: "Courses" },
  "/projects": { title: "Projects" },
  "/progress": { title: "Progress" },
  "/notes": { title: "Notes" },
  "/review": { title: "Weekly Review" },
  "/integrations": { title: "Integrations" },
};

// Quick capture parsing (local fallback)
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

  title = title.replace(/\s+/g, " ").trim();

  return { title, type, priority, tags, dueAt };
}

// AI-parsed item type
type AIParsedItem = {
  title: string;
  type: "task" | "meeting" | "school";
  priority: "low" | "medium" | "high" | "urgent";
  dueAt?: string;
  estimatedMinutes?: number;
  subtasks?: string[];
  details?: string;
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ items: AIParsedItem[]; rationale?: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const meta = pageMeta[pathname] || { title: "Organizer" };

  // Detect if input looks like a capture
  const looksLikeCapture = useCallback((input: string) => {
    const capturePatterns = [
      /^(add|create|make|schedule|buy|call|email|send|finish|complete|review|prepare|do|write|read|study|meet|remind)/i,
      /#\w+/,
      /!(urgent|high|medium|low)/i,
      /@(task|meeting|school)/i,
    ];
    return capturePatterns.some((p) => p.test(input.trim()));
  }, []);

  // AI-powered parsing
  const handleAiParse = async () => {
    if (!query.trim()) return;
    
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const res = await fetch("/api/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "AI parsing failed");
      }

      if (data.items && data.items.length > 0) {
        setAiResult({ items: data.items, rationale: data.rationale });
        // Auto-submit if only one item was created
        if (data.items.length === 1) {
          setQuery("");
          setCaptureMode(false);
          setShowSearch(false);
          setAiMode(false);
          setAiResult(null);
          router.refresh();
        }
      } else {
        setAiError("AI couldn't parse your input. Try being more specific.");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI parsing failed");
    } finally {
      setAiLoading(false);
    }
  };

  // Handle quick capture submission (basic)
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
        setShowSearch(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create item:", error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && captureMode) {
      e.preventDefault();
      if (aiMode) {
        handleAiParse();
      } else {
        handleQuickCapture();
      }
    }
    if (e.key === "Escape") {
      setCaptureMode(false);
      setAiMode(false);
      setAiResult(null);
      setQuery("");
      setShowSearch(false);
    }
    // Tab to toggle AI mode
    if (e.key === "Tab" && captureMode) {
      e.preventDefault();
      setAiMode(!aiMode);
    }
  };

  function navigateToItem(item: Item) {
    setQuery("");
    setShowSearch(false);
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

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  // Reset AI state when closing
  useEffect(() => {
    if (!showSearch) {
      setAiMode(false);
      setAiResult(null);
      setAiError(null);
    }
  }, [showSearch]);

  const parsed = captureMode && query.trim() ? parseQuickCapture(query) : null;

  return (
    <header className="flex flex-col border-b border-border glass-subtle sticky top-0 z-40">
      {/* Main Bar */}
      <div className="flex items-center justify-between h-12 px-4">
        {/* Left: Page Title / Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile menu button */}
          <button className="md:hidden flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors">
            <Menu size={18} />
          </button>
          
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm">
            {meta.parent && (
              <>
                <span className="text-muted-foreground">{meta.parent}</span>
                <ChevronRight size={14} className="text-muted-foreground/50" />
              </>
            )}
            <h1 className="font-semibold text-foreground truncate">{meta.title}</h1>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Search Toggle (Desktop) */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={clsx(
              "hidden sm:flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              showSearch 
                ? "bg-accent text-foreground" 
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title="Search (⌘K)"
          >
            {showSearch ? <X size={16} /> : <Search size={16} />}
          </button>

          {/* Keyboard Shortcuts */}
          <button
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Add Button */}
          <Button
            size="sm"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="gap-1.5"
          >
            {showQuickAdd ? <X size={14} /> : <Plus size={14} />}
            <span className="hidden sm:inline">{showQuickAdd ? "Close" : "New"}</span>
          </Button>
        </div>
      </div>

      {/* Inline Search Bar */}
      {showSearch && (
        <div className="px-3 sm:px-4 pb-3 animate-in slide-in-from-top duration-150">
          <div className="relative w-full sm:max-w-xl sm:mx-auto">
            {/* Mode indicator */}
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {aiMode ? (
                <Wand2 size={14} className="text-[hsl(280_60%_55%)]" />
              ) : captureMode ? (
                <Sparkles size={14} className="text-primary" />
              ) : (
                <Search size={14} />
              )}
            </div>
            
            <input
              ref={inputRef}
              className={clsx(
                "h-10 w-full rounded-lg text-sm",
                "bg-card text-foreground",
                "border pl-10 pr-24",
                "placeholder:text-muted-foreground",
                "focus:outline-none transition-all duration-200",
                aiMode
                  ? "border-[hsl(280_60%_55%/0.5)] ring-2 ring-[hsl(280_60%_55%/0.2)]"
                  : captureMode
                    ? "border-primary/50 ring-2 ring-primary/20"
                    : "border-border focus:border-ring focus:ring-2 focus:ring-ring/20"
              )}
              placeholder={
                aiMode 
                  ? "Describe tasks naturally... \"Meeting with John tomorrow at 2pm\"" 
                  : captureMode 
                    ? "Create task #work !high tomorrow" 
                    : "Search or type to create..."
              }
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAiResult(null);
                setAiError(null);
                if (looksLikeCapture(e.target.value) && !captureMode) {
                  setCaptureMode(true);
                }
              }}
              onKeyDown={handleKeyDown}
            />

            {/* Right side buttons */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* AI Toggle */}
              {captureMode && (
                <button
                  onClick={() => setAiMode(!aiMode)}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                    aiMode 
                      ? "bg-[hsl(280_60%_55%/0.15)] text-[hsl(280_60%_55%)] border border-[hsl(280_60%_55%/0.3)]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  title="Toggle AI mode (Tab)"
                >
                  <Wand2 size={10} />
                  AI
                </button>
              )}
              
              {/* Submit Button */}
              {captureMode && query.trim() && (
                <button
                  onClick={aiMode ? handleAiParse : handleQuickCapture}
                  disabled={isCapturing || aiLoading}
                  className={clsx(
                    "flex items-center justify-center w-7 h-7 rounded-md transition-all",
                    aiMode 
                      ? "bg-gradient-to-r from-[hsl(280_60%_55%)] to-primary text-white"
                      : "bg-primary text-white hover:bg-primary/90",
                    "disabled:opacity-50"
                  )}
                >
                  {isCapturing || aiLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Send size={12} />
                  )}
                </button>
              )}
            </div>

            {/* Search Results */}
            {query.trim().length >= 2 && !captureMode && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border glass-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top duration-150">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    <Loader2 size={16} className="animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No results found</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {results.map((item) => (
                      <button
                        key={item.id}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
                        onClick={() => navigateToItem(item)}
                      >
                        <div className="min-w-0 flex-1">
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

            {/* AI Result Preview */}
            {aiMode && aiResult && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-[hsl(280_60%_55%/0.3)] glass-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top duration-150">
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={14} className="text-[hsl(142_65%_48%)]" />
                    <span className="text-[hsl(142_65%_48%)] font-medium">
                      Created {aiResult.items.length} item{aiResult.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  
                  {aiResult.items.map((item, i) => (
                    <div key={i} className="p-2 rounded-lg bg-accent/30 border border-border/50">
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                          {item.type}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {item.priority}
                        </span>
                        {item.dueAt && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(142_65%_48%/0.15)] text-[hsl(142_65%_48%)] font-medium flex items-center gap-1">
                            <Calendar size={8} />
                            {new Date(item.dueAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {aiResult.rationale && (
                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
                      {aiResult.rationale}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Error */}
            {aiMode && aiError && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-destructive/30 bg-destructive/10 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top duration-150">
                <div className="p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-destructive font-medium">AI parsing failed</p>
                    <p className="text-xs text-destructive/80 mt-1">{aiError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Capture Preview (non-AI) */}
            {captureMode && !aiMode && parsed && query.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-primary/20 glass-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top duration-150">
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles size={12} className="text-primary" />
                    Creating {parsed.type}
                  </div>
                  <div className="text-sm font-medium text-foreground">{parsed.title || "(no title)"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={clsx(
                      "text-[10px] px-2 py-0.5 rounded-md font-medium border",
                      parsed.type === "task" && "bg-primary/15 text-primary border-primary/20",
                      parsed.type === "meeting" && "bg-[hsl(200_80%_55%/0.15)] text-[hsl(200_80%_55%)] border-[hsl(200_80%_55%/0.2)]",
                      parsed.type === "school" && "bg-[hsl(45_95%_55%/0.15)] text-[hsl(45_95%_55%)] border-[hsl(45_95%_55%/0.2)]"
                    )}>
                      {parsed.type}
                    </span>
                    <span className={clsx(
                      "text-[10px] px-2 py-0.5 rounded-md font-medium border",
                      parsed.priority === "urgent" && "bg-destructive/15 text-destructive border-destructive/20",
                      parsed.priority === "high" && "bg-[hsl(25_95%_55%/0.15)] text-[hsl(25_95%_55%)] border-[hsl(25_95%_55%/0.2)]",
                      parsed.priority === "medium" && "bg-primary/15 text-primary border-primary/20",
                      parsed.priority === "low" && "bg-muted text-muted-foreground border-border"
                    )}>
                      {parsed.priority}
                    </span>
                    {parsed.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-primary/15 text-primary font-medium flex items-center gap-1 border border-primary/20">
                        <Tag size={8} />
                        {tag}
                      </span>
                    ))}
                    {parsed.dueAt && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[hsl(142_65%_48%/0.15)] text-[hsl(142_65%_48%)] font-medium flex items-center gap-1 border border-[hsl(142_65%_48%/0.2)]">
                        <Calendar size={8} />
                        {new Date(parsed.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border">
                    <kbd className="kbd">Enter</kbd> create
                    <span className="text-muted-foreground/50">·</span>
                    <kbd className="kbd">Tab</kbd> toggle AI
                    <span className="text-muted-foreground/50">·</span>
                    <kbd className="kbd">Esc</kbd> cancel
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Panel */}
      {showQuickAdd && (
        <div className="border-t border-border p-3 sm:p-4 glass-card animate-in slide-in-from-top duration-150">
          <div className="w-full sm:max-w-xl sm:mx-auto">
            <CreateItemForm compact onCreated={() => setShowQuickAdd(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
