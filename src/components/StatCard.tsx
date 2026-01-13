"use client";

import { clsx } from "clsx";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "./ui/Charts";

type StatCardVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

type StatCardProps = {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  helper?: string;
  icon?: React.ReactNode;
  compact?: boolean;
  variant?: StatCardVariant;
  sparklineData?: number[];
  className?: string;
};

const variantStyles: Record<StatCardVariant, string> = {
  default: "border-border bg-card",
  primary: "stat-card-primary",
  success: "stat-card-success",
  warning: "stat-card-warning",
  danger: "stat-card-danger",
  info: "stat-card-info",
};

export function StatCard({ 
  label, 
  value, 
  delta, 
  trend = "neutral", 
  helper, 
  icon, 
  compact,
  variant = "default",
  sparklineData,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "group relative rounded-lg border overflow-hidden transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        variantStyles[variant],
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Ambient gradient glow for non-default variants */}
      {variant !== "default" && (
        <div className="absolute inset-0 opacity-30 pointer-events-none gradient-mesh-1" />
      )}

      <div className="relative z-10">
        {/* Header: Label + Icon */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          {icon && (
            <div className="text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
              {icon}
            </div>
          )}
        </div>

        {/* Value + Sparkline row */}
        <div className="flex items-end justify-between gap-2 sm:gap-3">
          <div className={clsx(
            "font-bold text-foreground tabular-nums",
            compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
          )}>
            {value}
          </div>
          
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline
              data={sparklineData}
              width={60}
              height={24}
              color={
                variant === "success" ? "hsl(142 65% 48%)" :
                variant === "warning" ? "hsl(45 95% 55%)" :
                variant === "danger" ? "hsl(0 72% 55%)" :
                variant === "info" ? "hsl(200 80% 55%)" :
                "hsl(238 65% 62%)"
              }
            />
          )}
        </div>

        {/* Footer: Delta + Helper */}
        {(delta || helper) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {delta && (
              <span
                className={clsx(
                  "inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-md",
                  trend === "up" && "text-[hsl(142_65%_48%)] bg-[hsl(142_65%_48%/0.1)]",
                  trend === "down" && "text-destructive bg-destructive/10",
                  trend === "neutral" && "text-muted-foreground bg-muted"
                )}
              >
                {trend === "up" && <ArrowUpRight size={12} />}
                {trend === "down" && <ArrowDownRight size={12} />}
                {delta}
              </span>
            )}
            {helper && (
              <span className="text-muted-foreground">{helper}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Mini stat for inline use
export function MiniStat({
  label,
  value,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={clsx(
        "text-sm font-semibold tabular-nums",
        trend === "up" && "text-[hsl(142_65%_48%)]",
        trend === "down" && "text-destructive",
        (!trend || trend === "neutral") && "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}

// Focus card - larger, prominent stat with gradient background
type FocusCardVariant = "default" | "primary" | "success" | "warning" | "danger";

export function FocusCard({
  label,
  value,
  description,
  icon,
  variant = "default",
  onClick,
  sparklineData,
  className,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  variant?: FocusCardVariant;
  onClick?: () => void;
  sparklineData?: number[];
  className?: string;
}) {
  const variantBg: Record<FocusCardVariant, string> = {
    default: "border-border bg-card hover:bg-accent/30",
    primary: "stat-card-primary hover:border-primary/30",
    success: "stat-card-success hover:border-[hsl(142_65%_48%/0.3)]",
    warning: "stat-card-warning hover:border-[hsl(45_95%_55%/0.3)]",
    danger: "stat-card-danger hover:border-destructive/30",
  };

  const iconColors: Record<FocusCardVariant, string> = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-[hsl(142_65%_48%)]",
    warning: "text-[hsl(45_95%_55%)]",
    danger: "text-destructive",
  };

  const sparklineColors: Record<FocusCardVariant, string> = {
    default: "hsl(238 65% 62%)",
    primary: "hsl(238 65% 62%)",
    success: "hsl(142 65% 48%)",
    warning: "hsl(45 95% 55%)",
    danger: "hsl(0 72% 55%)",
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative rounded-lg border p-4 transition-all duration-200 overflow-hidden",
        "hover:-translate-y-0.5 hover:shadow-lg",
        variantBg[variant],
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Ambient gradient for non-default */}
      {variant !== "default" && (
        <div className="absolute inset-0 opacity-40 pointer-events-none gradient-mesh-1" />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            {label}
          </p>
          <p className={clsx(
            "text-2xl sm:text-3xl font-bold tabular-nums",
            variant === "default" ? "text-foreground" : iconColors[variant]
          )}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          
          {/* Sparkline below description */}
          {sparklineData && sparklineData.length > 1 && (
            <div className="mt-3">
              <Sparkline
                data={sparklineData}
                width={100}
                height={28}
                color={sparklineColors[variant]}
              />
            </div>
          )}
        </div>
        
        {icon && (
          <div className={clsx("shrink-0 p-2 rounded-lg bg-background/50", iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Metric card with comparison
export function MetricCard({
  label,
  value,
  previousValue,
  format = "number",
  icon,
  variant = "default",
  className,
}: {
  label: string;
  value: number;
  previousValue?: number;
  format?: "number" | "percent" | "currency";
  icon?: React.ReactNode;
  variant?: StatCardVariant;
  className?: string;
}) {
  const formatValue = (v: number) => {
    switch (format) {
      case "percent":
        return `${v}%`;
      case "currency":
        return `$${v.toLocaleString()}`;
      default:
        return v.toLocaleString();
    }
  };

  const change = previousValue !== undefined && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : undefined;
  
  const trend = change !== undefined
    ? change > 0 ? "up" : change < 0 ? "down" : "neutral"
    : "neutral";

  return (
    <StatCard
      label={label}
      value={formatValue(value)}
      delta={change !== undefined ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : undefined}
      trend={trend}
      helper={previousValue !== undefined ? `vs ${formatValue(previousValue)}` : undefined}
      icon={icon}
      variant={variant}
      className={className}
    />
  );
}
