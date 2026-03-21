import "server-only";

import { getUpstashRedis } from "@/lib/infra/upstashRedis";
import { createLogger } from "@/lib/logger";
import type { SessionSnapshot } from "@/lib/contracts/sessionSync";

const log = createLogger("SessionSnapshotStore");

const KEY_PREFIX = "sess:";
const USER_KEY_PREFIX = "user_sess:";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function snapshotKey(deviceId: string): string {
  return `${KEY_PREFIX}${deviceId}`;
}

function userSnapshotKey(userId: string): string {
  return `${USER_KEY_PREFIX}${userId}`;
}

export async function saveSessionSnapshot(
  deviceId: string,
  snapshot: SessionSnapshot
): Promise<{ ok: true } | { ok: false; reason: "no_backend" | "error" }> {
  const redis = getUpstashRedis();
  if (!redis) {
    log.debug("Session sync skipped: no Upstash Redis configured");
    return { ok: false, reason: "no_backend" };
  }
  try {
    await redis.set(snapshotKey(deviceId), JSON.stringify(snapshot), { ex: TTL_SECONDS });
    return { ok: true };
  } catch (e) {
    log.error("Failed to persist session snapshot", e);
    return { ok: false, reason: "error" };
  }
}

export async function saveUserSessionSnapshot(
  userId: string,
  snapshot: SessionSnapshot
): Promise<{ ok: true } | { ok: false; reason: "no_backend" | "error" }> {
  const redis = getUpstashRedis();
  if (!redis) {
    log.debug("User session sync skipped: no Upstash Redis configured");
    return { ok: false, reason: "no_backend" };
  }
  try {
    await redis.set(userSnapshotKey(userId), JSON.stringify(snapshot), { ex: TTL_SECONDS });
    return { ok: true };
  } catch (e) {
    log.error("Failed to persist user session snapshot", e);
    return { ok: false, reason: "error" };
  }
}

export async function loadSessionSnapshot(
  deviceId: string
): Promise<SessionSnapshot | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(snapshotKey(deviceId));
    if (!raw || typeof raw !== "string") return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (e) {
    log.error("Failed to load session snapshot", e);
    return null;
  }
}

export async function loadUserSessionSnapshot(
  userId: string
): Promise<SessionSnapshot | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(userSnapshotKey(userId));
    if (!raw || typeof raw !== "string") return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (e) {
    log.error("Failed to load user session snapshot", e);
    return null;
  }
}
