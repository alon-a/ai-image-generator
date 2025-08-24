/**
 * API client utilities
 * Handles HTTP requests, error handling, and retry logic
 */

const { getConfig } = require('./config');

/**
 * API Error class for structured error handling
 */
class ApiError extends Error {
  constructor(message, status = 500, code = null, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Rate limiting tracker (simple in-memory implementation)
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }
  
  /**
   * Check if request is rate limited
   * @param {string} identifier - Unique identifier (IP, user ID, etc.)
   * @param {number} limit - Requests per minute limit
   * @returns {boolean} True if rate limited
   */
  isRateLimited(identifier, limit = 10) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier);
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, recentRequests);
    
    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      return true;
    }
    
    // Add current request
    recentRequests.push(now);
    return false;
  }
  
  /**
   * Clear rate limit data for identifier
   * @param {string} identifier - Identifier to clear
   */
  clearRateLimit(identifier) {
    this.requests.delete(identifier);
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelay = 1000) {
  return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
}

/**
 * Determine if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  if (error instanceof ApiError) {
    return error.retryable;
  }
  
  // Network errors are generally retryable
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }
  
  return false;
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} baseDelay - Base delay between retries
 * @returns {Promise} Promise that resolves with function result
 */
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable or this is the last attempt
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }
      
      const delay = calculateBackoffDelay(attempt, baseDelay);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Make HTTP request with error handling
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @returns {Promise} Promise that resolves with response data
 */
async function makeRequest(url, options = {}) {
  const config = getConfig();
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    timeout: config.fal.timeout
  };
  
  const requestOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      throw new ApiError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code,
        isRetryableError({ status: response.status })
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors
    throw new ApiError(
      `Network error: ${error.message}`,
      0,
      error.code,
      true
    );
  }
}

/**
 * Generate images using the API with retry logic
 * @param {string} prompt - Text prompt for image generation
 * @param {object} options - Generation options
 * @returns {Promise} Promise that resolves with image URLs
 */
async function generateImages(prompt, options = {}) {
  const config = getConfig();
  
  const requestBody = {
    prompt,
    ...options
  };
  
  const generateFn = async () => {
    return await makeRequest('/api/generate-image', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  };
  
  return await retryWithBackoff(generateFn, config.fal.retryAttempts);
}

/**
 * Check rate limit for a request
 * @param {object} req - Request object (for getting IP)
 * @returns {boolean} True if rate limited
 */
function checkRateLimit(req) {
  const config = getConfig();
  const identifier = getClientIdentifier(req);
  return rateLimiter.isRateLimited(identifier, config.app.rateLimitPerMinute);
}

/**
 * Get client identifier for rate limiting
 * @param {object} req - Request object
 * @returns {string} Client identifier
 */
function getClientIdentifier(req) {
  // Try to get real IP from various headers
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || remoteAddress || 'unknown';
}

/**
 * Create API client with common configuration
 * @returns {object} API client object
 */
function createApiClient() {
  return {
    generateImages,
    checkRateLimit,
    retryWithBackoff,
    makeRequest
  };
}

/**
 * Handle API errors and convert to user-friendly messages
 * @param {Error} error - Error to handle
 * @returns {object} Formatted error response
 */
function handleApiError(error) {
  if (error instanceof ApiError) {
    return {
      error: error.message,
      code: error.code,
      status: error.status,
      retryable: error.retryable
    };
  }
  
  // Generic error handling
  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    status: 500,
    retryable: false
  };
}

module.exports = {
  ApiError,
  RateLimiter,
  createApiClient,
  generateImages,
  checkRateLimit,
  getClientIdentifier,
  retryWithBackoff,
  makeRequest,
  handleApiError,
  isRetryableError,
  sleep,
  calculateBackoffDelay
};