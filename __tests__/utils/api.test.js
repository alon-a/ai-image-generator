/**
 * Tests for utils/api.js
 */

const {
  ApiError,
  RateLimiter,
  createApiClient,
  checkRateLimit,
  getClientIdentifier,
  retryWithBackoff,
  handleApiError,
  isRetryableError,
  sleep,
  calculateBackoffDelay
} = require('../../utils/api');

// Mock fetch for testing
global.fetch = jest.fn();

describe('API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('ApiError', () => {
    test('should create error with all properties', () => {
      const error = new ApiError('Test error', 404, 'NOT_FOUND', true);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('ApiError');
    });

    test('should create error with default values', () => {
      const error = new ApiError('Test error');
      expect(error.status).toBe(500);
      expect(error.code).toBeNull();
      expect(error.retryable).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter();
    });

    test('should allow requests under limit', () => {
      expect(rateLimiter.isRateLimited('user1', 5)).toBe(false);
      expect(rateLimiter.isRateLimited('user1', 5)).toBe(false);
    });

    test('should block requests over limit', () => {
      // Make requests up to limit
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isRateLimited('user1', 5)).toBe(false);
      }
      
      // Next request should be blocked
      expect(rateLimiter.isRateLimited('user1', 5)).toBe(true);
    });

    test('should track different users separately', () => {
      // User1 makes requests up to limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isRateLimited('user1', 5);
      }
      
      // User2 should still be allowed
      expect(rateLimiter.isRateLimited('user2', 5)).toBe(false);
    });

    test('should clear rate limit data', () => {
      // Make requests up to limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isRateLimited('user1', 5);
      }
      
      // Clear and verify
      rateLimiter.clearRateLimit('user1');
      expect(rateLimiter.isRateLimited('user1', 5)).toBe(false);
    });
  });

  describe('sleep', () => {
    test('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });

  describe('calculateBackoffDelay', () => {
    test('should calculate exponential backoff', () => {
      expect(calculateBackoffDelay(1, 1000)).toBe(1000);
      expect(calculateBackoffDelay(2, 1000)).toBe(2000);
      expect(calculateBackoffDelay(3, 1000)).toBe(4000);
      expect(calculateBackoffDelay(4, 1000)).toBe(8000);
    });

    test('should cap at maximum delay', () => {
      const delay = calculateBackoffDelay(10, 1000);
      expect(delay).toBeLessThanOrEqual(30000);
    });
  });

  describe('isRetryableError', () => {
    test('should identify retryable ApiError', () => {
      const error = new ApiError('Test', 500, null, true);
      expect(isRetryableError(error)).toBe(true);
    });

    test('should identify non-retryable ApiError', () => {
      const error = new ApiError('Test', 400, null, false);
      expect(isRetryableError(error)).toBe(false);
    });

    test('should identify retryable network errors', () => {
      const error = new Error('Network error');
      error.code = 'ECONNRESET';
      expect(isRetryableError(error)).toBe(true);
    });

    test('should identify retryable HTTP status codes', () => {
      const error = new Error('Server error');
      error.status = 503;
      expect(isRetryableError(error)).toBe(true);
    });

    test('should identify non-retryable HTTP status codes', () => {
      const error = new Error('Client error');
      error.status = 400;
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    test('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(mockFn, 3);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable error', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new ApiError('Temp error', 503, null, true))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockFn, 3, 10); // Short delay for testing
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test('should not retry on non-retryable error', async () => {
      const mockFn = jest.fn()
        .mockRejectedValue(new ApiError('Client error', 400, null, false));
      
      await expect(retryWithBackoff(mockFn, 3)).rejects.toThrow('Client error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should exhaust all attempts', async () => {
      const mockFn = jest.fn()
        .mockRejectedValue(new ApiError('Temp error', 503, null, true));
      
      await expect(retryWithBackoff(mockFn, 3, 10)).rejects.toThrow('Temp error');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('getClientIdentifier', () => {
    test('should get IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      };
      
      expect(getClientIdentifier(req)).toBe('192.168.1.1');
    });

    test('should get IP from x-real-ip header', () => {
      const req = {
        headers: {
          'x-real-ip': '192.168.1.1'
        }
      };
      
      expect(getClientIdentifier(req)).toBe('192.168.1.1');
    });

    test('should get IP from connection', () => {
      const req = {
        headers: {},
        connection: {
          remoteAddress: '192.168.1.1'
        }
      };
      
      expect(getClientIdentifier(req)).toBe('192.168.1.1');
    });

    test('should return unknown for missing IP', () => {
      const req = { headers: {} };
      expect(getClientIdentifier(req)).toBe('unknown');
    });
  });

  describe('handleApiError', () => {
    test('should handle ApiError', () => {
      const error = new ApiError('Test error', 404, 'NOT_FOUND', true);
      const result = handleApiError(error);
      
      expect(result.error).toBe('Test error');
      expect(result.status).toBe(404);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.retryable).toBe(true);
    });

    test('should handle generic error', () => {
      const error = new Error('Generic error');
      const result = handleApiError(error);
      
      expect(result.error).toBe('An unexpected error occurred');
      expect(result.status).toBe(500);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.retryable).toBe(false);
    });
  });

  describe('createApiClient', () => {
    test('should return API client object', () => {
      const client = createApiClient();
      
      expect(client).toHaveProperty('generateImages');
      expect(client).toHaveProperty('checkRateLimit');
      expect(client).toHaveProperty('retryWithBackoff');
      expect(client).toHaveProperty('makeRequest');
      expect(typeof client.generateImages).toBe('function');
    });
  });

  describe('checkRateLimit', () => {
    test('should check rate limit for request', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '192.168.1.1' }
      };
      
      // First call should not be rate limited
      expect(checkRateLimit(req)).toBe(false);
    });
  });
});