"use client";

import * as React from "react";
import { clsx } from "clsx";

type GradientVariant = "primary" | "success" | "warning" | "danger" | "info" | "surface";

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GradientVariant;
  glow?: boolean;
  accentLine?: "top" | "left" | "none";
  hover?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<GradientVariant, string> = {
  primary: "stat-card-primary",
  success: "stat-card-success",
  warning: "stat-card-warning",
  danger: "stat-card-danger",
  info: "stat-card-info",
  surface: "gradient-surface",
};

const accentClasses = {
  top: "accent-line-top",
  left: "accent-line-left",
  none: "",
};

export const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  (
    {
      variant = "surface",
      glow = false,
      accentLine = "none",
      hover = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "relative rounded-lg border border-border p-4 transition-all duration-200",
          variantClasses[variant],
          accentClasses[accentLine],
          glow && "glow-on-hover",
          hover && "hover:border-border hover:shadow-lg hover:-translate-y-0.5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GradientCard.displayName = "GradientCard";

// Compact variant for stats
interface StatGradientCardProps extends GradientCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
}

export function StatGradientCard({
  label,
  value,
  icon,
  trend,
  variant = "surface",
  className,
  ...props
}: StatGradientCardProps) {
  return (
    <GradientCard
      variant={variant}
      className={clsx("overflow-hidden", className)}
      {...props}
    >
      {/* Ambient glow in background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none gradient-mesh-1" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          {icon && (
            <div className="text-muted-foreground/70">{icon}</div>
          )}
        </div>
        
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {value}
        </div>
        
        {trend && (
          <div className="mt-1.5 flex items-center gap-1">
            <span
              className={clsx(
                "text-xs font-medium",
                trend.direction === "up" && "text-[hsl(142_65%_48%)]",
                trend.direction === "down" && "text-destructive",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </GradientCard>
  );
}

// Mesh background card for featured content
export function MeshCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "relative rounded-xl border border-border bg-card overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Mesh gradient background */}
      <div className="absolute inset-0 gradient-mesh-1 opacity-50" />
      <div className="absolute inset-0 gradient-mesh-2 opacity-30" />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
