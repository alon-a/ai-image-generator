import * as fal from '@fal-ai/serverless-client';
const { validateGenerateImageRequest, validateHttpMethod } = require('../../utils/validation');
const { getConfig, isConfigured, getSetupInstructions, validateConfig } = require('../../utils/config');
const { checkRateLimit } = require('../../utils/rateLimiter');

// Initialize the FAL client with your API key
fal.config({
  credentials: process.env.FAL_KEY
});

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
}

/**
 * API handler for generating images using FAL AI's Flux model with comprehensive error handling
 * @async
 * @function handler
 * @param {Object} req - Next.js API request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.prompt - Text description for image generation
 * @param {Object} res - Next.js API response object
 * @returns {Promise<void>} - Returns a promise that resolves when the response is sent
 * 
 * @example
 * // Example request:
 * POST /api/generate-image
 * {
 *   "prompt": "A serene mountain landscape at sunset"
 * }
 * 
 * // Example success response:
 * {
 *   "imageUrls": ["https://fal.ai/generated-image-url-1.jpg", ...],
 *   "metadata": {
 *     "prompt": "A serene mountain landscape at sunset",
 *     "generation_time": 1234,
 *     "model_version": "flux/dev"
 *   }
 * }
 * 
 * // Example error response:
 * {
 *   "error": "Failed to generate images",
 *   "category": "server",
 *   "retryable": true,
 *   "details": "Detailed error information"
 * }
 */
