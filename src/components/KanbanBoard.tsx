"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Item, ItemStatus } from "../lib/items";
import { clsx } from "clsx";
import { 
  Clock, 
  Trash2, 
  Edit2, 
  Plus, 
  MoreHorizontal, 
  GripVertical, 
  CheckSquare, 
  Calendar,
  GraduationCap, 
  X,
  AlertCircle,
  User,
  Tag,
  MessageSquare,
} from "lucide-react";
import { StatusDot, PriorityIcon } from "./ui/StatusBadge";

type KanbanBoardProps = {
  items: Item[];
  onItemClick?: (item: Item) => void;
};

const columns: Array<{ key: ItemStatus; label: string; color: string }> = [
  { key: "not_started", label: "Todo", color: "hsl(228 5% 55%)" },
  { key: "in_progress", label: "In Progress", color: "hsl(45 95% 55%)" },
  { key: "blocked", label: "Blocked", color: "hsl(25 95% 55%)" },
  { key: "completed", label: "Done", color: "hsl(142 65% 48%)" },
];

const typeIcons = {
  task: CheckSquare,
  meeting: Calendar,
  school: GraduationCap,
};

// Tag colors for visual variety
const tagColors = [
  { bg: "bg-primary/15", text: "text-primary", border: "border-primary/20" },
  { bg: "bg-[hsl(142_65%_48%/0.15)]", text: "text-[hsl(142_65%_48%)]", border: "border-[hsl(142_65%_48%/0.2)]" },
  { bg: "bg-[hsl(45_95%_55%/0.15)]", text: "text-[hsl(45_95%_55%)]", border: "border-[hsl(45_95%_55%/0.2)]" },
  { bg: "bg-[hsl(200_80%_55%/0.15)]", text: "text-[hsl(200_80%_55%)]", border: "border-[hsl(200_80%_55%/0.2)]" },
  { bg: "bg-[hsl(280_60%_55%/0.15)]", text: "text-[hsl(280_60%_55%)]", border: "border-[hsl(280_60%_55%/0.2)]" },
  { bg: "bg-[hsl(0_72%_55%/0.15)]", text: "text-[hsl(0_72%_55%)]", border: "border-[hsl(0_72%_55%/0.2)]" },
];

function getTagColor(tag: string) {
  // Use a simple hash to consistently assign colors to tags
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

// Mini progress bar component
function MiniProgress({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, hsl(142 65% 48%) 0%, hsl(170 70% 45%) 100%)'
          }}
        />
      </div>
      <span className="text-[9px] text-muted-foreground tabular-nums">{completed}/{total}</span>
    </div>
  );
}

// Avatar component for assignee
function Avatar({ name, size = "sm" }: { name?: string; size?: "xs" | "sm" }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const sizes = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-6 h-6 text-[10px]",
  };
  
  return (
    <div className={clsx(
      "rounded-full flex items-center justify-center font-medium",
      "bg-gradient-to-br from-primary/20 to-primary/40 text-primary border border-primary/20",
      sizes[size]
    )}>
      {initial}
    </div>
  );
}

