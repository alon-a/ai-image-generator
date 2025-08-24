/**
 * Tests for API rate limiting functionality
 */

import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/generate-image';
import { resetRateLimit } from '../utils/rateLimiter';

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
      rateLimitPerMinute: 3 // Low limit for testing
    }
  }),
  isConfigured: () => true,
  validateConfig: () => {},
  getSetupInstructions: () => ({
    message: 'Setup instructions',
    steps: ['Step 1', 'Step 2']
  })
}));

describe('/api/generate-image rate limiting', () => {
  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimit('127.0.0.1');
    resetRateLimit('::1');
    resetRateLimit('unknown');
    resetRateLimit('192.168.1.1');
    resetRateLimit('192.168.1.2');
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  test('should allow requests within rate limit', async () => {
    const fal = require('@fal-ai/serverless-client');
    fal.run.mockResolvedValue({
      images: [{ url: 'https://example.com/image1.jpg' }]
    });

    // First request should succeed
    const { req: req1, res: res1 } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' },
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    await handler(req1, res1);
    expect(res1._getStatusCode()).toBe(200);
    expect(res1._getHeaders()['x-ratelimit-remaining']).toBe('2');

    // Second request should also succeed
    const { req: req2, res: res2 } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt 2' },
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    await handler(req2, res2);
    expect(res2._getStatusCode()).toBe(200);
    expect(res2._getHeaders()['x-ratelimit-remaining']).toBe('1');
  });

  test('should block requests when rate limit exceeded', async () => {
    const fal = require('@fal-ai/serverless-client');
    fal.run.mockResolvedValue({
      images: [{ url: 'https://example.com/image1.jpg' }]
    });

    // Use up the rate limit (3 requests)
    for (let i = 0; i < 3; i++) {
      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: `test prompt ${i}` },
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }

    // Fourth request should be rate limited
    const { req: req4, res: res4 } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt 4' },
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    await handler(req4, res4);
    expect(res4._getStatusCode()).toBe(429);
    
    const responseData = JSON.parse(res4._getData());
    expect(responseData.error).toBe('Too many requests. Please wait before trying again.');
    expect(responseData.category).toBe('rate_limit');
    expect(responseData.retryable).toBe(true);
    expect(responseData.retryAfter).toBeGreaterThan(0);
    
    // Check rate limit headers
    expect(res4._getHeaders()['x-ratelimit-remaining']).toBe('0');
    expect(res4._getHeaders()['retry-after']).toBeDefined();
  });

  test('should handle different IPs separately', async () => {
    const fal = require('@fal-ai/serverless-client');
    fal.run.mockResolvedValue({
      images: [{ url: 'https://example.com/image1.jpg' }]
    });

    // Use up rate limit for first IP
    for (let i = 0; i < 3; i++) {
      const { req, res } = createMocks({
        method: 'POST',
        body: { prompt: `test prompt ${i}` },
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }

    // First IP should be rate limited
    const { req: req1, res: res1 } = createMocks({
      method: 'POST',
      body: { prompt: 'blocked prompt' },
      headers: { 'x-forwarded-for': '192.168.1.1' }
    });

    await handler(req1, res1);
    expect(res1._getStatusCode()).toBe(429);

    // Second IP should still work
    const { req: req2, res: res2 } = createMocks({
      method: 'POST',
      body: { prompt: 'allowed prompt' },
      headers: { 'x-forwarded-for': '192.168.1.2' }
    });

    await handler(req2, res2);
    expect(res2._getStatusCode()).toBe(200);
    expect(res2._getHeaders()['x-ratelimit-remaining']).toBe('2');
  });

  test('should include rate limit headers in all responses', async () => {
    const fal = require('@fal-ai/serverless-client');
    fal.run.mockResolvedValue({
      images: [{ url: 'https://example.com/image1.jpg' }]
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' },
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    await handler(req, res);
    
    const headers = res._getHeaders();
    expect(headers['x-ratelimit-limit']).toBe('3');
    expect(headers['x-ratelimit-remaining']).toBe('2');
    expect(headers['x-ratelimit-reset']).toBeDefined();
    
    // Verify reset time is a valid ISO string
    expect(() => new Date(headers['x-ratelimit-reset'])).not.toThrow();
  });

  test('should handle missing IP address gracefully', async () => {
    const fal = require('@fal-ai/serverless-client');
    fal.run.mockResolvedValue({
      images: [{ url: 'https://example.com/image1.jpg' }]
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
      // No IP headers
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    
    const headers = res._getHeaders();
    expect(headers['x-ratelimit-limit']).toBe('3');
    expect(headers['x-ratelimit-remaining']).toBe('2');
  });

  test('should not rate limit OPTIONS requests', async () => {
    // Make multiple OPTIONS requests
    for (let i = 0; i < 5; i++) {
      const { req, res } = createMocks({
        method: 'OPTIONS',
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }

    // POST request should still work (rate limit not affected by OPTIONS)
    const fal = require('@fal-ai/serverless-client');
    fal.run.mockResolvedValue({
      images: [{ url: 'https://example.com/image1.jpg' }]
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' },
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['x-ratelimit-remaining']).toBe('2');
  });
});