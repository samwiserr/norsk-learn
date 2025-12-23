import {
  sanitizeString,
  sanitizeUserMessage,
  sanitizeEmail,
  sanitizePassword,
  sanitizeCEFRLevel,
  sanitizeLanguageCode,
} from '../input-sanitization';

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove null bytes', () => {
      expect(sanitizeString('hello\0world')).toBe('helloworld');
    });

    it('should escape HTML by default', () => {
      const result = sanitizeString('<script>alert("xss")</script>');
      // Validator escapes HTML entities, forward slash may be escaped as &#x2F;
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&quot;xss&quot;');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert("xss")');
    });

    it('should enforce max length', () => {
      const longString = 'a'.repeat(200);
      expect(sanitizeString(longString, { maxLength: 100 })).toHaveLength(100);
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeString(null as any)).toThrow('Input must be a string');
    });
  });

  describe('sanitizeUserMessage', () => {
    it('should sanitize valid message', () => {
      const result = sanitizeUserMessage('Hello, how are you?');
      expect(result).toBe('Hello, how are you?');
    });

    it('should throw error for empty string', () => {
      expect(() => sanitizeUserMessage('')).toThrow('User message cannot be empty');
    });

    it('should throw error for non-string', () => {
      expect(() => sanitizeUserMessage(null as any)).toThrow('User message must be a string');
    });

    it('should allow longer messages', () => {
      const longMessage = 'a'.repeat(1000);
      expect(sanitizeUserMessage(longMessage)).toBe(longMessage);
    });

    it('should sanitize XSS attempts', () => {
      const xss = '<script>alert("xss")</script>';
      const result = sanitizeUserMessage(xss);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and sanitize valid email', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should throw error for invalid email', () => {
      expect(() => sanitizeEmail('not-an-email')).toThrow('Invalid email format');
    });

    it('should throw error for non-string', () => {
      expect(() => sanitizeEmail(null as any)).toThrow('Email must be a string');
    });
  });

  describe('sanitizePassword', () => {
    it('should validate password length', () => {
      expect(sanitizePassword('password123')).toBe('password123');
    });

    it('should throw error for short password', () => {
      expect(() => sanitizePassword('short')).toThrow('Password must be at least 6 characters');
    });

    it('should throw error for password with null bytes', () => {
      expect(() => sanitizePassword('pass\0word')).toThrow('Password contains invalid characters');
    });

    it('should throw error for non-string', () => {
      expect(() => sanitizePassword(null as any)).toThrow('Password must be a string');
    });
  });

  describe('sanitizeCEFRLevel', () => {
    it('should validate valid CEFR levels', () => {
      expect(sanitizeCEFRLevel('A1')).toBe('A1');
      expect(sanitizeCEFRLevel('a1')).toBe('A1');
      expect(sanitizeCEFRLevel('  C2  ')).toBe('C2');
    });

    it('should throw error for invalid level', () => {
      expect(() => sanitizeCEFRLevel('A3')).toThrow('Invalid CEFR level');
    });

    it('should throw error for non-string', () => {
      expect(() => sanitizeCEFRLevel(null as any)).toThrow('CEFR level must be a string');
    });
  });

  describe('sanitizeLanguageCode', () => {
    it('should validate valid language codes', () => {
      expect(sanitizeLanguageCode('en')).toBe('en');
      expect(sanitizeLanguageCode('EN')).toBe('en');
      expect(sanitizeLanguageCode('  no  ')).toBe('no');
    });

    it('should throw error for invalid code', () => {
      expect(() => sanitizeLanguageCode('xx')).toThrow('Invalid language code');
    });

    it('should throw error for non-string', () => {
      expect(() => sanitizeLanguageCode(null as any)).toThrow('Language code must be a string');
    });
  });
});

