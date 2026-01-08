
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function Card({
    className,
    children,
    hover = false,
    variant = "default",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    hover?: boolean;
    variant?: "default" | "glass" | "solid" | "ghost";
}) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl transition-all duration-200",
                // Variant styles
                variant === "default" && "bg-[#0c0c0e] border border-white/[0.06]",
                variant === "glass" && "bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl",
                variant === "solid" && "bg-[#09090b] border border-white/[0.08]",
                variant === "ghost" && "bg-transparent border-0",
                // Hover Effects
                hover && "hover:bg-white/[0.04] hover:border-white/[0.12]",
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
            className={cn("flex flex-col gap-1.5 p-5", className)}
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
                "text-base font-semibold text-white tracking-tight",
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
    return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex items-center gap-3 p-5 pt-0", className)}
            {...props}
        />
    );
}
