import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  interactive?: boolean;
  variant?: "default" | "muted" | "outline" | "ghost";
}

export function Card({
  className,
  children,
  hover = false,
  interactive = false,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg transition-all duration-150",
        // Variant styles
        variant === "default" && [
          "bg-card border border-border",
        ],
        variant === "muted" && [
          "bg-muted/50 border border-border/50",
        ],
        variant === "outline" && [
          "bg-transparent border border-border",
        ],
        variant === "ghost" && [
          "bg-transparent border-0",
        ],
        // Hover state
        hover && [
          "hover:bg-accent hover:border-border/80",
        ],
        // Interactive (clickable) state
        interactive && [
          "cursor-pointer",
          "hover:bg-accent hover:border-border/80",
          "active:scale-[0.99]",
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 p-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold text-foreground leading-none tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 pt-0", className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-4 pt-0",
        className
      )}
      {...props}
    />
  );
}

// Specialized card for stats/metrics
export function MetricCard({
  className,
  label,
  value,
  delta,
  deltaType = "neutral",
  icon,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}) {
  return (
    <Card className={cn("p-4", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">
            {label}
          </p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {value}
          </p>
          {delta && (
            <p
              className={cn(
                "text-xs font-medium mt-1",
                deltaType === "positive" && "text-[hsl(142_65%_48%)]",
                deltaType === "negative" && "text-destructive",
                deltaType === "neutral" && "text-muted-foreground"
              )}
            >
              {delta}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
