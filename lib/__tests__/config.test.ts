import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';

describe('config env validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('allows blank optional keys in development without crashing', () => {
    process.env.NODE_ENV = 'development';
    process.env.GEMINI_API_KEY = 'dummy-gemini';

    const { config } = require('../config');

    expect(config.gemini.apiKey).toBe('dummy-gemini');
    expect(config.stripe.secretKey).toBe('');
  });

  it('reads provided Gemini key when set', () => {
    process.env.NODE_ENV = 'development';
    process.env.GEMINI_API_KEY = 'real-gemini-key';

    const { config } = require('../config');

    expect(config.gemini.apiKey).toBe('real-gemini-key');
  });
});
