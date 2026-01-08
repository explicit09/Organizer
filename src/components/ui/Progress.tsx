"use client";

import * as React from "react";
import { clsx } from "clsx";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  segments?: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, segments, showLabel = false, size = "md", ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const heights = {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    };

    // Multi-segment progress bar
    if (segments && segments.length > 0) {
      const total = segments.reduce((sum, seg) => sum + seg.value, 0);

      return (
        <div className={clsx("w-full", className)} ref={ref} {...props}>
          <div className={clsx("w-full rounded-full bg-muted overflow-hidden flex", heights[size])}>
            {segments.map((segment, index) => {
              const segmentPercentage = total > 0 ? (segment.value / total) * 100 : 0;
              return (
                <div
                  key={index}
                  className={clsx("h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full")}
                  style={{
                    width: `${segmentPercentage}%`,
                    backgroundColor: segment.color,
                  }}
                  title={segment.label ? `${segment.label}: ${segment.value}` : undefined}
                />
              );
            })}
          </div>
          {showLabel && (
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              {segments.map((segment, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span>{segment.label || `${segment.value}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Single progress bar
    return (
      <div className={clsx("w-full", className)} ref={ref} {...props}>
        <div className={clsx("w-full rounded-full bg-muted overflow-hidden", heights[size])}>
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{value}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

// Status-based progress for items
interface StatusProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  completed: number;
  inProgress: number;
  notStarted: number;
  blocked?: number;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
}

function StatusProgress({
  completed,
  inProgress,
  notStarted,
  blocked = 0,
  size = "md",
  showLegend = false,
  className,
  ...props
}: StatusProgressProps) {
  const segments = [
    { value: completed, color: "oklch(0.7 0.15 160)", label: "Completed" },
    { value: inProgress, color: "oklch(0.7 0.15 250)", label: "In Progress" },
    { value: blocked, color: "oklch(0.7 0.15 30)", label: "Blocked" },
    { value: notStarted, color: "oklch(0.4 0 0)", label: "Not Started" },
  ].filter((s) => s.value > 0);

  return (
    <Progress
      segments={segments}
      size={size}
      showLabel={showLegend}
      className={className}
      {...props}
    />
  );
}

export { Progress, StatusProgress };
