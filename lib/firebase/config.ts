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
  // Check if we're in build context
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                      process.env.NEXT_PHASE === 'phase-development-server';
  
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

  // Fallback for backward compatibility (will be removed after migration)
  // During build or if env vars not set, use fallback values
  if (!isBuildTime && typeof window === "undefined" && process.env.NODE_ENV === 'production') {
    // Only throw error in production runtime (not build)
    throw new Error(
      "Firebase environment variables are not set. " +
      "Please create a .env.local file with Firebase configuration. " +
      "See .env.example for reference."
    );
  }

  // Use fallback during build or development
  if (!isBuildTime && typeof window !== "undefined") {
    console.warn(
      "Using fallback Firebase configuration. " +
      "Please set up environment variables for production use."
    );
  }
  
  return {
    apiKey: "[REDACTED-FIREBASE-KEY]",
    authDomain: "[REDACTED].firebaseapp.com",
    projectId: "[REDACTED]",
    storageBucket: "[REDACTED].appspot.com",
    messagingSenderId: "[REDACTED]",
    appId: "1:[REDACTED]:web:[REDACTED]",
    measurementId: "[REDACTED]",
  };
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Firestore
export const db: Firestore = getFirestore(app);

export default app;

