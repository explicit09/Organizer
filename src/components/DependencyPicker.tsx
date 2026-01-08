"use client";

import { useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import {
  Link2,
  Unlink,
  Plus,
  Loader2,
  Search,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/Dialog";

type Item = {
  id: string;
  title: string;
  status: string;
  type: string;
};

type Dependency = {
  id: string;
  blockerId: string;
  blockedId: string;
  blocker: Item;
  blocked: Item;
};

interface DependencyPickerProps {
  itemId: string;
  itemTitle: string;
  className?: string;
}

export function DependencyPicker({ itemId, itemTitle, className }: DependencyPickerProps) {
  const [blockers, setBlockers] = useState<Item[]>([]);
  const [blocking, setBlocking] = useState<Item[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"blocker" | "blocking">("blocker");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const fetchDependencies = useCallback(async () => {
    try {
      const res = await fetch(`/api/dependencies?itemId=${itemId}`);
      if (res.ok) {
        const data = await res.json();
        setBlockers(data.blockers || []);
        setBlocking(data.blocking || []);
        setIsBlocked(data.isBlocked || false);
      }
    } catch (error) {
      console.error("Failed to fetch dependencies:", error);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  async function searchItems(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        // Filter out current item and already linked items
        const existingIds = new Set([
          itemId,
          ...blockers.map((b) => b.id),
          ...blocking.map((b) => b.id),
        ]);
        setSearchResults(
          (data.results || []).filter((r: Item) => !existingIds.has(r.id))
        );
      }
    } catch (error) {
      console.error("Failed to search items:", error);
    } finally {
      setSearching(false);
    }
  }

  async function addDependency(targetId: string) {
    setAdding(targetId);
    try {
      const payload =
        dialogType === "blocker"
          ? { blockerId: targetId, blockedId: itemId }
          : { blockerId: itemId, blockedId: targetId };

      const res = await fetch("/api/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchDependencies();
        setSearchQuery("");
        setSearchResults([]);
        setDialogOpen(false);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add dependency");
      }
    } catch (error) {
      console.error("Failed to add dependency:", error);
    } finally {
      setAdding(null);
    }
  }

  async function removeDependency(blockerId: string, blockedId: string) {
    try {
      // Find the dependency ID
      const res = await fetch("/api/dependencies");
      if (res.ok) {
        const data = await res.json();
        const dep = (data.dependencies || []).find(
          (d: Dependency) => d.blockerId === blockerId && d.blockedId === blockedId
        );
        if (dep) {
          await fetch(`/api/dependencies/${dep.id}`, { method: "DELETE" });
          await fetchDependencies();
        }
      }
    } catch (error) {
      console.error("Failed to remove dependency:", error);
    }
  }

  function openDialog(type: "blocker" | "blocking") {
    setDialogType(type);
    setSearchQuery("");
    setSearchResults([]);
    setDialogOpen(true);
  }

  function getStatusIcon(status: string) {
    if (status === "completed") {
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    }
    return <Circle size={14} className="text-muted-foreground" />;
  }

  if (loading) {
    return (
      <div className={clsx("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Link2 size={14} />
          Dependencies
          {isBlocked && (
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <AlertCircle size={12} />
              Blocked
            </span>
          )}
        </h3>
      </div>

      <div className="space-y-4">
        {/* Blockers - items that block this item */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Blocked by ({blockers.length})
            </span>
            <button
              onClick={() => openDialog("blocker")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
          {blockers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blockers</p>
          ) : (
            <div className="space-y-1">
              {blockers.map((blocker) => (
                <div
                  key={blocker.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(blocker.status)}
                    <span className="truncate">{blocker.title}</span>
                  </div>
                  <button
                    onClick={() => removeDependency(blocker.id, itemId)}
                    className="text-muted-foreground hover:text-rose-500 shrink-0"
                    title="Remove dependency"
                  >
                    <Unlink size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blocking - items that this item blocks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Blocking ({blocking.length})
            </span>
            <button
              onClick={() => openDialog("blocking")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
          {blocking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not blocking anything</p>
          ) : (
            <div className="space-y-1">
              {blocking.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(blocked.status)}
                    <span className="truncate">{blocked.title}</span>
                  </div>
                  <button
                    onClick={() => removeDependency(itemId, blocked.id)}
                    className="text-muted-foreground hover:text-rose-500 shrink-0"
                    title="Remove dependency"
                  >
                    <Unlink size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "blocker" ? "Add Blocker" : "Add Blocked Item"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "blocker"
                ? `Search for an item that blocks "${itemTitle}"`
                : `Search for an item that "${itemTitle}" blocks`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchItems(e.target.value);
                }}
                placeholder="Search items..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => addDependency(result.id)}
                    disabled={adding === result.id}
                    className="w-full flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(result.status)}
                      <span className="truncate">{result.title}</span>
                    </div>
                    {adding === result.id ? (
                      <Loader2 size={14} className="animate-spin shrink-0" />
                    ) : (
                      <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No items found
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Start typing to search for items
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
