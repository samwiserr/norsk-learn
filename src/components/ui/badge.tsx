import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const variants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary/90 text-primary-foreground shadow-sm",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "text-foreground border-border bg-card/80",
  destructive: "border-transparent bg-destructive/90 text-destructive-foreground shadow-sm",
};

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
