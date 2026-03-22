/**
 * Opaque device id for server-owned session snapshots (stored locally only).
 */

import { randomHexBytes } from "@/lib/secureRandom";

const STORAGE_KEY = "norsk-tutor-device-id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (id && id.length >= 8 && id.length <= 128) return id;
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${randomHexBytes(8)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return "";
  }
}
