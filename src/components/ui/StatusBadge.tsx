"use client";

import { clsx } from "clsx";

type Status = "active" | "in_progress" | "pending" | "completed" | "blocked" | "cancelled";
type Priority = "urgent" | "high" | "medium" | "low";

interface StatusBadgeProps {
  status?: Status;
  priority?: Priority;
  className?: string;
}

const statusStyles: Record<Status, { dot: string; badge: string }> = {
  active: {
    dot: "bg-teal-500",
    badge: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  },
  in_progress: {
    dot: "bg-blue-500",
    badge: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  pending: {
    dot: "bg-zinc-400",
    badge: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
  },
  completed: {
    dot: "bg-emerald-500",
    badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  blocked: {
    dot: "bg-orange-500",
    badge: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  },
  cancelled: {
    dot: "bg-rose-500",
    badge: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
};

const priorityStyles: Record<Priority, { dot: string; badge: string }> = {
  urgent: {
    dot: "bg-rose-500",
    badge: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
  high: {
    dot: "bg-amber-500",
    badge: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  medium: {
    dot: "bg-blue-500",
    badge: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  low: {
    dot: "bg-zinc-400",
    badge: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
  },
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, priority, className }: StatusBadgeProps) {
  if (status) {
    const styles = statusStyles[status] || statusStyles.pending;
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          styles.badge,
          className
        )}
      >
        <span className={clsx("h-1.5 w-1.5 rounded-full", styles.dot)} />
        {formatLabel(status)}
      </span>
    );
  }

  if (priority) {
    const styles = priorityStyles[priority] || priorityStyles.medium;
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          styles.badge,
          className
        )}
      >
        <span className={clsx("h-1.5 w-1.5 rounded-full", styles.dot)} />
        {formatLabel(priority)}
      </span>
    );
  }

  return null;
}
