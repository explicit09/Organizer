"use client";

import type { Item } from "../lib/items";
import { clsx } from "clsx";
import { Circle, CheckCircle2, Clock, AlertCircle, Calendar, MoreHorizontal, CheckSquare, GraduationCap, Folder } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";
import { ProgressCircle } from "./ui/ProgressCircle";

type ItemTableProps = {
  title?: string;
  items: Item[];
  emptyLabel: string;
  showHeader?: boolean;
};

const typeConfig: Record<string, { icon: typeof CheckSquare; color: string }> = {
  task: { icon: CheckSquare, color: "text-chart-1" },
  meeting: { icon: Calendar, color: "text-chart-4" },
  school: { icon: GraduationCap, color: "text-chart-2" },
};

export function ItemTable({ title, items, emptyLabel, showHeader = true }: ItemTableProps) {
  if (items.length === 0) {
    return (
      <div className="w-full space-y-4">
        {title && (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          </div>
        )}
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <Folder size={24} className="mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  // Calculate completion stats
  const completedCount = items.filter(i => i.status === "completed").length;
  const completionRate = Math.round((completedCount / items.length) * 100);

  return (
    <div className="w-full space-y-3">
      {title && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ProgressCircle progress={completionRate} size={16} strokeWidth={2} />
            <span className="text-xs text-muted-foreground">{completionRate}%</span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table Header */}
        {showHeader && (
          <div className="grid grid-cols-[1fr_100px_90px_90px_36px] gap-3 px-4 py-2.5 border-b border-border/60 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <div>Item</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Due</div>
            <div></div>
          </div>
        )}

        {/* Table Body */}
        <div className="divide-y divide-border/60">
          {items.map((item) => {
            const type = typeConfig[item.type] || typeConfig.task;
            const TypeIcon = type.icon;
            const isOverdue = item.dueAt && new Date(item.dueAt) < new Date() && item.status !== "completed";

            return (
              <div
                key={item.id}
                className="group grid grid-cols-[1fr_100px_90px_90px_36px] gap-3 px-4 py-3 items-center hover:bg-accent/50 transition-colors cursor-pointer"
              >
                {/* Task Name & Type */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={clsx("shrink-0", type.color)}>
                    <TypeIcon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    {item.details && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.details}</p>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <StatusBadge status={item.status as any} />
                </div>

                {/* Priority Badge */}
                <div>
                  <StatusBadge priority={item.priority as any} />
                </div>

                {/* Due Date */}
                <div className="text-xs text-muted-foreground">
                  {item.dueAt ? (
                    <span className={clsx(isOverdue && "text-destructive font-medium")}>
                      {new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
