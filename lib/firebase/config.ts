// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { config } from "@/lib/config";

/**
 * Get Firebase configuration from environment variables
 * Falls back to hardcoded values for backward compatibility during migration
 * TODO: Remove fallback values after migration is complete
 */
function getFirebaseConfig() {
  // Try to use environment variables first
  const hasEnvVars =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (hasEnvVars) {
    try {
      return {
        apiKey: config.firebase.apiKey,
        authDomain: config.firebase.authDomain,
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
        messagingSenderId: config.firebase.messagingSenderId,
        appId: config.firebase.appId,
        measurementId: config.firebase.measurementId,
      };
    } catch {
      // If config access fails, use env vars directly
      return {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      };
    }
  }

  // In build or dev without Firebase env vars, use placeholders.
  // Auth and Firestore operations will fail gracefully at runtime.
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    // Warn once in browser console during dev
    const w = globalThis as any;
    if (!w.__fbWarnShown) {
      w.__fbWarnShown = true;
      console.warn(
        "[Firebase] Environment variables not set. Auth/sync disabled. " +
        "See .env.example for setup instructions."
      );
    }
  }

  return {
    apiKey: "placeholder",
    authDomain: "placeholder.firebaseapp.com",
    projectId: "placeholder",
    storageBucket: "placeholder.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:placeholder",
    measurementId: undefined,
  };
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
const existingApps = getApps();
if (existingApps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = existingApps[0]!; // Non-null assertion: getApps() returns non-empty array if length > 0
}

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Firestore
export const db: Firestore = getFirestore(app);

export default app;

