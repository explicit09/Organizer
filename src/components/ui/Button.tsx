import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] border border-primary/30",
                destructive:
                    "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30",
                outline:
                    "border border-white/[0.08] bg-transparent hover:bg-white/[0.04] hover:border-white/[0.15] text-white",
                secondary:
                    "bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12]",
                ghost:
                    "text-muted-foreground hover:bg-white/[0.04] hover:text-white",
                link:
                    "text-primary underline-offset-4 hover:underline p-0 h-auto",
                glass:
                    "bg-white/[0.03] border border-white/[0.06] text-white hover:bg-white/[0.06] hover:border-white/[0.12] backdrop-blur-xl",
                neon:
                    "bg-gradient-to-r from-primary via-primary to-accent text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] border-0",
                success:
                    "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30",
            },
            size: {
                default: "h-10 px-5 py-2",
                sm: "h-8 px-3 text-xs rounded-md",
                lg: "h-12 px-8 text-base rounded-xl",
                xl: "h-14 px-10 text-lg rounded-xl font-semibold",
                icon: "h-10 w-10 p-0",
                "icon-sm": "h-8 w-8 p-0 rounded-md",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
