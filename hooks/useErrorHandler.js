import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for centralized error handling with retry logic and categorization
 * @param {Object} options - Configuration options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay for exponential backoff (ms)
 * @param {Function} [options.onError] - Callback function when error occurs
 * @param {Function} [options.onRetry] - Callback function when retry is attempted
 * @param {Function} [options.onSuccess] - Callback function when operation succeeds
 * @returns {Object} Error handler utilities
 */
const useErrorHandler = (options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onError,
    onRetry,
    onSuccess
  } = options;

  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use ref to store the last operation for retry functionality
  const lastOperationRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  /**
   * Clears the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handles and categorizes errors
   * @param {Error|string|Object} errorInput - The error to handle
   * @param {Object} [context] - Additional context about the error
   */
  const handleError = useCallback((errorInput, context = {}) => {
    const processedError = processError(errorInput, context);
    setError(processedError);
    setIsRetrying(false);
    
    // Call onError callback if provided
    if (onError) {
      onError(processedError, context);
    }
  }, [onError]);

  /**
   * Executes an async operation with automatic error handling and retry logic
   * @param {Function} operation - Async function to execute
   * @param {Object} [options] - Execution options
   * @param {boolean} [options.autoRetry=true] - Whether to automatically retry on failure
   * @param {number} [options.maxRetries] - Override default max retries
   * @param {Object} [options.context] - Additional context for error handling
   * @returns {Promise} Promise that resolves with operation result
   */
  const executeWithErrorHandling = useCallback(async (operation, executionOptions = {}) => {
    const {
      autoRetry = true,
      maxRetries: operationMaxRetries = maxRetries,
      context = {}
    } = executionOptions;

    // Store operation for potential retry
    lastOperationRef.current = { operation, options: executionOptions };
    
    // Clear previous error
    clearError();

    let currentAttempt = 0;
    
    while (currentAttempt <= operationMaxRetries) {
      try {
        setIsRetrying(currentAttempt > 0);
        
        if (currentAttempt > 0 && onRetry) {
          onRetry(currentAttempt, operationMaxRetries);
        }
        
        const result = await operation();
        
        // Success - clear error state and call success callback
        clearError();
        if (onSuccess) {
          onSuccess(result, currentAttempt);
        }
        
        return result;
        
      } catch (error) {
        currentAttempt++;
        setRetryCount(currentAttempt);
        
        const processedError = processError(error, { 
          ...context, 
          attempt: currentAttempt,
          maxAttempts: operationMaxRetries + 1
        });
        
        // If this is the last attempt or error is not retryable, handle the error
        if (currentAttempt > operationMaxRetries || !processedError.retryable || !autoRetry) {
          handleError(processedError, context);
          throw processedError;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = calculateBackoffDelay(currentAttempt, baseDelay);
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay);
        });
      }
    }
  }, [maxRetries, baseDelay, handleError, clearError, onRetry, onSuccess]);

  /**
   * Manually retry the last failed operation
   * @returns {Promise} Promise that resolves with operation result
   */
  const retry = useCallback(async () => {
    if (!lastOperationRef.current) {
      throw new Error('No operation to retry');
    }
    
    const { operation, options } = lastOperationRef.current;
    return executeWithErrorHandling(operation, options);
  }, [executeWithErrorHandling]);

  /**
   * Check if an error is retryable based on its category
   * @param {Object} error - Processed error object
   * @returns {boolean} Whether the error is retryable
   */
  const isRetryable = useCallback((error) => {
    if (!error || typeof error !== 'object') return false;
    return error.retryable === true;
  }, []);

  /**
   * Get retry information
   * @returns {Object} Retry information
   */
  const getRetryInfo = useCallback(() => {
    return {
      canRetry: lastOperationRef.current !== null && (!error || isRetryable(error)),
      retryCount,
      maxRetries,
      isRetrying,
      hasError: error !== null
    };
  }, [error, retryCount, maxRetries, isRetrying, isRetryable]);

  return {
    // State
    error,
    isRetrying,
    retryCount,
    
    // Actions
    handleError,
    clearError,
    executeWithErrorHandling,
    retry,
    
    // Utilities
    isRetryable,
    getRetryInfo
  };
};

/**
 * Processes and categorizes an error
 * @param {Error|string|Object} errorInput - The error to process
 * @param {Object} context - Additional context
 * @returns {Object} Processed error object
 */
