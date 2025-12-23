/**
 * Application-wide constants
 * Centralized location for all magic numbers and configuration values
 */

/**
 * Authentication constants
 */
export const AUTH_REQUIRED_MESSAGE_COUNT = 5;
export const AUTH_WARNING_MESSAGE_COUNT = 3;

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
  USER: "norsk_user",
  USER_MESSAGE_COUNT: "norsk_user_message_count",
} as const;

/**
 * Session storage keys
 */
export const SESSION_STORAGE_KEYS = {
  FROM_LEVEL_SELECTION: "norsk_from_level_selection",
} as const;

/**
 * Custom event names
 */
export const CUSTOM_EVENTS = {
  LANGUAGE_RELOAD: "language-reload",
  LEVEL_RELOAD: "level-reload",
  CHECK_LEVEL_SELECTION_FLAG: "check-level-selection-flag",
  AUTH_REQUIRED: "auth-required",
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

