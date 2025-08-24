/**
 * Tests for enhanced API validation functionality
 */

import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/generate-image';

// Mock the FAL AI client
jest.mock('@fal-ai/serverless-client', () => ({
  config: jest.fn(),
  run: jest.fn()
}));

// Mock the utilities
jest.mock('../utils/config', () => ({
  getConfig: () => ({
    fal: {
      apiKey: 'test-api-key',
      model: 'fal-ai/flux/dev',
      timeout: 30000,
      retryAttempts: 3
    },
    app: {
      maxPromptLength: 500,
      imagesPerGeneration: 4,
      rateLimitPerMinute: 100 // High limit to avoid rate limiting in tests
    }
  }),
  isConfigured: () => true,
  validateConfig: () => {},
  getSetupInstructions: () => ({
    message: 'Setup instructions',
    steps: ['Step 1', 'Step 2']
  })
}));

describe('/api/generate-image enhanced validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('input validation', () => {
    test('should validate prompt length', async () => {
      const longPrompt = 'a'.repeat(501); // Exceeds 500 character limit
      
      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: longPrompt }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('500 characters or less');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('prompt');
      expect(responseData.code).toBe('TOO_LONG');
    });

    test('should validate prompt content for inappropriate material', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'nude person in explicit pose' }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Prompt contains inappropriate content');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('prompt');
      expect(responseData.code).toBe('INAPPROPRIATE_CONTENT');
    });

    test('should validate empty prompt', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: '   ' } // Only whitespace
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Prompt cannot be empty');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('prompt');
      expect(responseData.code).toBe('EMPTY');
    });

    test('should validate missing prompt', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {} // No prompt field
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Prompt is required');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('prompt');
      expect(responseData.code).toBe('REQUIRED');
    });

    test('should validate prompt type', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 123 } // Number instead of string
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Prompt must be a string');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('prompt');
      expect(responseData.code).toBe('INVALID_TYPE');
    });

    test('should validate request body structure', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: 'invalid string body' // Invalid body type
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Request body must be an object');
      expect(responseData.category).toBe('validation');
      expect(responseData.code).toBe('INVALID_BODY');
    });
  });

  describe('options validation', () => {
    test('should validate seed option', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { 
          prompt: 'test prompt',
          options: { seed: -1 } // Invalid negative seed
        }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Seed must be a non-negative integer');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('options.seed');
      expect(responseData.code).toBe('INVALID_SEED');
    });

    test('should validate num_images option', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { 
          prompt: 'test prompt',
          options: { num_images: 15 } // Exceeds maximum of 10
        }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Number of images must be between 1 and 10');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('options.num_images');
      expect(responseData.code).toBe('INVALID_COUNT');
    });

    test('should validate image_size option', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { 
          prompt: 'test prompt',
          options: { 
            image_size: { width: 100, height: 100 } // Too small
          }
        }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Image dimensions must be between 256 and 2048 pixels');
      expect(responseData.category).toBe('validation');
      expect(responseData.field).toBe('options.image_size');
      expect(responseData.code).toBe('INVALID_SIZE');
    });

    test('should accept valid options', async () => {
      const fal = require('@fal-ai/serverless-client');
      fal.run.mockResolvedValue({
        images: [{ url: 'https://example.com/image1.jpg' }]
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { 
          prompt: 'test prompt',
          options: {
            seed: 12345,
            num_images: 2,
            image_size: { width: 512, height: 512 }
          }
        }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      
      // Verify FAL was called with the correct options
      expect(fal.run).toHaveBeenCalledWith(
        'fal-ai/flux/dev',
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: 'test prompt',
            seed: expect.any(Number),
            image_size: { width: 512, height: 512 }
          })
        })
      );
    });
  });

  describe('HTTP method validation', () => {
    test('should reject GET requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(405);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Method GET not allowed');
      expect(responseData.category).toBe('validation');
    });

    test('should reject PUT requests', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(405);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Method PUT not allowed');
      expect(responseData.category).toBe('validation');
    });

    test('should accept POST requests', async () => {
      const fal = require('@fal-ai/serverless-client');
      fal.run.mockResolvedValue({
        images: [{ url: 'https://example.com/image1.jpg' }]
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
    });

    test('should handle OPTIONS requests for CORS', async () => {
      const { req, res } = createMocks({
        method: 'OPTIONS'
      });

      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      
      // Check CORS headers
      const headers = res._getHeaders();
      expect(headers['access-control-allow-origin']).toBe('*');
      expect(headers['access-control-allow-methods']).toContain('POST');
    });
  });

  // Configuration validation is tested through integration tests
  // and the config utility has its own unit tests
});