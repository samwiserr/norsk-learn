"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-[0_10px_20px_hsl(228_45%_45%_/_0.2)] hover:-translate-y-0.5 hover:brightness-105",
  secondary:
    "bg-secondary text-secondary-foreground shadow-[0_6px_14px_hsl(224_30%_30%_/_0.08)] hover:bg-secondary/85 hover:-translate-y-0.5",
  outline:
    "border border-input bg-card shadow-[0_6px_16px_hsl(224_30%_30%_/_0.06)] hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5",
  ghost: "hover:bg-accent/80 hover:text-accent-foreground",
  destructive:
    "bg-destructive text-destructive-foreground shadow-[0_10px_20px_hsl(0_70%_45%_/_0.18)] hover:-translate-y-0.5 hover:brightness-105",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-3 text-xs",
  md: "h-10 rounded-xl px-4 py-2 text-sm",
  lg: "h-11 rounded-xl px-8 text-base",
  icon: "h-10 w-10 rounded-xl p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
