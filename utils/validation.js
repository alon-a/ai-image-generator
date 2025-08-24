/**
 * Input validation utility functions
 * Handles validation for prompts, requests, and user input
 */

const { getConfig } = require('./config');

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, field = null, code = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

/**
 * Validate text prompt for image generation
 * @param {string} prompt - The text prompt to validate
 * @returns {object} Validation result with success/error
 */
function validatePrompt(prompt) {
  const config = getConfig();
  
  if (!prompt) {
    return {
      isValid: false,
      error: new ValidationError('Prompt is required', 'prompt', 'REQUIRED')
    };
  }
  
  if (typeof prompt !== 'string') {
    return {
      isValid: false,
      error: new ValidationError('Prompt must be a string', 'prompt', 'INVALID_TYPE')
    };
  }
  
  const trimmedPrompt = prompt.trim();
  
  if (trimmedPrompt.length === 0) {
    return {
      isValid: false,
      error: new ValidationError('Prompt cannot be empty', 'prompt', 'EMPTY')
    };
  }
  
  if (trimmedPrompt.length > config.app.maxPromptLength) {
    return {
      isValid: false,
      error: new ValidationError(
        `Prompt must be ${config.app.maxPromptLength} characters or less`,
        'prompt',
        'TOO_LONG'
      )
    };
  }
  
  // Check for potentially inappropriate content (basic filtering)
  const inappropriatePatterns = [
    /\b(nude|naked|nsfw|explicit|sexual)\b/i,
    /\b(violence|gore|blood|death)\b/i
  ];
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        isValid: false,
        error: new ValidationError(
          'Prompt contains inappropriate content',
          'prompt',
          'INAPPROPRIATE_CONTENT'
        )
      };
    }
  }
  
  return {
    isValid: true,
    data: trimmedPrompt
  };
}

/**
 * Validate image generation request body
 * @param {object} requestBody - The request body to validate
 * @returns {object} Validation result with success/error
 */
function validateGenerateImageRequest(requestBody) {
  if (!requestBody || typeof requestBody !== 'object') {
    return {
      isValid: false,
      error: new ValidationError('Request body must be an object', null, 'INVALID_BODY')
    };
  }
  
  const { prompt, options = {} } = requestBody;
  
  // Validate prompt
  const promptValidation = validatePrompt(prompt);
  if (!promptValidation.isValid) {
    return promptValidation;
  }
  
  // Validate options if provided
  if (options && typeof options !== 'object') {
    return {
      isValid: false,
      error: new ValidationError('Options must be an object', 'options', 'INVALID_TYPE')
    };
  }
  
  // Validate seed if provided
  if (options.seed !== undefined) {
    if (!Number.isInteger(options.seed) || options.seed < 0) {
      return {
        isValid: false,
        error: new ValidationError('Seed must be a non-negative integer', 'options.seed', 'INVALID_SEED')
      };
    }
  }
  
  // Validate num_images if provided
  if (options.num_images !== undefined) {
    if (!Number.isInteger(options.num_images) || options.num_images < 1 || options.num_images > 10) {
      return {
        isValid: false,
        error: new ValidationError('Number of images must be between 1 and 10', 'options.num_images', 'INVALID_COUNT')
      };
    }
  }
  
  // Validate image_size if provided
  if (options.image_size) {
    const { width, height } = options.image_size;
    
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      return {
        isValid: false,
        error: new ValidationError('Image dimensions must be integers', 'options.image_size', 'INVALID_DIMENSIONS')
      };
    }
    
    if (width < 256 || width > 2048 || height < 256 || height > 2048) {
      return {
        isValid: false,
        error: new ValidationError('Image dimensions must be between 256 and 2048 pixels', 'options.image_size', 'INVALID_SIZE')
      };
    }
  }
  
  return {
    isValid: true,
    data: {
      prompt: promptValidation.data,
      options
    }
  };
}

/**
 * Validate HTTP method for API endpoints
 * @param {string} method - HTTP method to validate
 * @param {string[]} allowedMethods - Array of allowed methods
 * @returns {object} Validation result
 */
function validateHttpMethod(method, allowedMethods = ['POST']) {
  if (!allowedMethods.includes(method)) {
    return {
      isValid: false,
      error: new ValidationError(
        `Method ${method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
        'method',
        'METHOD_NOT_ALLOWED'
      )
    };
  }
  
  return { isValid: true };
}

/**
 * Sanitize user input to prevent XSS and other attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate email format (if needed for future features)
 * @param {string} email - Email to validate
 * @returns {object} Validation result
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: new ValidationError('Email is required', 'email', 'REQUIRED')
    };
  }
  
  const trimmedEmail = email.trim();
  
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: new ValidationError('Invalid email format', 'email', 'INVALID_FORMAT')
    };
  }
  
  return {
    isValid: true,
    data: trimmedEmail.toLowerCase()
  };
}

module.exports = {
  ValidationError,
  validatePrompt,
  validateGenerateImageRequest,
  validateHttpMethod,
  validateEmail,
  sanitizeInput
};