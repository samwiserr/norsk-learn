/**
 * Centralized configuration management with validation
 * All environment variables are validated on import
 */

import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
  // Firebase Configuration (public - exposed to client)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API Key is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase Auth Domain is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase Project ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'Firebase Storage Bucket is required'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'Firebase Messaging Sender ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase App ID is required'),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),

  // Gemini API (server-side only)
  GEMINI_API_KEY: z.string().min(1, 'Gemini API Key is required'),

  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      const errorMessage = 
        `Missing or invalid environment variables: ${missingVars}\n` +
        'Please check your .env.local file and ensure all required variables are set.\n' +
        'See .env.example for reference.';
      
      // In production runtime (not build), throw error
      if (process.env.NODE_ENV === 'production' && !isBuildTime) {
        throw new Error(errorMessage);
      }
      
      // In development or build time, log warning but allow fallback values
      // Suppress warnings during build to avoid build failures
      if (!isBuildTime && process.env.NODE_ENV !== 'test') {
        console.warn('⚠️  Environment configuration warning:', errorMessage);
        console.warn('⚠️  Using fallback values. This should not happen in production.');
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

