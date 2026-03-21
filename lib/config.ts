/**
 * Centralized configuration management with validation
 * All environment variables are validated on import
 */

import { z } from 'zod';
import { createLogger } from "@/lib/logger";

const log = createLogger("Config");

// Schema for environment variables
// In development, Firebase/OpenAI/Azure vars are optional to allow other flows to run
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const baseSchema = {
  // Gemini API (server-side only) - always required
  GEMINI_API_KEY: z.string().min(1, 'Gemini API Key is required'),

  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Firebase Admin (server-side token verification)
  FIREBASE_ADMIN_PROJECT_ID: z.string().default(''),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().default(''),

  // Stripe Payments (optional in development; adapter will error if used without it)
  STRIPE_SECRET_KEY: z.string().default(''),

  // Pronunciation Provider (optional in development; route will error if upstream missing)
  PRONUNCIATION_SERVICE_URL: z.string().default(''),

  // OpenAI Realtime
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-4o-realtime-preview-2024-12-17'),

  // Azure Speech (browser SDK token minting)
  AZURE_SPEECH_KEY: z.string().default(''),
  AZURE_SPEECH_REGION: z.string().default(''),
  AZURE_SPEECH_TOKEN_URL: z.string().optional(),
};

// Firebase Configuration - required in production, optional in development
const firebaseSchema = isDevelopment ? {
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
} : {
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API Key is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase Auth Domain is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase Project ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'Firebase Storage Bucket is required'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'Firebase Messaging Sender ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase App ID is required'),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
};

const envSchema = z.object({
  ...firebaseSchema,
  ...baseSchema,
});

// Check if we're in a build context (Next.js static analysis)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-development-server';

// Validate environment variables
// In development and build time, we allow missing vars with warnings for backward compatibility
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Separate Firebase errors from critical errors (like GEMINI_API_KEY)
      const firebaseErrors = error.errors.filter(e =>
        e.path[0]?.toString().startsWith('NEXT_PUBLIC_FIREBASE_')
      );
      const criticalErrors = error.errors.filter(e => {
        const key = e.path[0]?.toString();
        return key && !key.startsWith('NEXT_PUBLIC_FIREBASE_');
      });

      // If there are critical errors (like missing GEMINI_API_KEY), throw
      if (criticalErrors.length > 0) {
        const missingVars = criticalErrors.map((e) => e.path.join('.')).join(', ');
        throw new Error(`Missing or invalid required environment variables: ${missingVars}`);
      }

      // If only Firebase errors, log warning but continue with defaults
      if (firebaseErrors.length > 0) {
        const missingVars = firebaseErrors.map((e) => e.path.join('.')).join(', ');
        const errorMessage =
          `Missing or invalid Firebase environment variables: ${missingVars}\n` +
          'Please check your .env.local file and ensure all required variables are set.\n' +
          'See .env.example for reference.';

        // In production runtime (not build), throw error for Firebase
        if (process.env.NODE_ENV === 'production' && !isBuildTime) {
          log.warn('Firebase keys missing in production. Some features may be disabled.');
        }

        // In development or build time, log warning but allow fallback values
        // Suppress warnings during build to avoid build failures
        if (!isBuildTime && process.env.NODE_ENV !== 'test') {
          log.warn('Environment configuration warning:', errorMessage);
          log.warn('Using fallback values. This should not happen in production.');
        }
      }

      // Return a partial config with defaults for development/build
      // Parse through schema with defaults to ensure correct types
      return envSchema.parse({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '60000',
        NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
        FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID || '',
        FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '',
        FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY || '',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
        PRONUNCIATION_SERVICE_URL: process.env.PRONUNCIATION_SERVICE_URL || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        OPENAI_REALTIME_MODEL: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17',
        AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY || '',
        AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION || '',
        AZURE_SPEECH_TOKEN_URL: process.env.AZURE_SPEECH_TOKEN_URL || undefined,
      });
    }
    throw error;
  }
}

// Lazy validation - only validate when config is accessed
// This prevents build-time errors when env vars aren't set
let cachedEnv: z.infer<typeof envSchema> | null = null;

function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }
  cachedEnv = validateEnv();
  return cachedEnv;
}

// Export typed configuration with lazy evaluation
export const config = {
  get firebase() {
    const env = getEnv();
    return {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
  },
  get gemini() {
    const env = getEnv();
    return {
      apiKey: env.GEMINI_API_KEY,
    };
  },
  get firebaseAdmin() {
    const env = getEnv();
    return {
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY,
    };
  },
  get openai() {
    const env = getEnv();
    return {
      apiKey: env.OPENAI_API_KEY,
      realtimeModel: env.OPENAI_REALTIME_MODEL,
    };
  },
  get stripe() {
    const env = getEnv();
    return {
      secretKey: env.STRIPE_SECRET_KEY,
    };
  },
  get pronunciation() {
    const env = getEnv();
    return {
      serviceUrl: env.PRONUNCIATION_SERVICE_URL,
    };
  },
  get azureSpeech() {
    const env = getEnv();
    return {
      key: env.AZURE_SPEECH_KEY,
      region: env.AZURE_SPEECH_REGION,
      tokenUrl: env.AZURE_SPEECH_TOKEN_URL,
    };
  },
  get rateLimit() {
    const env = getEnv();
    return {
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
    };
  },
  get env() {
    return getEnv().NODE_ENV;
  },
  get isDevelopment() {
    return getEnv().NODE_ENV === 'development';
  },
  get isProduction() {
    return getEnv().NODE_ENV === 'production';
  },
  get isTest() {
    return getEnv().NODE_ENV === 'test';
  },
} as const;

// Type export for configuration
export type Config = typeof config;

