"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CreateItemForm } from "./CreateItemForm";
import { NotificationCenter } from "./NotificationCenter";
import type { Item } from "../lib/items";
import { Search, Plus, X, Menu } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/tasks": "Tasks",
  "/schedule": "Schedule",
  "/meetings": "Meetings",
  "/school": "School",
  "/courses": "Courses",
  "/projects": "Projects",
  "/progress": "Progress",
  "/notes": "Notes",
  "/integrations": "Integrations",
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const pageTitle = pageTitles[pathname] || "Organizer";

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
          {/* Search */}
          <div className="relative">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={14} />
            </div>
            <input
              className="h-8 w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors hover:border-border focus:border-ring focus:ring-1 focus:ring-ring"
              placeholder="Search..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            {/* Search Results Dropdown */}
            {query.trim().length >= 2 && (
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