export function KanbanBoard({ items, onItemClick }: KanbanBoardProps) {
  const router = useRouter();
  const [boardItems, setBoardItems] = useState<Item[]>(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ItemStatus | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<ItemStatus | null>(null);
  const [newItem, setNewItem] = useState({ title: "", dueAt: "", details: "" });
  const [isCreating, setIsCreating] = useState(false);

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

  async function handleCreateItem(status: ItemStatus) {
    if (!newItem.title.trim()) return;
    setIsCreating(true);
    try {
      setError(null);
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItem.title.trim(),
          type: "task",
          status,
          dueAt: newItem.dueAt ? new Date(newItem.dueAt).toISOString() : undefined,
          details: newItem.details.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Create failed");
      setBoardItems((prev) => [...prev, body.item as Item]);
      setNewItem({ title: "", dueAt: "", details: "" });
      setAddingToColumn(null);
      router.refresh();
    } catch {
      setError("Failed to create item");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
          <button onClick={() => setError(null)} className="hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {columns.map((column) => {
          const columnItems = grouped[column.key];
          const completedInColumn = columnItems.filter(i => i.status === "completed").length;

          return (
            <div
              key={column.key}
              className={clsx(
                "flex flex-col rounded-xl border transition-all duration-200 overflow-hidden",
                dragOverColumn === column.key
                  ? "border-primary/50 shadow-lg shadow-primary/10"
                  : "border-border glass-card"
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
              <div className="flex items-center justify-between px-3 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <span className="text-sm font-semibold text-foreground">{column.label}</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-md tabular-nums">
                    {columnItems.length}
                  </span>
                </div>
                <button className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px] sm:max-h-[500px] min-h-[100px] sm:min-h-[120px]">
                {columnItems.length === 0 ? (
                  <div className={clsx(
                    "h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-colors",
                    dragOverColumn === column.key
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50"
                  )}>
                    <span className="text-xs text-muted-foreground">Drop items here</span>
                  </div>
                ) : (
                  columnItems.map((item, index) => {
                    const TypeIcon = typeIcons[item.type] || CheckSquare;
                    const isOverdue = item.dueAt && new Date(item.dueAt) < new Date() && item.status !== "completed";
                    const tags = item.tags || [];
                    const hasDetails = item.details && item.details.trim().length > 0;
                    
                    // Simulate subtask count for demo
                    const subtaskCount = Math.floor(Math.random() * 5);
                    const subtaskCompleted = Math.floor(Math.random() * (subtaskCount + 1));

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(item.id);
                          e.dataTransfer.setData("text/plain", item.id);
                        }}
                        onDragEnd={() => setDraggedId(null)}
                        onClick={() => onItemClick?.(item)}
                        className={clsx(
                          "group relative rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all duration-200",
                          "futuristic-card hover:shadow-md",
                          deletingId === item.id && "opacity-50 pointer-events-none scale-95",
                          draggedId === item.id && "opacity-30 scale-95 rotate-2",
                          index === 0 && column.key === "in_progress" && "border-l-2 border-l-[hsl(45_95%_55%)]"
                        )}
                        style={{
                          animationDelay: `${index * 30}ms`,
                        }}
                      >
                        {/* Priority accent line */}
                        {item.priority && item.priority !== "low" && (
                          <div className={clsx(
                            "absolute top-0 left-0 right-0 h-0.5 rounded-t-lg",
                            item.priority === "urgent" && "bg-gradient-to-r from-destructive to-[hsl(330_70%_50%)]",
                            item.priority === "high" && "bg-gradient-to-r from-[hsl(25_95%_55%)] to-[hsl(45_95%_55%)]",
                            item.priority === "medium" && "bg-gradient-to-r from-primary to-[hsl(260_60%_58%)]",
                          )} />
                        )}

                        {/* Drag handle */}
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40">
                          <GripVertical size={12} />
                        </div>

                        {editingId === item.id ? (
                          <div className="space-y-2 pl-3">
                            <input
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              autoFocus
                              className="w-full bg-muted border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave(item.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleSave(item.id)} 
                                className="px-3 py-1.5 text-xs font-medium rounded-md btn-neon"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingId(null)} 
                                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5 pl-3">
                            {/* Title row with type icon */}
                            <div className="flex items-start gap-2">
                              <div className={clsx(
                                "p-1 rounded",
                                item.type === "meeting" && "bg-[hsl(200_80%_55%/0.15)]",
                                item.type === "school" && "bg-[hsl(45_95%_55%/0.15)]",
                                item.type === "task" && "bg-primary/10",
                              )}>
                                <TypeIcon size={12} className={clsx(
                                  item.type === "meeting" && "text-[hsl(200_80%_55%)]",
                                  item.type === "school" && "text-[hsl(45_95%_55%)]",
                                  item.type === "task" && "text-primary",
                                )} />
                              </div>
                              <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 flex-1">
                                {item.title}
                              </p>
                            </div>

                            {/* Tags */}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tags.slice(0, 3).map((tag) => {
                                  const colors = getTagColor(tag);
                                  return (
                                    <span
                                      key={tag}
                                      className={clsx(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border",
                                        colors.bg, colors.text, colors.border
                                      )}
                                    >
                                      <Tag size={8} />
                                      {tag}
                                    </span>
                                  );
                                })}
                                {tags.length > 3 && (
                                  <span className="text-[9px] text-muted-foreground">
                                    +{tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Subtask progress */}
                            {subtaskCount > 0 && (
                              <MiniProgress completed={subtaskCompleted} total={subtaskCount} />
                            )}

                            {/* Meta row */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                {item.priority && item.priority !== "medium" && (
                                  <PriorityIcon priority={item.priority as any} className="scale-90" />
                                )}
                                {item.dueAt && (
                                  <div className={clsx(
                                    "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                                    isOverdue 
                                      ? "text-destructive bg-destructive/10" 
                                      : "text-muted-foreground bg-muted/50"
                                  )}>
                                    <Clock size={10} />
                                    {new Date(item.dueAt).toLocaleDateString(undefined, { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                )}
                                {hasDetails && (
                                  <div className="text-muted-foreground/60">
                                    <MessageSquare size={10} />
                                  </div>
                                )}
                              </div>

                              {/* Right side: Avatar + Actions */}
                              <div className="flex items-center gap-1.5">
                                <Avatar name="User" size="xs" />
                                
                                {/* Actions */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation();
                                      setEditingId(item.id); 
                                      setDraftTitle(item.title); 
                                    }}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item.id);
                                    }}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add item section */}
              <div className="p-2 border-t border-border/50">
                {addingToColumn === column.key ? (
                  <div className="space-y-2 p-3 rounded-lg border border-border bg-card/80">
                    <input
                      type="text"
                      placeholder="Task title..."
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      autoFocus
                      className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleCreateItem(column.key);
                        }
                        if (e.key === "Escape") {
                          setAddingToColumn(null);
                          setNewItem({ title: "", dueAt: "", details: "" });
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={newItem.dueAt}
                        onChange={(e) => setNewItem({ ...newItem, dueAt: e.target.value })}
                        className="flex-1 bg-muted border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <textarea
                      placeholder="Add details (optional)..."
                      value={newItem.details}
                      onChange={(e) => setNewItem({ ...newItem, details: e.target.value })}
                      rows={2}
                      className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setAddingToColumn(null);
                          setNewItem({ title: "", dueAt: "", details: "" });
                        }}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateItem(column.key)}
                        disabled={!newItem.title.trim() || isCreating}
                        className="px-4 py-1.5 text-xs font-medium rounded-md btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreating ? "Adding..." : "Add Task"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setAddingToColumn(column.key)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent hover:border-border/50 transition-all"
                  >
                    <Plus size={14} />
                    Add item
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
