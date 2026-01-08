"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Plus, CheckCircle2, Circle, GripVertical, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { ProgressCircle } from "./ui/ProgressCircle";

type Subtask = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  priority: string;
};

interface SubtaskListProps {
  parentId: string;
  subtasks: Subtask[];
  onAdd: (title: string) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

export function SubtaskList({
  parentId,
  subtasks,
  onAdd,
  onToggle,
  onDelete,
  className,
}: SubtaskListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setLoading("add");
    try {
      await onAdd(newTitle.trim());
      setNewTitle("");
      setIsAdding(false);
    } finally {
      setLoading(null);
    }
  }

  async function handleToggle(subtask: Subtask) {
    setLoading(subtask.id);
    try {
      await onToggle(subtask.id, subtask.status !== "completed");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setLoading(id);
    try {
      await onDelete(id);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={clsx("rounded-lg border border-border bg-card/50", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Subtasks</span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{subtasks.length}
          </span>
        </div>
        <ProgressCircle progress={progress} size={18} strokeWidth={2} />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Subtask List */}
          {subtasks.length > 0 && (
            <div className="divide-y divide-border/60">
              {subtasks.map((subtask) => {
                const isCompleted = subtask.status === "completed";
                const isLoading = loading === subtask.id;

                return (
                  <div
                    key={subtask.id}
                    className={clsx(
                      "group flex items-center gap-2 px-3 py-2 transition-colors",
                      isLoading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <GripVertical size={12} className="text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab" />
                    <button
                      onClick={() => handleToggle(subtask)}
                      className="shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Circle size={16} className="text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                    <span
                      className={clsx(
                        "flex-1 text-sm",
                        isCompleted && "text-muted-foreground line-through"
                      )}
                    >
                      {subtask.title}
                    </span>
                    <button
                      onClick={() => handleDelete(subtask.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Subtask */}
          {isAdding ? (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
              <Circle size={16} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Subtask title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewTitle("");
                  }
                }}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim() || loading === "add"}
                className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle("");
                }}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border-t border-border"
            >
              <Plus size={14} />
              Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}
