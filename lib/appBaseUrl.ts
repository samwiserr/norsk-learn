import "server-only";

const trimTrailingSlash = (s: string) => s.replace(/\/$/, "");

/**
 * Trusted public base URL for same-origin redirects (e.g. Stripe success/cancel).
 * Do not build redirect URLs from the raw Origin header — that triggers open-redirect findings.
 */
export function resolveTrustedAppBaseUrl(originHeader: string | null): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return trimTrailingSlash(`https://${vercel}`);
  }

  const isNonProd =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    !process.env.NODE_ENV;

  if (isNonProd && originHeader) {
    try {
      const u = new URL(originHeader);
      if (
        u.protocol === "http:" &&
        (u.hostname === "localhost" || u.hostname === "127.0.0.1")
      ) {
        return trimTrailingSlash(`${u.protocol}//${u.host}`);
      }
    } catch {
      /* ignore */
    }
  }

  if (isNonProd) {
    return "http://localhost:3000";
  }

  throw new Error(
    "Set NEXT_PUBLIC_SITE_URL to your public site origin (required for checkout redirects outside Vercel).",
  );
}
