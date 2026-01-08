"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/Dialog";
import { VisuallyHidden } from "./ui/VisuallyHidden";
import {
  Search,
  CheckSquare,
  Calendar,
  GraduationCap,
  FileText,
  FolderKanban,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";

type SearchResult = {
  item: {
    id: string;
    type: string;
    title: string;
    status: string;
    priority: string;
    dueAt?: string;
    details?: string;
  };
  matchType: "title" | "details" | "tags" | "related";
  relevance: number;
  highlights: string[];
};

const typeIcons: Record<string, typeof CheckSquare> = {
  task: CheckSquare,
  meeting: Calendar,
  school: GraduationCap,
  note: FileText,
  project: FolderKanban,
};

const typeColors: Record<string, string> = {
  task: "text-chart-1",
  meeting: "text-chart-4",
  school: "text-chart-2",
  note: "text-purple-400",
  project: "text-amber-400",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const navigateToItem = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery("");

    // Navigate based on type
    const typeRoutes: Record<string, string> = {
      task: "/tasks",
      meeting: "/meetings",
      school: "/school",
    };

    const route = typeRoutes[result.item.type] || "/dashboard";
    router.push(`${route}?highlight=${result.item.id}`);
  }, [router]);

  // Keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            navigateToItem(results[selectedIndex]);
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, results, navigateToItem]);

  // Open search with Cmd+K (handled in CommandPalette, but this is backup)
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[560px] gap-0 top-[20%] translate-y-0" hideCloseButton aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Search</DialogTitle>
        </VisuallyHidden>
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search tasks, meetings, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent py-4 px-3 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {query && results.length === 0 && !loading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Results
              </div>
              <div className="space-y-0.5">
                {results.map((result, index) => {
                  const Icon = typeIcons[result.item.type] || CheckSquare;
                  const color = typeColors[result.item.type] || "text-muted-foreground";
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={result.item.id}
                      onClick={() => navigateToItem(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={clsx(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <Icon size={16} className={color} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{result.item.title}</span>
                          {result.matchType === "related" && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Related
                            </span>
                          )}
                        </div>
                        {result.highlights.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {result.highlights[0]}
                          </p>
                        )}
                      </div>
                      {result.item.dueAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock size={10} />
                          {new Date(result.item.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      )}
                      {isSelected && <ArrowRight size={14} className="text-muted-foreground shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1">↑</kbd>
              <kbd className="rounded border border-border bg-muted px-1">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1">↵</kbd>
              to open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1">esc</kbd>
            to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
