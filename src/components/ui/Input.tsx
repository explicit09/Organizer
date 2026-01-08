import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-xl border border-white/[0.05] bg-black/20 px-4 py-2 text-sm text-foreground shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]",
                    "transition-all duration-300 ease-out",
                    "placeholder:text-muted-foreground/50",
                    "hover:border-white/[0.1] hover:bg-black/30",
                    "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:shadow-[0_0_15px_-3px_var(--primary)] focus-visible:ring-1 focus-visible:ring-primary/40",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
