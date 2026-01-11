import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, iconPosition = "left", ...props }, ref) => {
    const hasIcon = !!icon;
    
    if (hasIcon) {
      return (
        <div className="relative">
          {iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              // Base styles
              "flex h-9 w-full rounded-md text-sm",
              "bg-background text-foreground",
              "border border-border",
              "transition-colors duration-150",
              // Placeholder
              "placeholder:text-muted-foreground",
              // Focus states
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-ring",
              // Disabled
              "disabled:cursor-not-allowed disabled:opacity-50",
              // Icon padding
              iconPosition === "left" ? "pl-9 pr-3" : "pl-3 pr-9",
              // Error state
              error && "border-destructive focus:ring-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
          {iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-9 w-full rounded-md px-3 py-2 text-sm",
          "bg-background text-foreground",
          "border border-border",
          "transition-colors duration-150",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Focus states
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-ring",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Error state
          error && "border-destructive focus:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

// Textarea component
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[80px] w-full rounded-md px-3 py-2 text-sm",
          "bg-background text-foreground",
          "border border-border",
          "transition-colors duration-150",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Focus states
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-ring",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Resize
          "resize-none",
          // Error state
          error && "border-destructive focus:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

// Select component
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          // Base styles
          "flex h-9 w-full rounded-md px-3 py-2 text-sm",
          "bg-background text-foreground",
          "border border-border",
          "transition-colors duration-150",
          // Focus states
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-ring",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Arrow
          "appearance-none cursor-pointer",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2.22%204.47a.75.75%200%200%201%201.06%200L6%207.19l2.72-2.72a.75.75%200%200%201%201.06%201.06l-3.25%203.25a.75.75%200%200%201-1.06%200L2.22%205.53a.75.75%200%200%201%200-1.06Z%22%2F%3E%3C%2Fsvg%3E')]",
          "bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat",
          "pr-8",
          // Error state
          error && "border-destructive focus:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

// Form field wrapper
export interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  description,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-xs font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export { Input, Textarea, Select };
