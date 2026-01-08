"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Check,
  Clock,
  Archive,
  Trash2,
  ChevronUp,
  ChevronDown,
  Timer,
  Calendar,
  FolderOpen,
  Sparkles,
  Keyboard,
  X,
  Play,
} from "lucide-react";
import { clsx } from "clsx";

type Item = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  dueAt?: string;
  createdAt: string;
};

type Props = {
  initialItems: Item[];
};

export function InboxProcessor({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processMode, setProcessMode] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const inboxItems = items.filter((i) => i.status === "not_started");
  const currentItem = inboxItems[selectedIndex];

  // Keyboard navigation
  useEffect(() => {
    if (!processMode) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, inboxItems.length - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "c":
          e.preventDefault();
          if (currentItem) markComplete(currentItem.id);
          break;
        case "d":
          e.preventDefault();
          if (currentItem) defer(currentItem.id);
          break;
        case "a":
          e.preventDefault();
          if (currentItem) archive(currentItem.id);
          break;
        case "f":
          e.preventDefault();
          if (currentItem) startFocus(currentItem.id);
          break;
        case "s":
          e.preventDefault();
          if (currentItem) schedule(currentItem.id);
          break;
        case "Escape":
          setProcessMode(false);
          break;
        case "?":
          e.preventDefault();
          setShowKeyboardHelp((prev) => !prev);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [processMode, selectedIndex, inboxItems, currentItem]);

  // Scroll selected item into view
  useEffect(() => {
    if (processMode && listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex, processMode]);

  const refreshItems = useCallback(async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (error) {
      console.error("Failed to refresh items:", error);
    }
  }, []);

  const markComplete = async (itemId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "completed" } : i))
    );

    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    } catch (error) {
      console.error("Failed to complete item:", error);
      refreshItems();
    }

    // Move to next item
    if (selectedIndex >= inboxItems.length - 1) {
      setSelectedIndex(Math.max(0, inboxItems.length - 2));
    }
  };

  const defer = async (itemId: string) => {
    // Set due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: tomorrow.toISOString() }),
      });
      refreshItems();
    } catch (error) {
      console.error("Failed to defer item:", error);
    }
  };

  const archive = async (itemId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "completed" } : i))
    );

    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    } catch (error) {
      console.error("Failed to archive item:", error);
      refreshItems();
    }

    if (selectedIndex >= inboxItems.length - 1) {
      setSelectedIndex(Math.max(0, inboxItems.length - 2));
    }
  };

  const startFocus = (itemId: string) => {
    window.dispatchEvent(new CustomEvent("open-focus-mode", { detail: { itemId } }));
  };

  const schedule = (itemId: string) => {
    router.push(`/schedule?item=${itemId}`);
  };

  const deleteItem = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to delete item:", error);
      refreshItems();
    }

    if (selectedIndex >= inboxItems.length - 1) {
      setSelectedIndex(Math.max(0, inboxItems.length - 2));
    }
  };

  if (inboxItems.length === 0 && !processMode) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mx-auto mb-4">
          <Check size={24} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Inbox Zero!</h3>
        <p className="text-sm text-muted-foreground">
          You've processed all your items. Great job!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Inbox size={16} className="text-primary" />
            <span className="text-sm font-medium text-primary">
              {inboxItems.length} items
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {processMode && (
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs text-muted-foreground hover:bg-white/[0.08] transition-all"
            >
              <Keyboard size={14} />
              Shortcuts
            </button>
          )}
          <button
            onClick={() => setProcessMode(!processMode)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
              processMode
                ? "bg-primary text-white"
                : "bg-white/[0.06] text-white hover:bg-white/[0.08]"
            )}
          >
            {processMode ? (
              <>
                <X size={16} />
                Exit Process Mode
              </>
            ) : (
              <>
                <Play size={16} />
                Process Inbox
              </>
            )}
          </button>
        </div>
      </div>

      {/* Process Mode Instructions */}
      {processMode && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-purple-200/80">
          <span className="font-medium text-purple-400">Keyboard mode active:</span>{" "}
          <kbd className="px-1 rounded bg-purple-500/20">j/k</kbd> navigate,{" "}
          <kbd className="px-1 rounded bg-purple-500/20">c</kbd> complete,{" "}
          <kbd className="px-1 rounded bg-purple-500/20">d</kbd> defer,{" "}
          <kbd className="px-1 rounded bg-purple-500/20">a</kbd> archive,{" "}
          <kbd className="px-1 rounded bg-purple-500/20">f</kbd> focus,{" "}
          <kbd className="px-1 rounded bg-purple-500/20">s</kbd> schedule
        </div>
      )}

      {/* Items List */}
      <div ref={listRef} className="space-y-2">
        {inboxItems.map((item, index) => (
          <div
            key={item.id}
            data-index={index}
            className={clsx(
              "rounded-xl border p-4 transition-all",
              processMode && index === selectedIndex
                ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
                : "border-white/[0.06] bg-[#0a0a0b] hover:border-white/[0.12]"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{item.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded",
                    item.type === "task" && "bg-purple-500/20 text-purple-400",
                    item.type === "meeting" && "bg-blue-500/20 text-blue-400",
                    item.type === "school" && "bg-amber-500/20 text-amber-400"
                  )}>
                    {item.type}
                  </span>
                  <span>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => markComplete(item.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  title="Complete (c)"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => defer(item.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                  title="Defer to tomorrow (d)"
                >
                  <Clock size={16} />
                </button>
                <button
                  onClick={() => startFocus(item.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                  title="Start focus (f)"
                >
                  <Timer size={16} />
                </button>
                <button
                  onClick={() => schedule(item.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  title="Schedule (s)"
                >
                  <Calendar size={16} />
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            className="bg-[#0a0a0b] border border-white/[0.06] rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Keyboard size={20} />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { key: "j / ↓", desc: "Next item" },
                { key: "k / ↑", desc: "Previous item" },
                { key: "c", desc: "Mark complete" },
                { key: "d", desc: "Defer to tomorrow" },
                { key: "a", desc: "Archive (complete)" },
                { key: "f", desc: "Start focus session" },
                { key: "s", desc: "Schedule item" },
                { key: "Esc", desc: "Exit process mode" },
              ].map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{shortcut.desc}</span>
                  <kbd className="px-2 py-1 rounded bg-white/[0.06] text-white text-xs font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="w-full mt-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
