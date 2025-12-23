/**
 * Input sanitization utilities
 * Provides functions to sanitize and validate user input to prevent XSS and injection attacks
 */

import validator from 'validator';

/**
 * Sanitize string input by removing potentially dangerous characters
 * @param input - The input string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    trim?: boolean;
  } = {}
): string {
  const { maxLength = 10000, allowHtml = false, trim = true } = options;

  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // If HTML is not allowed, escape HTML entities
  if (!allowHtml) {
    sanitized = validator.escape(sanitized);
  } else {
    // If HTML is allowed, still sanitize dangerous tags
    sanitized = validator.stripLow(sanitized, true);
  }

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize user message input
 * @param input - User message input
 * @returns Sanitized message or throws error if invalid
 */
export function sanitizeUserMessage(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('User message must be a string');
  }

  if (input.length === 0) {
    throw new Error('User message cannot be empty');
  }

  // Allow longer messages for chat (up to 5000 characters)
  const sanitized = sanitizeString(input, {
    maxLength: 5000,
    allowHtml: false,
    trim: true,
  });

  if (sanitized.length === 0) {
    throw new Error('User message cannot be empty after sanitization');
  }

  return sanitized;
}

/**
 * Validate and sanitize email input
 * @param email - Email address to validate
 * @returns Sanitized email or throws error if invalid
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }

  const trimmed = email.trim().toLowerCase();

  if (!validator.isEmail(trimmed)) {
    throw new Error('Invalid email format');
  }

  return trimmed;
}

/**
 * Validate and sanitize password input
 * @param password - Password to validate
 * @param minLength - Minimum password length (default: 6)
 * @returns Sanitized password or throws error if invalid
 */
export function sanitizePassword(
  password: unknown,
  minLength: number = 6
): string {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  if (password.length < minLength) {
    throw new Error(`Password must be at least ${minLength} characters`);
  }

  // Don't escape passwords, but validate they don't contain null bytes
  if (password.includes('\0')) {
    throw new Error('Password contains invalid characters');
  }

  return password;
}

/**
 * Validate CEFR level input
 * @param level - CEFR level to validate
 * @returns Validated level or throws error if invalid
 */
export function sanitizeCEFRLevel(level: unknown): string {
  if (typeof level !== 'string') {
    throw new Error('CEFR level must be a string');
  }

  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const upperLevel = level.toUpperCase().trim();

  if (!validLevels.includes(upperLevel)) {
    throw new Error(`Invalid CEFR level. Must be one of: ${validLevels.join(', ')}`);
  }

  return upperLevel;
}

/**
 * Validate language code input
 * @param code - Language code to validate
 * @returns Validated code or throws error if invalid
 */
export function sanitizeLanguageCode(code: unknown): string {
  if (typeof code !== 'string') {
    throw new Error('Language code must be a string');
  }

  const validCodes = ['en', 'no', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'fi', 'pl', 'uk'];
  const lowerCode = code.toLowerCase().trim();

  if (!validCodes.includes(lowerCode)) {
    throw new Error(`Invalid language code. Must be one of: ${validCodes.join(', ')}`);
  }

  return lowerCode;
}

