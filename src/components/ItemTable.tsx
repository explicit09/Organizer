"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "../lib/items";
import { clsx } from "clsx";
import { 
  Clock, 
  MoreHorizontal, 
  CheckSquare, 
  Calendar,
  GraduationCap, 
  Folder,
  Check,
  ChevronRight,
} from "lucide-react";
import { StatusDot, PriorityIcon } from "./ui/StatusBadge";

type ItemTableProps = {
  title?: string;
  items: Item[];
  emptyLabel: string;
  showHeader?: boolean;
  onItemClick?: (item: Item) => void;
};

const typeIcons: Record<string, typeof CheckSquare> = {
  task: CheckSquare,
  meeting: Calendar,
  school: GraduationCap,
};

function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ItemTable({ title, items, emptyLabel, showHeader = true, onItemClick }: ItemTableProps) {
  const router = useRouter();
  const [completingId, setCompletingId] = useState<string | null>(null);

  async function toggleComplete(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = item.status === "completed" ? "not_started" : "completed";
    setCompletingId(item.id);
    
    try {
      await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update item:", error);
    } finally {
      setCompletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="w-full space-y-3">
        {title && (
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        )}
        <div className="rounded-lg border border-dashed border-border py-10 text-center">
          <Folder size={20} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {items.length}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table Header - Hidden on mobile */}
        {showHeader && (
          <div className="hidden sm:grid sm:grid-cols-[32px_1fr_80px_80px_80px] gap-2 px-3 py-2 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <div></div>
            <div>Title</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Due</div>
          </div>
        )}

        {/* Table Body */}
        <div className="divide-y divide-border">
          {items.map((item) => {
            const TypeIcon = typeIcons[item.type] || CheckSquare;
            const isCompleted = item.status === "completed";
            const isOverdue = item.dueAt && new Date(item.dueAt) < new Date() && !isCompleted;
            const isCompleting = completingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className={clsx(
                  "group flex flex-col gap-2 px-3 py-3 transition-colors",
                  "sm:grid sm:grid-cols-[32px_1fr_80px_80px_80px] sm:gap-2 sm:py-2.5 sm:items-center",
                  onItemClick && "cursor-pointer hover:bg-accent/50"
                )}
              >
                {/* Mobile: Title row with checkbox */}
                <div className="flex items-center gap-2 sm:contents">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleComplete(item, e)}
                    disabled={isCompleting}
                    className={clsx(
                      "w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0",
                      isCompleted
                        ? "bg-[hsl(142_65%_48%)] border-[hsl(142_65%_48%)] text-white"
                        : "border-border hover:border-muted-foreground",
                      isCompleting && "opacity-50"
                    )}
                  >
                    {isCompleted && <Check size={12} strokeWidth={3} />}
                  </button>

                  {/* Title */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TypeIcon size={14} className="shrink-0 text-muted-foreground" />
                    <span className={clsx(
                      "text-sm truncate transition-colors",
                      isCompleted
                        ? "text-muted-foreground line-through"
                        : "text-foreground group-hover:text-primary"
                    )}>
                      {item.title}
                    </span>
                  </div>
                </div>

                {/* Mobile: Meta row */}
                <div className="flex items-center gap-3 pl-7 sm:contents">
                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={item.status as any} />
                    <span className="text-xs text-muted-foreground capitalize">
                      {item.status === "not_started" ? "Todo" : item.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-1.5">
                    {item.priority && (
                      <>
                        <PriorityIcon priority={item.priority as any} />
                        <span className="text-xs text-muted-foreground capitalize hidden sm:inline">
                          {item.priority}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="ml-auto sm:ml-0">
                    {item.dueAt ? (
                      <span className={clsx(
                        "text-xs",
                        isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        {formatDate(new Date(item.dueAt))}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 hidden sm:inline">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compact list view for sidebars, etc.
export function ItemList({ 
  items, 
  onItemClick,
  emptyLabel = "No items",
}: { 
  items: Item[]; 
  onItemClick?: (item: Item) => void;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isCompleted = item.status === "completed";
        
        return (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left group"
          >
            <StatusDot status={item.status as any} />
            <span className={clsx(
              "flex-1 text-sm truncate",
              isCompleted ? "text-muted-foreground line-through" : "text-foreground"
            )}>
              {item.title}
            </span>
            <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        );
      })}
    </div>
  );
}
