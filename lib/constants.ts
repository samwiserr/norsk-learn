/**
 * Application-wide constants
 * Centralized location for all magic numbers and configuration values
 */

/**
 * Authentication constants
 * Soft nudge at NUDGE; hard block for anonymous users at HARD_GATE
 */
export const AUTH_NUDGE_MESSAGE_COUNT = 3;
export const AUTH_HARD_GATE_MESSAGE_COUNT = 50;
/** @deprecated Use AUTH_HARD_GATE_MESSAGE_COUNT — kept for any legacy imports */
export const AUTH_REQUIRED_MESSAGE_COUNT = AUTH_HARD_GATE_MESSAGE_COUNT;
export const AUTH_WARNING_MESSAGE_COUNT = AUTH_NUDGE_MESSAGE_COUNT;

/**
 * UI/UX constants
 */
export const SCROLL_THRESHOLD = 100; // pixels from bottom to trigger auto-scroll
export const WELCOME_MESSAGE_DELAY = 300; // milliseconds delay before showing welcome message
export const LEVEL_SELECTION_FLAG_CHECK_INTERVAL = 1000; // milliseconds between flag checks
export const LANGUAGE_RELOAD_DELAY = 100; // milliseconds delay for language reload on route change

/**
 * API/Network constants
 */
export const MAX_RETRIES = 3;
export const BASE_DELAY = 1000; // milliseconds base delay for retry logic
export const MAX_DELAY = 10000; // maximum delay for retry logic
export const MAX_INPUT_LENGTH = 1000; // maximum characters for user input
export const MAX_EMAIL_LENGTH = 255; // maximum characters for email input

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  CEFR_LEVEL: "norsk_cefr_level",
  UI_LANGUAGE: "norsk_ui_language",
  THEME: "norsk_theme",
  SESSIONS: "norsk_sessions",
  /** Last-write-wins clock for session bundle (local vs server restore). */
  SESSION_BUNDLE_UPDATED_AT: "norsk_session_bundle_updated_at",
  USER: "norsk_user",
  USER_MESSAGE_COUNT: "norsk_user_message_count",
  HIGH_CONTRAST: "norsk_high_contrast",
} as const;

/**
 * Session storage keys
 */
export const SESSION_STORAGE_KEYS = {
  FROM_LEVEL_SELECTION: "norsk_from_level_selection",
  RETURN_PATH: "norsk_return_path",
  /** Once per browser tab/session — avoid repeat AUTH_NUDGE events */
  AUTH_NUDGE_SHOWN: "norsk_auth_nudge_shown",
} as const;

/**
 * Custom event names
 */
export const CUSTOM_EVENTS = {
  LANGUAGE_RELOAD: "language-reload",
  LEVEL_RELOAD: "level-reload",
  CHECK_LEVEL_SELECTION_FLAG: "check-level-selection-flag",
  /** Non-blocking: show dismissible sign-in banner; conversation continues */
  AUTH_NUDGE: "auth-nudge",
  AUTH_REQUIRED: "auth-required",
} as const;

/**
 * CEFR progression engine (client-side heuristics; configurable)
 */
export const CEFR_PROGRESSION = {
  MASTERY_WINDOW: 20,
  /** Suggest level up when must-fix rate in window is at or below this */
  MASTERY_MAX_MUST_FIX_RATE: 0.05,
  STRUGGLE_WINDOW: 10,
  STRUGGLE_MIN_MUST_FIX_RATE: 0.4,
  PLATEAU_WINDOW: 30,
  /** Minimum samples before suggesting level change */
  MIN_SAMPLES_LEVEL_CHANGE: 12,
  /** For plateau: min fraction of graded exercise turns with no improvement signal */
  PLATEAU_EXERCISE_MIN_RATE: 0.5,
} as const;

export const SESSION_STORAGE_KEYS_PROGRESS = {
  DISMISS_LEVEL_SUGGESTION: "norsk_dismiss_progress_suggestion",
} as const;

/**
 * Progress calculation constants
 */
export const PROGRESS_DELTA_RANGE = {
  MIN: -2.0,
  MAX: 2.0,
} as const;

/**
 * Multi-tab sync event types
 */
export const SYNC_EVENT_TYPES = {
  SESSION_UPDATED: "SESSION_UPDATED",
} as const;

