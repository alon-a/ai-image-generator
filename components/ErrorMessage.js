import { useState } from 'react';
import styles from './ErrorMessage.module.css';

/**
 * ErrorMessage Component - Displays user-friendly error messages with retry functionality
 * @component
 * @param {Object} props - Component props
 * @param {Object|string|null} props.error - Error object or string to display
 * @param {Function} [props.onRetry] - Optional callback function for retry action
 * @param {Function} [props.onDismiss] - Optional callback function for dismissing error
 * @param {string} [props.className] - Additional CSS class names
 * @returns {JSX.Element|null} Error message component or null if no error
 */
const ErrorMessage = ({ error, onRetry, onDismiss, className = '' }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't render if no error or if dismissed
  if (!error || isDismissed) {
    return null;
  }

  // Parse error object or string
  const errorInfo = parseError(error);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleRetry = () => {
    setIsDismissed(true);
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div className={`${styles.errorContainer} ${className}`} role="alert">
      <div className={styles.errorContent}>
        <div className={styles.errorIcon}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className={styles.errorText}>
          <h4 className={styles.errorTitle}>{errorInfo.title}</h4>
          <p className={styles.errorMessage}>{errorInfo.message}</p>
          
          {errorInfo.details && (
            <details className={styles.errorDetails}>
              <summary>Technical Details</summary>
              <p>{errorInfo.details}</p>
            </details>
          )}
          
          {errorInfo.instructions && (
            <div className={styles.errorInstructions}>
              <h5>What you can do:</h5>
              <ul>
                {errorInfo.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.errorActions}>
        {errorInfo.retryable && onRetry && (
          <button 
            onClick={handleRetry}
            className={`${styles.errorButton} ${styles.retryButton}`}
            type="button"
          >
            Try Again
          </button>
        )}
        
        <button 
          onClick={handleDismiss}
          className={`${styles.errorButton} ${styles.dismissButton}`}
          type="button"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    </div>
  );
};

/**
 * Parses error input and returns structured error information
 * @param {Object|string} error - Error to parse
 * @returns {Object} Structured error information
 */
function parseError(error) {
  // Default error structure
  const defaultError = {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    details: null,
    instructions: ['Check your internet connection', 'Try refreshing the page'],
    retryable: true,
    category: 'unknown'
  };

  // Handle string errors
  if (typeof error === 'string') {
    return {
      ...defaultError,
      message: error
    };
  }

  // Handle error objects
  if (typeof error === 'object' && error !== null) {
    // If it's already a structured error
    if (error.category) {
      return { ...defaultError, ...error };
    }

    // Parse different error types
    const message = error.message || error.error || defaultError.message;
    const details = error.details || error.stack || null;
    
    // Categorize error based on message content
    const category = categorizeError(message);
    const errorConfig = getErrorConfig(category);
    
    return {
      ...defaultError,
      ...errorConfig,
      message: message,
      details: details
    };
  }

  return defaultError;
}

/**
 * Categorizes error based on message content
 * @param {string} message - Error message
 * @returns {string} Error category
 */
function categorizeError(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('configuration') || lowerMessage.includes('api key') || lowerMessage.includes('not configured')) {
    return 'configuration';
  }
  
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return 'validation';
  }
  
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return 'rate_limit';
  }
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return 'network';
  }
  
  if (lowerMessage.includes('server') || lowerMessage.includes('internal')) {
    return 'server';
  }
  
  return 'unknown';
}

/**
 * Gets error configuration based on category
 * @param {string} category - Error category
 * @returns {Object} Error configuration
 */
function getErrorConfig(category) {
  const configs = {
    configuration: {
      title: 'Configuration Error',
      instructions: [
        'Check that your API key is properly set',
        'Verify your environment variables',
        'Contact support if the issue persists'
      ],
      retryable: false
    },
    validation: {
      title: 'Invalid Input',
      instructions: [
        'Check your input and try again',
        'Make sure all required fields are filled',
        'Ensure your prompt is not too long'
      ],
      retryable: true
    },
    rate_limit: {
      title: 'Rate Limit Exceeded',
      instructions: [
        'Wait a moment before trying again',
        'Consider reducing the frequency of requests'
      ],
      retryable: true
    },
    network: {
      title: 'Connection Problem',
      instructions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the problem continues'
      ],
      retryable: true
    },
    server: {
      title: 'Server Error',
      instructions: [
        'This is a temporary issue on our end',
        'Try again in a few minutes',
        'Contact support if the error persists'
      ],
      retryable: true
    },
    unknown: {
      title: 'Unexpected Error',
      instructions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact support if the issue continues'
      ],
      retryable: true
    }
  };
  
  return configs[category] || configs.unknown;
}

export default ErrorMessage;