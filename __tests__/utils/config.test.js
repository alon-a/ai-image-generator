/**
 * Tests for utils/config.js
 */

const {
  getConfig,
  getFalApiKey,
  isConfigured,
  validateConfig,
  getSetupInstructions,
  isDevelopment,
  isProduction,
  DEFAULT_CONFIG
} = require('../../utils/config');

describe('Config Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getFalApiKey', () => {
    test('should return API key from environment', () => {
      process.env.FAL_KEY = 'test_key_123';
      expect(getFalApiKey()).toBe('test_key_123');
    });

    test('should return null when API key is not set', () => {
      delete process.env.FAL_KEY;
      expect(getFalApiKey()).toBeNull();
    });
  });

  describe('isConfigured', () => {
    test('should return true when valid API key is set', () => {
      process.env.FAL_KEY = 'valid_api_key';
      expect(isConfigured()).toBe(true);
    });

    test('should return false when API key is not set', () => {
      delete process.env.FAL_KEY;
      expect(isConfigured()).toBe(false);
    });

    test('should return false when API key is placeholder', () => {
      process.env.FAL_KEY = 'your_fal_api_key_here';
      expect(isConfigured()).toBe(false);
    });
  });

  describe('getConfig', () => {
    test('should return complete configuration object', () => {
      process.env.FAL_KEY = 'test_key';
      const config = getConfig();

      expect(config).toHaveProperty('fal');
      expect(config).toHaveProperty('app');
      expect(config.fal).toHaveProperty('apiKey', 'test_key');
      expect(config.fal).toHaveProperty('model', DEFAULT_CONFIG.fal.model);
      expect(config.fal).toHaveProperty('timeout', DEFAULT_CONFIG.fal.timeout);
      expect(config.app).toHaveProperty('maxPromptLength', DEFAULT_CONFIG.app.maxPromptLength);
    });

    test('should include null API key when not set', () => {
      delete process.env.FAL_KEY;
      const config = getConfig();
      expect(config.fal.apiKey).toBeNull();
    });
  });

  describe('validateConfig', () => {
    test('should not throw when configuration is valid', () => {
      process.env.FAL_KEY = 'valid_api_key';
      expect(() => validateConfig()).not.toThrow();
    });

    test('should throw when API key is missing', () => {
      delete process.env.FAL_KEY;
      expect(() => validateConfig()).toThrow('FAL_KEY environment variable is required');
    });

    test('should throw when API key is placeholder', () => {
      process.env.FAL_KEY = 'your_fal_api_key_here';
      expect(() => validateConfig()).toThrow('Please set a valid FAL_KEY in your environment variables');
    });
  });

  describe('getSetupInstructions', () => {
    test('should return setup instructions object', () => {
      const instructions = getSetupInstructions();
      
      expect(instructions).toHaveProperty('message');
      expect(instructions).toHaveProperty('steps');
      expect(instructions).toHaveProperty('documentation');
      expect(Array.isArray(instructions.steps)).toBe(true);
      expect(instructions.steps.length).toBeGreaterThan(0);
    });
  });

  describe('environment checks', () => {
    test('isDevelopment should return true in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
    });

    test('isDevelopment should return false in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });

    test('isProduction should return true in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    test('isProduction should return false in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    test('should have required configuration structure', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('fal');
      expect(DEFAULT_CONFIG).toHaveProperty('app');
      expect(DEFAULT_CONFIG.fal).toHaveProperty('model');
      expect(DEFAULT_CONFIG.fal).toHaveProperty('timeout');
      expect(DEFAULT_CONFIG.fal).toHaveProperty('retryAttempts');
      expect(DEFAULT_CONFIG.app).toHaveProperty('maxPromptLength');
      expect(DEFAULT_CONFIG.app).toHaveProperty('imagesPerGeneration');
    });

    test('should have reasonable default values', () => {
      expect(DEFAULT_CONFIG.fal.timeout).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.fal.retryAttempts).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.app.maxPromptLength).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.app.imagesPerGeneration).toBeGreaterThan(0);
    });
  });
});