export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Add caching headers for performance
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add performance headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Validate HTTP method using utility
    const methodValidation = validateHttpMethod(req.method, ['POST']);
    if (!methodValidation.isValid) {
      return sendErrorResponse(res, {
        message: methodValidation.error.message,
        category: 'validation',
        status: 405,
        retryable: false
      });
    }

    // Check rate limiting
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.allowed) {
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', String(rateLimitResult.limit));
      res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      res.setHeader('Retry-After', String(rateLimitResult.retryAfter));
      
      return sendErrorResponse(res, {
        message: 'Too many requests. Please wait before trying again.',
        category: 'rate_limit',
        status: 429,
        retryable: true,
        retryAfter: rateLimitResult.retryAfter,
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      });
    }

    // Add rate limit headers for successful requests
    res.setHeader('X-RateLimit-Limit', String(rateLimitResult.limit));
    res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    // Validate configuration using utility
    if (!isConfigured()) {
      return sendErrorResponse(res, {
        message: 'Server not properly configured. Please check API key setup.',
        category: 'configuration',
        status: 500,
        retryable: false,
        setup: getSetupInstructions()
      });
    }

    // Validate and sanitize input using utility
    const inputValidation = validateGenerateImageRequest(req.body);
    if (!inputValidation.isValid) {
      return sendErrorResponse(res, {
        message: inputValidation.error.message,
        category: 'validation',
        status: 400,
        retryable: true,
        field: inputValidation.error.field,
        code: inputValidation.error.code
      });
    }

    const { prompt, options = {} } = inputValidation.data;

    console.log('Generating images for prompt:', prompt);

    // Get configuration for generation options
    const config = getConfig();
    
    // Generate images with retry logic and proper error handling
    const imageUrls = await generateImagesWithRetry(prompt, {
      maxRetries: config.fal.retryAttempts,
      timeout: config.fal.timeout,
      options
    });

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    console.log(`Generated ${imageUrls.length} images successfully in ${generationTime}ms`);

    // Return success response with metadata
    return res.status(200).json({
      imageUrls,
      metadata: {
        prompt,
        generation_time: generationTime,
        model_version: 'flux/dev',
        images_count: imageUrls.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in image generation handler:', error);
    
    // Process and categorize the error
    const processedError = processApiError(error);
    
    return sendErrorResponse(res, processedError);
  }
}



/**
 * Generates images with retry logic and comprehensive error handling
 * @param {string} prompt - Text prompt for image generation
 * @param {Object} generationOptions - Generation options
 * @returns {Promise<string[]>} Array of image URLs
 */
async function generateImagesWithRetry(prompt, generationOptions = {}) {
  const { maxRetries = 2, timeout = 30000, options = {} } = generationOptions;
  const config = getConfig();
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for image generation`);
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Generate images with configurable options
      const numImages = options.num_images || config.app.imagesPerGeneration;
      const imagePromises = Array.from({ length: numImages }, (_, index) => {
        const seed = options.seed !== undefined ? options.seed + index : Math.floor(Math.random() * 1000000) + index;
        console.log(`Generating image ${index + 1} with seed ${seed} (attempt ${attempt + 1})`);
        
        const falInput = {
          prompt: prompt,
          seed: seed,
          num_images: 1,
          image_size: options.image_size || {
            width: 1024,
            height: 1024
          },
          enable_safety_checker: true,
          scheduler: "euler"
        };
        
        return Promise.race([
          fal.run(config.fal.model, {
            input: falInput
          }),
          // Timeout promise
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      });

      console.log('Waiting for all images to generate...');
      const results = await Promise.all(imagePromises);
      
      const imageUrls = results.map((result, index) => {
        if (!result || !result.images || !result.images[0] || !result.images[0].url) {
          console.error(`Invalid result structure for image ${index + 1}:`, result);
          return null;
        }
        return result.images[0].url;
      }).filter(Boolean);

      if (imageUrls.length === 0) {
        throw new Error('No images were generated successfully');
      }

      if (imageUrls.length < numImages) {
        console.warn(`Only ${imageUrls.length} out of ${numImages} images were generated successfully`);
      }

      return imageUrls;

    } catch (error) {
      lastError = error;
      console.error(`Image generation attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry for certain types of errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  throw lastError;
}

/**
 * Determines if an error should not be retried
 * @param {Error} error - The error to check
 * @returns {boolean} True if error should not be retried
 */
function isNonRetryableError(error) {
  const message = error.message?.toLowerCase() || '';
  
  // Don't retry validation errors, authentication errors, or rate limits
  return (
    message.includes('invalid') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('billing') ||
    error.status === 400 ||
    error.status === 401 ||
    error.status === 403 ||
    error.status === 429
  );
}

/**
 * Processes and categorizes API errors
 * @param {Error} error - The error to process
 * @returns {Object} Processed error object
 */
function processApiError(error) {
  const baseError = {
    message: 'Failed to generate images',
    category: 'server',
    retryable: true,
    timestamp: new Date().toISOString()
  };

  if (!error) {
    return baseError;
  }

  const message = error.message || '';
  const lowerMessage = message.toLowerCase();

  // Categorize based on error content
  if (lowerMessage.includes('timeout') || lowerMessage.includes('network')) {
    return {
      ...baseError,
      message: 'Request timed out. Please try again.',
      category: 'network',
      retryable: true,
      status: 408
    };
  }

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('api key')) {
    return {
      ...baseError,
      message: 'Authentication failed. Please check API configuration.',
      category: 'authentication',
      retryable: false,
      status: 401
    };
  }

  if (lowerMessage.includes('rate limit') || lowerMessage.includes('quota')) {
    return {
      ...baseError,
      message: 'Rate limit exceeded. Please wait before trying again.',
      category: 'rate_limit',
      retryable: true,
      status: 429
    };
  }

  if (lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return {
      ...baseError,
      message: 'Invalid request. Please check your input.',
      category: 'validation',
      retryable: true,
      status: 400
    };
  }

  if (lowerMessage.includes('no images') || lowerMessage.includes('generation failed')) {
    return {
      ...baseError,
      message: 'Image generation failed. Please try a different prompt.',
      category: 'generation',
      retryable: true,
      status: 422
    };
  }

  // Default server error
  return {
    ...baseError,
    message: message || baseError.message,
    details: error.stack,
    status: error.status || 500
  };
}

/**
 * Sends a standardized error response
 * @param {Object} res - Response object
 * @param {Object} errorInfo - Error information
 */
function sendErrorResponse(res, errorInfo) {
  const {
    message,
    category = 'server',
    status = 500,
    retryable = true,
    details,
    setup,
    field,
    code,
    retryAfter,
    resetTime
  } = errorInfo;

  const response = {
    error: message,
    category,
    retryable,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  if (setup) {
    response.setup = setup;
  }

  if (field) {
    response.field = field;
  }

  if (code) {
    response.code = code;
  }

  if (retryAfter !== undefined) {
    response.retryAfter = retryAfter;
  }

  if (resetTime) {
    response.resetTime = resetTime;
  }

  return res.status(status).json(response);
}

