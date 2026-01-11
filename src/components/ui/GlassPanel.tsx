"use client";

import * as React from "react";
import { clsx } from "clsx";

type GlassIntensity = "subtle" | "medium" | "strong";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: GlassIntensity;
  border?: boolean;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
}

const intensityClasses: Record<GlassIntensity, string> = {
  subtle: "glass-subtle",
  medium: "glass",
  strong: "glass-strong",
};

const roundedClasses = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      intensity = "medium",
      border = true,
      rounded = "lg",
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
          intensityClasses[intensity],
          roundedClasses[rounded],
          !border && "border-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

// Floating glass panel (for modals, popovers)
interface FloatingGlassPanelProps extends GlassPanelProps {
  glow?: boolean;
}

export function FloatingGlassPanel({
  glow = false,
  className,
  children,
  ...props
}: FloatingGlassPanelProps) {
  return (
    <GlassPanel
      intensity="strong"
      className={clsx(
        "shadow-2xl",
        glow && "glow-subtle",
        className
      )}
      {...props}
    >
      {children}
    </GlassPanel>
  );
}

// Glass overlay for backgrounds
export function GlassOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "fixed inset-0 bg-background/60 backdrop-blur-sm z-40",
        className
      )}
      {...props}
    />
  );
}

// Glass header bar
export function GlassHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <header
      className={clsx(
        "sticky top-0 z-50 border-b border-border/50",
        "bg-background/80 backdrop-blur-md",
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}
