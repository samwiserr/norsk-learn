import "server-only";

import admin from "firebase-admin";
import { config } from "@/lib/config";
import { createLogger } from "@/lib/logger";

const log = createLogger("FirebaseAdmin");

type VerifiedFirebaseUser = {
  uid: string;
  email?: string;
};

let adminInitPromise: Promise<void> | null = null;

async function ensureAdminInitialized(): Promise<void> {
  if (adminInitPromise) return adminInitPromise;

  adminInitPromise = (async () => {
    // Avoid initializing admin when we aren't using token verification.
    const { projectId, clientEmail, privateKey } = config.firebaseAdmin;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin not configured (set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)."
      );
    }

    const normalizedPrivateKey = privateKey.replace(/\\n/g, "\n");

    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: normalizedPrivateKey,
          }),
        });
      }
    } catch (e) {
      log.error("Failed to initialize Firebase Admin", e);
      throw e;
    }
  })();

  return adminInitPromise;
}

function extractBearerToken(request: Request): string | null {
  const raw = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function verifyFirebaseIdTokenFromRequest(
  request: Request
): Promise<VerifiedFirebaseUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  await ensureAdminInitialized();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch (e) {
    log.warn("Firebase token verification failed");
    return null;
  }
}

