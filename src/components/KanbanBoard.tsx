"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Item, ItemStatus, ItemPriority } from "../lib/items";
import { clsx } from "clsx";
import { AlertCircle, Calendar, Clock, Trash2, Edit2, Plus, MoreHorizontal, GripVertical, CheckSquare, GraduationCap, X } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";
import { ProgressCircle } from "./ui/ProgressCircle";

type KanbanBoardProps = {
  items: Item[];
};

const columns: Array<{ key: ItemStatus; label: string; color: string }> = [
  { key: "not_started", label: "Backlog", color: "bg-zinc-500" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { key: "blocked", label: "Blocked", color: "bg-orange-500" },
  { key: "completed", label: "Done", color: "bg-emerald-500" },
];

const typeConfig = {
  task: { icon: CheckSquare, color: "text-chart-1" },
  meeting: { icon: Calendar, color: "text-chart-4" },
  school: { icon: GraduationCap, color: "text-chart-2" },
};

export function KanbanBoard({ items }: KanbanBoardProps) {
  const router = useRouter();
  const [boardItems, setBoardItems] = useState<Item[]>(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ItemStatus | null>(null);

  useEffect(() => {
    setBoardItems(items);
  }, [items]);

  const grouped = useMemo(() => {
    return columns.reduce<Record<ItemStatus, Item[]>>((acc, column) => {
      acc[column.key] = boardItems.filter((item) => item.status === column.key);
      return acc;
    }, {} as Record<ItemStatus, Item[]>);
  }, [boardItems]);

  async function patchItem(id: string, patch: Partial<Item>) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Update failed");
    return body.item as Item;
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const body = await res.json();
      throw new Error(body.error ?? "Delete failed");
    }
  }

  async function handleStatusChange(id: string, status: ItemStatus) {
    try {
      setError(null);
      setBoardItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
      await patchItem(id, { status });
      router.refresh();
    } catch {
      setError("Failed to move item");
    }
  }

  async function handleDelete(id: string) {
    try {
      setError(null);
      setDeletingId(id);
      await deleteItem(id);
      setBoardItems((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } catch {
      setError("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSave(id: string) {
    if (!draftTitle.trim()) return;
    try {
      setError(null);
      const updated = await patchItem(id, { title: draftTitle.trim() });
      setBoardItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Save failed");
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
          <button onClick={() => setError(null)} className="hover:text-foreground"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
        {columns.map((column) => {
          const columnItems = grouped[column.key];
          const completedInColumn = columnItems.filter(i => i.status === "completed").length;
          const progress = columnItems.length > 0 ? Math.round((completedInColumn / columnItems.length) * 100) : 0;

          return (
            <div
              key={column.key}
              className={clsx(
                "flex flex-col rounded-xl border transition-all duration-300 group/col",
                dragOverColumn === column.key
                  ? "border-primary/50 bg-primary/10 shadow-[0_0_30px_-5px_var(--primary)]"
                  : "border-white/[0.05] glass-heavy shadow-lg"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(column.key);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) handleStatusChange(id, column.key);
              }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className={clsx("w-2 h-2 rounded-full ring-2 ring-white/10", column.color)} />
                  <span className="text-sm font-semibold tracking-tight text-foreground">{column.label}</span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.05]">
                    {columnItems.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                    <Plus size={14} />
                  </button>
                  <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {columnItems.length === 0 ? (
                  <div className="h-20 border border-dashed border-border rounded-lg flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Drop items here</span>
                  </div>
                ) : (
                  columnItems.map((item) => {
                    const TypeIcon = typeConfig[item.type]?.icon || CheckSquare;
                    const typeColor = typeConfig[item.type]?.color || "text-muted-foreground";

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(item.id);
                          e.dataTransfer.setData("text/plain", item.id);
                        }}
                        onDragEnd={() => setDraggedId(null)}
                        className={clsx(
                          "group relative rounded-xl border p-3.5 cursor-grab active:cursor-grabbing transition-all duration-300",
                          // Default state
                          "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-lg hover:-translate-y-0.5",
                          // Conditional states
                          deletingId === item.id && "opacity-50 pointer-events-none scale-95",
                          draggedId === item.id && "opacity-20 border-dashed border-primary/50 scale-95 rotate-3"
                        )}
                      >
                        {/* Drag handle */}
                        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30">
                          <GripVertical size={12} />
                        </div>

                        {editingId === item.id ? (
                          <div className="space-y-2">
                            <input
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              autoFocus
                              className="w-full bg-muted border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave(item.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleSave(item.id)} className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">Save</button>
                              <button onClick={() => setEditingId(null)} className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {/* Header: Icon + Title */}
                            <div className="flex items-start gap-2">
                              <TypeIcon size={14} className={clsx("mt-0.5 shrink-0", typeColor)} />
                              <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
                            </div>

                            {/* Footer: Priority + Due + Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                              <div className="flex items-center gap-2">
                                <StatusBadge priority={item.priority as any} />
                                {item.dueAt && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock size={10} />
                                    <span>{new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setEditingId(item.id); setDraftTitle(item.title); }}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add task button */}
              <div className="p-2 border-t border-border/60">
                <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Plus size={14} />
                  <span>Add item</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
