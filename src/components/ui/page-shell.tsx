import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Narrow content column */
  narrow?: boolean;
}

export function PageShell({ children, className, narrow, ...props }: PageShellProps) {
  return (
    <div
      className={cn("min-h-screen bg-background text-foreground", className)}
      {...props}
    >
      <div
        className={cn(
          "mx-auto w-full px-4 py-8 sm:px-6 lg:px-8",
          narrow ? "max-w-lg" : "max-w-4xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "soft-panel mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6",
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
