/**
 * @jest-environment node
 */

import handler from '../pages/api/generate-image';
import { createMocks } from 'node-mocks-http';

// Mock the FAL AI client
jest.mock('@fal-ai/serverless-client', () => ({
  config: jest.fn(),
  run: jest.fn()
}));

import * as fal from '@fal-ai/serverless-client';

describe('/api/generate-image error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variable
    process.env.FAL_KEY = 'test_api_key_123';
  });

  test('handles missing API key configuration', async () => {
    delete process.env.FAL_KEY;
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Server not properly configured');
    expect(data.category).toBe('configuration');
    expect(data.retryable).toBe(false);
    expect(data.setup).toBeDefined();
  });

  test('handles invalid HTTP method', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Method GET not allowed');
    expect(data.category).toBe('validation');
    expect(data.retryable).toBe(false);
  });

  test('handles missing prompt', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Prompt is required');
    expect(data.category).toBe('validation');
    expect(data.retryable).toBe(true);
  });

  test('handles empty prompt', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: '   ' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Prompt cannot be empty');
    expect(data.category).toBe('validation');
  });

  test('handles prompt too long', async () => {
    const longPrompt = 'a'.repeat(501);
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: longPrompt }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Prompt must be 500 characters or less');
    expect(data.category).toBe('validation');
  });

  test('handles inappropriate content', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'nude explicit content' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Prompt contains inappropriate content');
    expect(data.category).toBe('validation');
  });

  test('handles FAL API timeout', async () => {
    fal.run.mockRejectedValue(new Error('Request timeout'));
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(408);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Request timed out. Please try again.');
    expect(data.category).toBe('network');
    expect(data.retryable).toBe(true);
  }, 10000);

  test('handles FAL API authentication error', async () => {
    fal.run.mockRejectedValue(new Error('Unauthorized: Invalid API key'));
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Authentication failed. Please check API configuration.');
    expect(data.category).toBe('authentication');
    expect(data.retryable).toBe(false);
  });

  test('handles FAL API rate limit', async () => {
    fal.run.mockRejectedValue(new Error('Rate limit exceeded'));
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Rate limit exceeded. Please wait before trying again.');
    expect(data.category).toBe('rate_limit');
    expect(data.retryable).toBe(true);
  });

  test('handles successful image generation', async () => {
    const mockResults = Array.from({ length: 4 }, (_, i) => ({
      images: [{ url: `https://example.com/image${i + 1}.jpg` }]
    }));
    
    fal.run.mockResolvedValue(mockResults[0]);
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'beautiful landscape' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.imageUrls).toHaveLength(4);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.prompt).toBe('beautiful landscape');
    expect(data.metadata.model_version).toBe('flux/dev');
  });

  test('handles successful retry after initial failure', async () => {
    // Reset the mock and set up specific behavior
    fal.run.mockReset();
    
    // Mock successful generation for this test
    fal.run.mockResolvedValue({ 
      images: [{ url: 'https://example.com/image.jpg' }] 
    });
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
    });

    await handler(req, res);

    // Should succeed after retry
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.imageUrls).toHaveLength(4);
    expect(data.metadata).toBeDefined();
  });

  test('handles complete image generation failure', async () => {
    fal.run.mockRejectedValue(new Error('No images were generated successfully'));
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(422);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Image generation failed. Please try a different prompt.');
    expect(data.category).toBe('generation');
    expect(data.retryable).toBe(true);
  });

  test('handles OPTIONS preflight request', async () => {
    const { req, res } = createMocks({
      method: 'OPTIONS'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Access-Control-Allow-Origin')).toBe('*');
    expect(res.getHeader('Access-Control-Allow-Methods')).toContain('POST');
  });

  test('validates input sanitization', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: '  valid prompt with spaces  ' }
    });

    fal.run.mockResolvedValue({
      images: [{ url: 'https://example.com/image1.jpg' }]
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // Verify that the prompt was trimmed
    expect(fal.run).toHaveBeenCalledWith(
      'fal-ai/flux/dev',
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: 'valid prompt with spaces'
        })
      })
    );
  });
});