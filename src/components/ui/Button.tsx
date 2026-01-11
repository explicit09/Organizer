import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  // Base styles - Linear-inspired clean, minimal approach
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-md",
    "text-sm font-medium",
    "transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "select-none",
  ],
  {
    variants: {
      variant: {
        // Primary - Solid indigo, clean and bold
        default: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          "border border-primary/20",
        ],
        // Secondary - Subtle background, works anywhere
        secondary: [
          "bg-secondary text-secondary-foreground",
          "border border-border",
          "hover:bg-accent hover:border-border/80",
        ],
        // Outline - Just borders, minimal fill
        outline: [
          "bg-transparent text-foreground",
          "border border-border",
          "hover:bg-accent hover:border-border/80",
        ],
        // Ghost - No borders, no fill, just text
        ghost: [
          "bg-transparent text-muted-foreground",
          "hover:bg-accent hover:text-foreground",
        ],
        // Destructive - Red for danger actions
        destructive: [
          "bg-destructive/10 text-destructive",
          "border border-destructive/20",
          "hover:bg-destructive/20 hover:border-destructive/30",
        ],
        // Success - Green for positive actions
        success: [
          "bg-[hsl(142_65%_48%/0.1)] text-[hsl(142_65%_48%)]",
          "border border-[hsl(142_65%_48%/0.2)]",
          "hover:bg-[hsl(142_65%_48%/0.2)] hover:border-[hsl(142_65%_48%/0.3)]",
        ],
        // Link - Text only, no button styling
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
          "p-0 h-auto",
        ],
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        xl: "h-11 px-8 text-base",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-xs": "h-6 w-6 p-0 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
