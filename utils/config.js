/**
 * Configuration management utility
 * Handles environment variables and application configuration
 */

// Default configuration values
const DEFAULT_CONFIG = {
  fal: {
    model: 'fal-ai/flux/dev',
    timeout: 30000,
    retryAttempts: 3,
    maxImages: 4
  },
  app: {
    maxPromptLength: 500,
    imagesPerGeneration: 4,
    rateLimitPerMinute: 10,
    environment: process.env.NODE_ENV || 'development'
  }
};

/**
 * Get FAL AI API key from environment variables
 * @returns {string|null} The API key or null if not found
 */
function getFalApiKey() {
  return process.env.FAL_KEY || null;
}

/**
 * Check if the application is properly configured
 * @returns {boolean} True if all required configuration is present
 */
function isConfigured() {
  const apiKey = getFalApiKey();
  return !!(apiKey && apiKey !== 'your_fal_api_key_here');
}

/**
 * Get complete application configuration
 * @returns {object} Configuration object with all settings
 */
function getConfig() {
  return {
    ...DEFAULT_CONFIG,
    fal: {
      ...DEFAULT_CONFIG.fal,
      apiKey: getFalApiKey()
    }
  };
}

/**
 * Validate configuration on startup
 * @throws {Error} If configuration is invalid
 */
function validateConfig() {
  const config = getConfig();
  
  if (!config.fal.apiKey) {
    throw new Error('FAL_KEY environment variable is required');
  }
  
  if (config.fal.apiKey === 'your_fal_api_key_here') {
    throw new Error('Please set a valid FAL_KEY in your environment variables');
  }
  
  if (config.app.maxPromptLength <= 0) {
    throw new Error('maxPromptLength must be greater than 0');
  }
  
  if (config.app.imagesPerGeneration <= 0 || config.app.imagesPerGeneration > 10) {
    throw new Error('imagesPerGeneration must be between 1 and 10');
  }
}

/**
 * Get setup instructions for missing configuration
 * @returns {object} Setup instructions object
 */
function getSetupInstructions() {
  return {
    message: 'FAL AI API key is required to generate images',
    steps: [
      '1. Go to https://fal.ai/dashboard',
      '2. Sign up or log in to your account',
      '3. Generate an API key',
      '4. Add FAL_KEY=your_api_key to your .env.local file',
      '5. Restart your development server'
    ],
    documentation: 'https://fal.ai/docs'
  };
}

/**
 * Check if running in development mode
 * @returns {boolean} True if in development mode
 */
function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 * @returns {boolean} True if in production mode
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

module.exports = {
  getConfig,
  getFalApiKey,
  isConfigured,
  validateConfig,
  getSetupInstructions,
  isDevelopment,
  isProduction,
  DEFAULT_CONFIG
};