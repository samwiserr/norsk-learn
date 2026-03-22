/**
 * Opaque IDs and correlation tokens must not use Math.random() (CodeQL js/insecure-randomness).
 */

export function randomHexBytes(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  const c = globalThis.crypto;
  if (!c?.getRandomValues) {
    throw new Error("crypto.getRandomValues is not available");
  }
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Random float in [0, 1) for non-secret jitter (backoff), still avoids Math.random. */
export function randomUnit(): number {
  const u = new Uint32Array(1);
  globalThis.crypto.getRandomValues(u);
  return u[0]! / 0x1_0000_0000;
}
