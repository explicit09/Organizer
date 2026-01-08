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
                    "flex h-11 w-full rounded-xl border border-white/[0.08] bg-[#0c0c0e] px-4 py-2 text-sm text-white",
                    "transition-all duration-200",
                    "placeholder:text-muted-foreground/60",
                    "hover:border-white/[0.12] hover:bg-[#0e0e10]",
                    "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:bg-[#0a0a0c] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/[0.08] disabled:hover:bg-[#0c0c0e]",
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
