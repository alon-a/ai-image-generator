/**
 * Rate limiting utility for API endpoints
 * Implements token bucket algorithm with in-memory storage
 */

const { getConfig } = require('./config');

// In-memory storage for rate limiting (use Redis in production)
const rateLimitStore = new Map();

/**
 * Rate limiter class implementing token bucket algorithm
 */
class RateLimiter {
  constructor(options = {}) {
    const config = getConfig();
    this.maxRequests = options.maxRequests || config.app.rateLimitPerMinute;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
  }

  /**
   * Default key generator using IP address
   * @param {Object} req - Request object
   * @returns {string} Rate limit key
   */
  defaultKeyGenerator(req) {
    // Prioritize x-forwarded-for header for better proxy support
    const key = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           'unknown';
    return key;
  }

  /**
   * Check if request should be rate limited
   * @param {Object} req - Request object
   * @returns {Object} Rate limit result
   */
  checkRateLimit(req) {
    const key = this.keyGenerator(req);
    const now = Date.now();
    
    // Get or create bucket for this key
    let bucket = rateLimitStore.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: this.maxRequests,
        lastRefill: now
      };
      rateLimitStore.set(key, bucket);
    }

    // Calculate tokens to add based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.windowMs) * this.maxRequests;
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if request can be processed
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetTime: bucket.lastRefill + this.windowMs,
        limit: this.maxRequests
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: bucket.lastRefill + this.windowMs,
      limit: this.maxRequests,
      retryAfter: Math.ceil((bucket.lastRefill + this.windowMs - now) / 1000)
    };
  }

  /**
   * Clean up expired entries from memory
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, bucket] of rateLimitStore.entries()) {
      // Remove entries older than 2 * windowMs
      if (now - bucket.lastRefill > this.windowMs * 2) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => rateLimitStore.delete(key));
  }
}

/**
 * Create rate limiter middleware for API routes
 * @param {Object} options - Rate limiter options
 * @returns {Function} Middleware function
 */
function createRateLimiter(options = {}) {
  const limiter = new RateLimiter(options);
  
  // Clean up expired entries every 5 minutes
  setInterval(() => limiter.cleanup(), 5 * 60 * 1000);

  return (req, res, next) => {
    const result = limiter.checkRateLimit(req);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        category: 'rate_limit',
        retryable: true,
        retryAfter: result.retryAfter,
        limit: result.limit,
        resetTime: new Date(result.resetTime).toISOString(),
        timestamp: new Date().toISOString()
      });
    }

    if (next) {
      next();
    }
    return result;
  };
}

// Global rate limiter instance for consistent behavior
const globalRateLimiter = new RateLimiter();

/**
 * Check rate limit for a specific request (without middleware)
 * @param {Object} req - Request object
 * @param {Object} options - Rate limiter options (ignored for consistency)
 * @returns {Object} Rate limit result
 */
function checkRateLimit(req, options = {}) {
  return globalRateLimiter.checkRateLimit(req);
}

/**
 * Reset rate limit for a specific key (useful for testing)
 * @param {string} key - Rate limit key to reset
 */
function resetRateLimit(key) {
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status for a key
 * @param {string} key - Rate limit key
 * @returns {Object|null} Current status or null if not found
 */
function getRateLimitStatus(key) {
  return rateLimitStore.get(key) || null;
}

module.exports = {
  RateLimiter,
  createRateLimiter,
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus
};