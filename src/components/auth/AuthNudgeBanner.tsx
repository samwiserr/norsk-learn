"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/lib/utils";

const primaryLinkClass =
  "inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-[0_10px_20px_hsl(228_45%_45%_/_0.2)] transition hover:-translate-y-0.5 hover:brightness-105";

export interface AuthNudgeBannerProps {
  title: string;
  body: string;
  signInLabel: string;
  dismissLabel: string;
  onDismiss: () => void;
  className?: string;
}

/**
 * Non-blocking sign-in prompt shown after N anonymous messages (see AUTH_NUDGE_MESSAGE_COUNT).
 */
export function AuthNudgeBanner({
  title,
  body,
  signInLabel,
  dismissLabel,
  onDismiss,
  className,
}: AuthNudgeBannerProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "mx-3 mt-3 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm shadow-sm sm:mx-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-muted-foreground">{body}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link href="/auth" className={primaryLinkClass}>
          {signInLabel}
        </Link>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </div>
    </div>
  );
}
