"use client";

import * as React from "react";
import { clsx } from "clsx";

type GlowVariant = "primary" | "success" | "warning" | "danger";
type GlowSize = "sm" | "md" | "lg";

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlowVariant;
  size?: GlowSize;
  loading?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<GlowVariant, { bg: string; glow: string; hover: string }> = {
  primary: {
    bg: "bg-gradient-to-r from-[hsl(238_65%_62%)] to-[hsl(280_60%_55%)]",
    glow: "shadow-[0_0_20px_hsl(238_65%_62%/0.4),0_0_40px_hsl(238_65%_62%/0.2)]",
    hover: "hover:shadow-[0_0_30px_hsl(238_65%_62%/0.5),0_0_60px_hsl(238_65%_62%/0.3)]",
  },
  success: {
    bg: "bg-gradient-to-r from-[hsl(142_65%_48%)] to-[hsl(170_70%_45%)]",
    glow: "shadow-[0_0_20px_hsl(142_65%_48%/0.4),0_0_40px_hsl(142_65%_48%/0.2)]",
    hover: "hover:shadow-[0_0_30px_hsl(142_65%_48%/0.5),0_0_60px_hsl(142_65%_48%/0.3)]",
  },
  warning: {
    bg: "bg-gradient-to-r from-[hsl(45_95%_55%)] to-[hsl(25_95%_55%)]",
    glow: "shadow-[0_0_20px_hsl(45_95%_55%/0.4),0_0_40px_hsl(45_95%_55%/0.2)]",
    hover: "hover:shadow-[0_0_30px_hsl(45_95%_55%/0.5),0_0_60px_hsl(45_95%_55%/0.3)]",
  },
  danger: {
    bg: "bg-gradient-to-r from-[hsl(0_72%_55%)] to-[hsl(330_70%_50%)]",
    glow: "shadow-[0_0_20px_hsl(0_72%_55%/0.4),0_0_40px_hsl(0_72%_55%/0.2)]",
    hover: "hover:shadow-[0_0_30px_hsl(0_72%_55%/0.5),0_0_60px_hsl(0_72%_55%/0.3)]",
  },
};

const sizeStyles: Record<GlowSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2.5 rounded-lg",
};

export const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      pulse = false,
      icon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const styles = variantStyles[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "relative inline-flex items-center justify-center font-medium text-white",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          styles.bg,
          styles.glow,
          styles.hover,
          "hover:-translate-y-0.5 active:translate-y-0",
          pulse && "glow-pulse",
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

GlowButton.displayName = "GlowButton";

// Icon-only glow button
interface GlowIconButtonProps extends Omit<GlowButtonProps, "children" | "icon"> {
  icon: React.ReactNode;
  "aria-label": string;
}

export const GlowIconButton = React.forwardRef<HTMLButtonElement, GlowIconButtonProps>(
  ({ variant = "primary", size = "md", icon, className, ...props }, ref) => {
    const styles = variantStyles[variant];
    
    const iconSizes: Record<GlowSize, string> = {
      sm: "h-8 w-8 rounded-md",
      md: "h-10 w-10 rounded-lg",
      lg: "h-12 w-12 rounded-lg",
    };

    return (
      <button
        ref={ref}
        className={clsx(
          "relative inline-flex items-center justify-center font-medium text-white",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          styles.bg,
          styles.glow,
          styles.hover,
          "hover:-translate-y-0.5 active:translate-y-0",
          iconSizes[size],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

GlowIconButton.displayName = "GlowIconButton";

// Subtle gradient button (less glow, more professional)
export function SubtleGradientButton({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: GlowButtonProps) {
  const bgVariants: Record<GlowVariant, string> = {
    primary: "bg-gradient-to-r from-[hsl(238_65%_62%)] to-[hsl(260_60%_58%)]",
    success: "bg-gradient-to-r from-[hsl(142_65%_48%)] to-[hsl(155_65%_45%)]",
    warning: "bg-gradient-to-r from-[hsl(45_95%_55%)] to-[hsl(35_95%_50%)]",
    danger: "bg-gradient-to-r from-[hsl(0_72%_55%)] to-[hsl(350_70%_52%)]",
  };

  return (
    <button
      className={clsx(
        "relative inline-flex items-center justify-center font-medium text-white",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0",
        bgVariants[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
