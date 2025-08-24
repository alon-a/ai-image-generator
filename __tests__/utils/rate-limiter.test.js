/**
 * Tests for rate limiter utility
 */

const { RateLimiter, checkRateLimit, resetRateLimit, getRateLimitStatus } = require('../../utils/rateLimiter');

// Mock config
jest.mock('../../utils/config', () => ({
  getConfig: () => ({
    app: {
      rateLimitPerMinute: 5
    }
  })
}));

describe('RateLimiter', () => {
  let rateLimiter;
  let mockReq;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
    mockReq = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };
    
    // Clear any existing rate limit data
    resetRateLimit('127.0.0.1');
  });

  afterEach(() => {
    // Clean up after each test
    resetRateLimit('127.0.0.1');
  });

  describe('checkRateLimit', () => {
    test('should allow requests within limit', () => {
      const result1 = rateLimiter.checkRateLimit(mockReq);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result1.limit).toBe(3);

      const result2 = rateLimiter.checkRateLimit(mockReq);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = rateLimiter.checkRateLimit(mockReq);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    test('should block requests when limit exceeded', () => {
      // Use up all tokens
      rateLimiter.checkRateLimit(mockReq);
      rateLimiter.checkRateLimit(mockReq);
      rateLimiter.checkRateLimit(mockReq);

      // This should be blocked
      const result = rateLimiter.checkRateLimit(mockReq);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should handle different IP addresses separately', () => {
      const req1 = { ip: '127.0.0.1' };
      const req2 = { ip: '192.168.1.1' };

      // Use up tokens for first IP
      rateLimiter.checkRateLimit(req1);
      rateLimiter.checkRateLimit(req1);
      rateLimiter.checkRateLimit(req1);

      // First IP should be blocked
      const result1 = rateLimiter.checkRateLimit(req1);
      expect(result1.allowed).toBe(false);

      // Second IP should still be allowed
      const result2 = rateLimiter.checkRateLimit(req2);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);
    });

    test('should handle missing IP gracefully', () => {
      const reqWithoutIP = { headers: {} };
      const result = rateLimiter.checkRateLimit(reqWithoutIP);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
    });

    test('should use x-forwarded-for header when available', () => {
      const reqWithForwardedFor = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1'
        }
      };

      const result = rateLimiter.checkRateLimit(reqWithForwardedFor);
      expect(result.allowed).toBe(true);
      
      // Verify it's using the forwarded IP
      const status = getRateLimitStatus('203.0.113.1');
      expect(status).toBeTruthy();
      expect(status.tokens).toBe(2); // Should have decremented
    });
  });

  describe('token refill', () => {
    test('should refill tokens after window expires', async () => {
      const shortWindowLimiter = new RateLimiter({ 
        maxRequests: 2, 
        windowMs: 100 // 100ms window for testing
      });

      // Use up all tokens
      shortWindowLimiter.checkRateLimit(mockReq);
      shortWindowLimiter.checkRateLimit(mockReq);

      // Should be blocked
      let result = shortWindowLimiter.checkRateLimit(mockReq);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = shortWindowLimiter.checkRateLimit(mockReq);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('cleanup', () => {
    test('should remove expired entries', async () => {
      const shortWindowLimiter = new RateLimiter({ 
        maxRequests: 2, 
        windowMs: 50
      });

      // Create an entry
      shortWindowLimiter.checkRateLimit(mockReq);
      expect(getRateLimitStatus('127.0.0.1')).toBeTruthy();

      // Wait for it to expire (need to wait longer than 2 * windowMs)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Run cleanup
      shortWindowLimiter.cleanup();

      // Entry should be removed after cleanup (since we waited > 2 * windowMs)
      expect(getRateLimitStatus('127.0.0.1')).toBeNull();
    });
  });
});

describe('checkRateLimit function', () => {
  beforeEach(() => {
    resetRateLimit('127.0.0.1');
  });

  test('should work with default config', () => {
    const mockReq = { ip: '127.0.0.1' };
    const result = checkRateLimit(mockReq);
    
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(5); // From mocked config
    expect(result.remaining).toBe(4);
  });

  test('should work with default config (custom options ignored for consistency)', () => {
    const mockReq = { ip: '127.0.0.1' };
    const result = checkRateLimit(mockReq, { maxRequests: 10 }); // Options ignored
    
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(5); // Uses default from mocked config
    expect(result.remaining).toBe(4);
  });
});

describe('utility functions', () => {
  test('resetRateLimit should clear rate limit for key', () => {
    const mockReq = { ip: '127.0.0.1' };
    
    // Create a rate limit entry
    checkRateLimit(mockReq);
    expect(getRateLimitStatus('127.0.0.1')).toBeTruthy();
    
    // Reset it
    resetRateLimit('127.0.0.1');
    expect(getRateLimitStatus('127.0.0.1')).toBeNull();
  });

  test('getRateLimitStatus should return current status', () => {
    const mockReq = { ip: '127.0.0.1' };
    
    // No status initially
    expect(getRateLimitStatus('127.0.0.1')).toBeNull();
    
    // Create entry
    checkRateLimit(mockReq);
    const status = getRateLimitStatus('127.0.0.1');
    expect(status).toBeTruthy();
    expect(status.tokens).toBe(4); // 5 - 1
  });
});