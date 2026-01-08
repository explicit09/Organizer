"use client";

import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ProgressCircle } from "./ui/ProgressCircle";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  helper?: string;
  icon?: React.ReactNode;
  progress?: number;
  compact?: boolean;
};

export function StatCard({ label, value, delta, trend = "neutral", helper, icon, progress, compact }: StatCardProps) {
  return (
    <div
      className={clsx(
        "group relative rounded-lg border border-border bg-card overflow-hidden transition-colors",
        "hover:border-border hover:bg-accent/30",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Top row: Icon + Label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary transition-colors">
              <div className="scale-75">{icon}</div>
            </div>
          )}
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
        </div>
        {progress !== undefined && (
          <ProgressCircle progress={progress} size={20} strokeWidth={2} />
        )}
      </div>

      {/* Main value */}
      <div className={clsx(
        "font-bold text-foreground tracking-tight",
        compact ? "text-2xl" : "text-3xl"
      )}>
        {value}
      </div>

      {/* Bottom row: Delta + Helper */}
      {(delta || helper) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={clsx(
                "inline-flex items-center gap-1 font-medium",
                trend === "up" && "text-chart-2",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trend === "up" && <TrendingUp size={12} />}
              {trend === "down" && <TrendingDown size={12} />}
              {trend === "neutral" && <Minus size={12} />}
              {delta}
            </span>
          )}
          {helper && (
            <>
              {delta && <span className="text-muted-foreground/40">·</span>}
              <span className="text-muted-foreground">{helper}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
