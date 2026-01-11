"use client";

import { clsx } from "clsx";
import { X } from "lucide-react";

type BadgeVariant = "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "xs" | "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-accent text-foreground",
  primary: "bg-primary/15 text-primary",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-[hsl(142_65%_48%/0.15)] text-[hsl(142_65%_48%)]",
  warning: "bg-[hsl(45_95%_55%/0.15)] text-[hsl(45_95%_55%)]",
  danger: "bg-[hsl(0_72%_55%/0.15)] text-[hsl(0_72%_55%)]",
  outline: "bg-transparent text-foreground border border-border",
  muted: "bg-muted/50 text-muted-foreground",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  removable,
  onRemove,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded font-medium transition-colors",
        size === "xs" && "px-1 py-0.5 text-[9px]",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-1 text-xs",
        variantStyles[variant],
        className
      )}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 rounded-sm p-0.5 hover:bg-white/10 transition-colors -mr-0.5"
        >
          <X size={size === "xs" ? 8 : 10} />
        </button>
      )}
    </span>
  );
}

// Tag variant for labels/categories
export function Tag({
  children,
  color,
  onRemove,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
        "bg-primary/10 text-primary",
        className
      )}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-sm p-0.5 hover:bg-white/10 transition-colors -mr-0.5"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
