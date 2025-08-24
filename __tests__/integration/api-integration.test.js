/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/generate-image';

// Mock the FAL AI client
jest.mock('@fal-ai/serverless-client', () => ({
  config: jest.fn(),
  run: jest.fn()
}));

// Mock utilities with realistic implementations
jest.mock('../../utils/config', () => ({
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
      rateLimitPerMinute: 100
    }
  }),
  isConfigured: () => true,
  validateConfig: () => {},
  getSetupInstructions: () => ({
    message: 'Setup instructions',
    steps: ['Step 1', 'Step 2']
  })
}));

jest.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, remaining: 10 })),
  getRateLimitInfo: jest.fn(() => ({ limit: 100, remaining: 10, resetTime: Date.now() + 60000 }))
}));

import * as fal from '@fal-ai/serverless-client';
import { checkRateLimit } from '../../utils/rateLimiter';

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  });

  describe('Complete API Workflow', () => {
    test('should handle complete successful image generation workflow', async () => {
      // Mock successful FAL response
      fal.run.mockResolvedValue({
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/image2.jpg' },
          { url: 'https://example.com/image3.jpg' },
          { url: 'https://example.com/image4.jpg' }
        ]
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1'
        },
        body: {
          prompt: 'A beautiful sunset over mountains',
          options: {
            seed: 12345,
            num_images: 4
          }
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('imageUrls');
      expect(responseData).toHaveProperty('metadata');
      expect(responseData).toHaveProperty('generationId');
      
      expect(responseData.imageUrls).toHaveLength(4);
      expect(responseData.metadata.prompt).toBe('A beautiful sunset over mountains');
      expect(responseData.metadata.model_version).toBe('flux/dev');
      expect(responseData.metadata.generation_time).toBeGreaterThan(0);
      
      // Verify FAL was called correctly
      expect(fal.run).toHaveBeenCalledWith(
        'fal-ai/flux/dev',
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: 'A beautiful sunset over mountains',
            seed: expect.any(Number)
          })
        })
      );
    });

    test('should handle rate limiting correctly', async () => {
      checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0 });

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' },
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(429);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Rate limit exceeded');
      expect(responseData.category).toBe('rate_limit');
      expect(responseData.retryable).toBe(true);
    });

    test('should handle FAL API failures with retry logic', async () => {
      // Mock FAL to fail first few times, then succeed
      fal.run
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValueOnce({
          images: [{ url: 'https://example.com/success.jpg' }]
        });

      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(fal.run).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    test('should handle complete FAL API failure after retries', async () => {
      // Mock FAL to always fail
      fal.run.mockRejectedValue(new Error('Persistent failure'));

      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(422);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Image generation failed');
      expect(responseData.category).toBe('generation');
      expect(responseData.retryable).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle malformed FAL responses', async () => {
      fal.run.mockResolvedValue({
        // Missing images array
        metadata: { some: 'data' }
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(422);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Invalid response from image generation service');
    });

    test('should handle partial image generation success', async () => {
      fal.run.mockResolvedValue({
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: null }, // Failed image
          { url: 'https://example.com/image3.jpg' }
        ]
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      // Should filter out failed images
      expect(responseData.imageUrls).toHaveLength(2);
      expect(responseData.imageUrls).not.toContain(null);
    });

    test('should handle network timeouts', async () => {
      fal.run.mockRejectedValue(new Error('Request timeout'));

      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(408);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Request timed out');
      expect(responseData.category).toBe('network');
      expect(responseData.retryable).toBe(true);
    });
  });

  describe('Security and Validation Integration', () => {
    test('should sanitize and validate input end-to-end', async () => {
      fal.run.mockResolvedValue({
        images: [{ url: 'https://example.com/image.jpg' }]
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          prompt: '  A clean prompt with extra spaces  ',
          options: {
            seed: '12345', // String that should be converted to number
            num_images: '2' // String that should be converted to number
          }
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      // Verify input was sanitized
      expect(fal.run).toHaveBeenCalledWith(
        'fal-ai/flux/dev',
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: 'A clean prompt with extra spaces', // Trimmed
            seed: expect.any(Number) // Converted to number
          })
        })
      );
    });

    test('should reject requests with suspicious content', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          prompt: 'explicit sexual content with nudity'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Inappropriate content');
      expect(responseData.category).toBe('validation');
    });

    test('should handle CORS preflight requests', async () => {
      const { req, res } = createMocks({
        method: 'OPTIONS',
        headers: {
          'origin': 'https://example.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const headers = res._getHeaders();
      expect(headers['access-control-allow-origin']).toBe('*');
      expect(headers['access-control-allow-methods']).toContain('POST');
      expect(headers['access-control-allow-headers']).toContain('Content-Type');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should include performance metrics in response', async () => {
      fal.run.mockResolvedValue({
        images: [{ url: 'https://example.com/image.jpg' }]
      });

      const startTime = Date.now();
      
      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.metadata.generation_time).toBeGreaterThan(0);
      expect(responseData.metadata.generation_time).toBeLessThan(Date.now() - startTime + 1000);
    });

    test('should handle concurrent requests', async () => {
      fal.run.mockResolvedValue({
        images: [{ url: 'https://example.com/image.jpg' }]
      });

      // Create multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'POST',
          headers: { 'x-forwarded-for': `127.0.0.${i + 1}` },
          body: { prompt: `test prompt ${i}` }
        });
        return handler(req, res).then(() => ({ req, res }));
      });

      const results = await Promise.all(requests);

      // All requests should succeed
      results.forEach(({ res }) => {
        expect(res._getStatusCode()).toBe(200);
      });

      // FAL should be called for each request
      expect(fal.run).toHaveBeenCalledTimes(5);
    });
  });

  describe('Configuration Integration', () => {
    test('should handle missing configuration gracefully', async () => {
      // Mock config to return unconfigured state
      const { isConfigured } = require('../../utils/config');
      jest.mocked(isConfigured).mockReturnValue(false);

      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: 'test prompt' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('not configured');
      expect(responseData.category).toBe('configuration');
      expect(responseData.setup).toBeDefined();
    });
  });
});