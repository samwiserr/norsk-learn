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

  it('allows blank OpenAI/Azure keys in development without crashing', () => {
    process.env.NODE_ENV = 'development';
    process.env.GEMINI_API_KEY = 'dummy-gemini';

    const { config } = require('../config');

    expect(config.openai.apiKey).toBe('');
    expect(config.azureSpeech.key).toBe('');
    expect(config.azureSpeech.region).toBe('');
  });

  it('reads provided OpenAI/Azure keys when set', () => {
    process.env.NODE_ENV = 'development';
    process.env.GEMINI_API_KEY = 'dummy-gemini';
    process.env.OPENAI_API_KEY = 'sk-openai';
    process.env.OPENAI_REALTIME_MODEL = 'custom-model';
    process.env.AZURE_SPEECH_KEY = 'azure-key';
    process.env.AZURE_SPEECH_REGION = 'norwayeast';
    process.env.AZURE_SPEECH_TOKEN_URL = 'https://custom/token';

    const { config } = require('../config');

    expect(config.openai.apiKey).toBe('sk-openai');
    expect(config.openai.realtimeModel).toBe('custom-model');
    expect(config.azureSpeech.key).toBe('azure-key');
    expect(config.azureSpeech.region).toBe('norwayeast');
    expect(config.azureSpeech.tokenUrl).toBe('https://custom/token');
  });
});