function processError(errorInput, context = {}) {
  // Base error structure
  const baseError = {
    message: 'An unexpected error occurred',
    category: 'unknown',
    retryable: true,
    timestamp: new Date().toISOString(),
    context
  };

  // Handle different error input types
  let error = baseError;

  if (typeof errorInput === 'string') {
    error = {
      ...baseError,
      message: errorInput,
      originalError: errorInput
    };
  } else if (errorInput instanceof Error) {
    error = {
      ...baseError,
      message: errorInput.message,
      name: errorInput.name,
      stack: errorInput.stack,
      originalError: errorInput
    };
  } else if (typeof errorInput === 'object' && errorInput !== null) {
    error = {
      ...baseError,
      ...errorInput,
      originalError: errorInput
    };
  }

  // Categorize the error
  error.category = categorizeError(error);
  
  // Set retryability based on category
  error.retryable = getRetryabilityForCategory(error.category);
  
  // Add category-specific properties
  error = enhanceErrorByCategory(error);

  return error;
}

/**
 * Categorizes an error based on its properties
 * @param {Object} error - Error object to categorize
 * @returns {string} Error category
 */
function categorizeError(error) {
  const message = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  
  // Configuration errors
  if (message.includes('configuration') || 
      message.includes('api key') || 
      message.includes('not configured') ||
      message.includes('missing credentials')) {
    return 'configuration';
  }
  
  // Validation errors
  if (message.includes('validation') || 
      message.includes('invalid') || 
      message.includes('required') ||
      message.includes('bad request') ||
      error.status === 400) {
    return 'validation';
  }
  
  // Authentication errors
  if (message.includes('unauthorized') || 
      message.includes('authentication') ||
      error.status === 401 || 
      error.status === 403) {
    return 'authentication';
  }
  
  // Rate limiting errors
  if (message.includes('rate limit') || 
      message.includes('too many requests') ||
      error.status === 429) {
    return 'rate_limit';
  }
  
  // Network errors
  if (message.includes('network') || 
      message.includes('connection') || 
      message.includes('timeout') ||
      name.includes('network') ||
      error.status === 0) {
    return 'network';
  }
  
  // Server errors
  if (message.includes('server') || 
      message.includes('internal') ||
      (error.status >= 500 && error.status < 600)) {
    return 'server';
  }
  
  // Client errors
  if (error.status >= 400 && error.status < 500) {
    return 'client';
  }
  
  return 'unknown';
}

/**
 * Determines if an error category is retryable
 * @param {string} category - Error category
 * @returns {boolean} Whether errors of this category are retryable
 */
function getRetryabilityForCategory(category) {
  const retryableCategories = ['network', 'server', 'rate_limit', 'unknown'];
  return retryableCategories.includes(category);
}

/**
 * Enhances error object with category-specific properties
 * @param {Object} error - Error object to enhance
 * @returns {Object} Enhanced error object
 */
function enhanceErrorByCategory(error) {
  const enhancements = {
    configuration: {
      title: 'Configuration Error',
      userMessage: 'The application is not properly configured. Please check the setup.',
      actionable: true,
      severity: 'high'
    },
    validation: {
      title: 'Invalid Input',
      userMessage: 'Please check your input and try again.',
      actionable: true,
      severity: 'medium'
    },
    authentication: {
      title: 'Authentication Error',
      userMessage: 'Authentication failed. Please check your credentials.',
      actionable: true,
      severity: 'high'
    },
    rate_limit: {
      title: 'Rate Limit Exceeded',
      userMessage: 'Too many requests. Please wait a moment before trying again.',
      actionable: false,
      severity: 'medium'
    },
    network: {
      title: 'Connection Problem',
      userMessage: 'Unable to connect to the server. Please check your internet connection.',
      actionable: false,
      severity: 'medium'
    },
    server: {
      title: 'Server Error',
      userMessage: 'A server error occurred. Please try again later.',
      actionable: false,
      severity: 'high'
    },
    client: {
      title: 'Request Error',
      userMessage: 'There was a problem with your request.',
      actionable: true,
      severity: 'medium'
    },
    unknown: {
      title: 'Unexpected Error',
      userMessage: 'An unexpected error occurred. Please try again.',
      actionable: false,
      severity: 'medium'
    }
  };
  
  const enhancement = enhancements[error.category] || enhancements.unknown;
  
  return {
    ...error,
    ...enhancement
  };
}

/**
 * Calculates exponential backoff delay
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelay) {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

export default useErrorHandler;