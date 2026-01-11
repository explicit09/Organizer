"use client";

import { clsx } from "clsx";

type Status = "not_started" | "in_progress" | "blocked" | "completed" | "cancelled";
type Priority = "urgent" | "high" | "medium" | "low";

interface StatusBadgeProps {
  status?: Status;
  priority?: Priority;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

// Linear-inspired status colors
const statusConfig: Record<Status, { color: string; bg: string; label: string }> = {
  not_started: {
    color: "text-[hsl(228_5%_55%)]",
    bg: "bg-[hsl(228_5%_55%/0.15)]",
    label: "Todo",
  },
  in_progress: {
    color: "text-[hsl(45_95%_55%)]",
    bg: "bg-[hsl(45_95%_55%/0.15)]",
    label: "In Progress",
  },
  blocked: {
    color: "text-[hsl(25_95%_55%)]",
    bg: "bg-[hsl(25_95%_55%/0.15)]",
    label: "Blocked",
  },
  completed: {
    color: "text-[hsl(142_65%_48%)]",
    bg: "bg-[hsl(142_65%_48%/0.15)]",
    label: "Done",
  },
  cancelled: {
    color: "text-[hsl(228_5%_40%)]",
    bg: "bg-[hsl(228_5%_40%/0.15)]",
    label: "Cancelled",
  },
};

const priorityConfig: Record<Priority, { color: string; bg: string; label: string }> = {
  urgent: {
    color: "text-[hsl(0_72%_55%)]",
    bg: "bg-[hsl(0_72%_55%/0.15)]",
    label: "Urgent",
  },
  high: {
    color: "text-[hsl(25_95%_55%)]",
    bg: "bg-[hsl(25_95%_55%/0.15)]",
    label: "High",
  },
  medium: {
    color: "text-[hsl(238_65%_62%)]",
    bg: "bg-[hsl(238_65%_62%/0.15)]",
    label: "Medium",
  },
  low: {
    color: "text-[hsl(228_5%_50%)]",
    bg: "bg-[hsl(228_5%_50%/0.15)]",
    label: "Low",
  },
};

export function StatusBadge({ 
  status, 
  priority, 
  size = "sm",
  showLabel = true, 
  className 
}: StatusBadgeProps) {
  if (status) {
    const config = statusConfig[status] || statusConfig.not_started;
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded font-medium",
          size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
          config.color,
          config.bg,
          className
        )}
      >
        <StatusDot status={status} />
        {showLabel && config.label}
      </span>
    );
  }

  if (priority) {
    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded font-medium",
          size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
          config.color,
          config.bg,
          className
        )}
      >
        <PriorityIcon priority={priority} />
        {showLabel && config.label}
      </span>
    );
  }

  return null;
}

// Just the status dot
export function StatusDot({ 
  status, 
  className 
}: { 
  status: Status; 
  className?: string;
}) {
  const dotColors: Record<Status, string> = {
    not_started: "bg-[hsl(228_5%_55%)]",
    in_progress: "bg-[hsl(45_95%_55%)]",
    blocked: "bg-[hsl(25_95%_55%)]",
    completed: "bg-[hsl(142_65%_48%)]",
    cancelled: "bg-[hsl(228_5%_40%)]",
  };

  return (
    <span 
      className={clsx(
        "w-2 h-2 rounded-full flex-shrink-0",
        dotColors[status] || dotColors.not_started,
        className
      )} 
    />
  );
}

// Priority icon (bars)
export function PriorityIcon({ 
  priority, 
  className 
}: { 
  priority: Priority; 
  className?: string;
}) {
  const colors: Record<Priority, string> = {
    urgent: "text-[hsl(0_72%_55%)]",
    high: "text-[hsl(25_95%_55%)]",
    medium: "text-[hsl(238_65%_62%)]",
    low: "text-[hsl(228_5%_50%)]",
  };

  const bars = priority === "urgent" ? 4 : priority === "high" ? 3 : priority === "medium" ? 2 : 1;

  return (
    <div className={clsx("flex items-end gap-[2px] h-3", colors[priority], className)}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={clsx(
            "w-[3px] rounded-[1px] transition-all",
            i <= bars ? "bg-current" : "bg-current/20",
            i === 1 && "h-1",
            i === 2 && "h-1.5",
            i === 3 && "h-2",
            i === 4 && "h-2.5"
          )}
        />
      ))}
    </div>
  );
}
