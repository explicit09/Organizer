"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { Item } from "../lib/items";
import { clsx } from "clsx";
import { 
  X, 
  Calendar, 
  Clock, 
  Tag, 
  CheckSquare,
  GraduationCap,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Github,
} from "lucide-react";
import { Button } from "./ui/Button";
import { StatusDot, PriorityIcon } from "./ui/StatusBadge";
import { GitHubRepoLink } from "./GitHubRepoLink";

type SlidePanelProps = {
  item: Item | null;
  onClose: () => void;
};

export function SlidePanel({ item, onClose }: SlidePanelProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<Partial<Item>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setIsVisible(true);
      setEditedItem({
        title: item.title,
        details: item.details,
        priority: item.priority,
        status: item.status,
        dueAt: item.dueAt,
      });
    } else {
      setIsVisible(false);
    }
  }, [item]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  async function handleSave() {
    if (!item) return;
    setIsSaving(true);
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedItem),
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!item || !confirm("Delete this item?")) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      handleClose();
      router.refresh();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  async function toggleComplete() {
    if (!item) return;
    const newStatus = item.status === "completed" ? "not_started" : "completed";
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update:", error);
    }
  }

  if (!item) return null;

  const TypeIcon = item.type === "meeting" ? Calendar : item.type === "school" ? GraduationCap : CheckSquare;
  const isCompleted = item.status === "completed";
  const isOverdue = item.dueAt && new Date(item.dueAt) < new Date() && !isCompleted;

  const panelContent = (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div 
        className={clsx(
          "fixed right-0 top-0 bottom-0 w-full max-w-md z-50",
          "flex flex-col transition-transform duration-300 ease-out",
          "bg-gradient-to-b from-card to-background border-l border-border/50",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-[hsl(280_60%_55%/0.05)] blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-4 border-b border-border/50 glass-subtle">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              item.type === "meeting" && "bg-[hsl(200_80%_55%/0.15)] text-[hsl(200_80%_55%)]",
              item.type === "school" && "bg-[hsl(45_95%_55%/0.15)] text-[hsl(45_95%_55%)]",
              item.type === "task" && "bg-primary/15 text-primary",
            )}>
              <TypeIcon size={16} />
            </div>
            <span className="text-sm font-semibold text-foreground capitalize">
              {item.type} Details
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Title */}
          <div>
            {isEditing ? (
              <input
                type="text"
                value={editedItem.title || ""}
                onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                className="w-full text-lg font-semibold text-foreground bg-transparent border-b border-border pb-2 focus:outline-none focus:border-primary"
                autoFocus
              />
            ) : (
              <h2 className={clsx(
                "text-lg font-semibold",
                isCompleted ? "text-muted-foreground line-through" : "text-foreground"
              )}>
                {item.title}
              </h2>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleComplete}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                isCompleted 
                  ? "bg-muted text-muted-foreground hover:bg-accent border border-border"
                  : "text-white border border-[hsl(142_65%_48%/0.3)]"
              )}
              style={!isCompleted ? {
                background: 'linear-gradient(135deg, hsl(142 65% 48%) 0%, hsl(170 70% 45%) 100%)',
                boxShadow: '0 0 15px hsl(142 65% 48% / 0.3)',
              } : undefined}
            >
              <Check size={14} />
              {isCompleted ? "Mark incomplete" : "Mark complete"}
            </button>
          </div>

          {/* Properties */}
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <StatusDot status={item.status as any} />
                <span className="text-sm text-foreground capitalize">
                  {item.status === "not_started" ? "Todo" : item.status.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Priority</span>
              {isEditing ? (
                <select
                  value={editedItem.priority || "medium"}
                  onChange={(e) => setEditedItem({ ...editedItem, priority: e.target.value as "urgent" | "high" | "medium" | "low" })}
                  className="text-sm bg-accent border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={item.priority as any} />
                  <span className="text-sm text-foreground capitalize">{item.priority}</span>
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Due Date</span>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={editedItem.dueAt?.slice(0, 16) || ""}
                  onChange={(e) => setEditedItem({ ...editedItem, dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="text-sm bg-accent border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <span className={clsx(
                  "text-sm",
                  isOverdue ? "text-destructive" : "text-foreground"
                )}>
                  {item.dueAt ? (
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(item.dueAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </span>
              )}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex items-start justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {item.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={editedItem.details || ""}
                onChange={(e) => setEditedItem({ ...editedItem, details: e.target.value })}
                placeholder="Add a description..."
                rows={4}
                className="w-full text-sm bg-accent border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {item.details || <span className="text-muted-foreground italic">No description</span>}
              </p>
            )}
          </div>

          {/* GitHub Repo Link */}
          {item.type === "task" && (
            <div className="pt-2 border-t border-border/50">
              <label className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                <Github size={14} />
                GitHub Repository
              </label>
              <GitHubRepoLink itemId={item.id} onUpdate={() => router.refresh()} />
            </div>
          )}

          {/* Overdue Warning */}
          {isOverdue && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle size={14} className="text-destructive" />
              <span className="text-sm text-destructive">This item is overdue</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            loading={isDeleting}
          >
            <Trash2 size={14} />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} loading={isSaving}>
                  <Save size={14} />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Use portal to render outside current DOM hierarchy
  if (typeof window !== "undefined") {
    return createPortal(panelContent, document.body);
  }

  return null;
}
