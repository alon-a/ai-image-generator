import { useState, useCallback, useRef } from 'react';
import useErrorHandler from './useErrorHandler';

/**
 * Custom hook for managing image generation state and logic
 * Provides centralized state management for image generation workflow
 * with retry functionality and proper error handling
 * 
 * @param {Object} options - Configuration options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay for exponential backoff
 * @param {Function} [options.onSuccess] - Callback when generation succeeds
 * @param {Function} [options.onError] - Callback when generation fails
 * @param {Function} [options.onRetry] - Callback when retry is attempted
 * @returns {Object} Image generation state and actions
 */
const useImageGeneration = (options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onSuccess,
    onError,
    onRetry
  } = options;

  // State management
  const [state, setState] = useState({
    prompt: '',
    images: [],
    loading: false,
    generationId: null,
    metadata: null
  });

  // Track generation history for deduplication
  const generationHistoryRef = useRef(new Map());
  const currentRequestRef = useRef(null);

  // Error handling with retry logic
  const errorHandler = useErrorHandler({
    maxRetries,
    baseDelay,
    onError: (error, context) => {
      setState(prev => ({ ...prev, loading: false }));
      if (onError) onError(error, context);
    },
    onRetry: (attempt, maxAttempts) => {
      if (onRetry) onRetry(attempt, maxAttempts);
    },
    onSuccess: (result, attempts) => {
      if (onSuccess) onSuccess(result, attempts);
    }
  });

  /**
   * Update the current prompt
   * @param {string} newPrompt - New prompt text
   */
  const setPrompt = useCallback((newPrompt) => {
    setState(prev => ({ ...prev, prompt: newPrompt }));
  }, []);

  /**
   * Clear all generated images
   */
  const clearImages = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      images: [], 
      metadata: null,
      generationId: null 
    }));
    generationHistoryRef.current.clear();
  }, []);

  /**
   * Check if a prompt was recently generated (for deduplication)
   * @param {string} prompt - Prompt to check
   * @returns {Object|null} Cached result or null
   */
  const getCachedResult = useCallback((prompt) => {
    const normalizedPrompt = prompt.trim().toLowerCase();
    const cached = generationHistoryRef.current.get(normalizedPrompt);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return cached;
    }
    
    return null;
  }, []);

  /**
   * Cache generation result
   * @param {string} prompt - Original prompt
   * @param {Object} result - Generation result
   */
  const cacheResult = useCallback((prompt, result) => {
    const normalizedPrompt = prompt.trim().toLowerCase();
    generationHistoryRef.current.set(normalizedPrompt, {
      ...result,
      timestamp: Date.now()
    });
  }, []);

  /**
   * Validate prompt before generation
   * @param {string} prompt - Prompt to validate
   * @returns {Object} Validation result
   */
  const validatePrompt = useCallback((prompt) => {
    const trimmedPrompt = prompt.trim();
    
    if (!trimmedPrompt) {
      return {
        valid: false,
        error: 'Please enter a prompt to generate images'
      };
    }
    
    if (trimmedPrompt.length < 3) {
      return {
        valid: false,
        error: 'Prompt must be at least 3 characters long'
      };
    }
    
    if (trimmedPrompt.length > 500) {
      return {
        valid: false,
        error: 'Prompt must be less than 500 characters'
      };
    }
    
    return { valid: true };
  }, []);

  /**
   * Generate images from prompt
   * @param {string} [promptOverride] - Optional prompt override
   * @param {Object} [generationOptions] - Additional generation options
   * @returns {Promise} Promise that resolves when generation completes
   */
  const generateImages = useCallback(async (promptOverride, generationOptions = {}) => {
    const promptToUse = promptOverride || state.prompt;
    
    // Validate prompt
    const validation = validatePrompt(promptToUse);
    if (!validation.valid) {
      errorHandler.handleError(validation.error, { category: 'validation' });
      return;
    }

    // Check for cached result
    const cached = getCachedResult(promptToUse);
    if (cached && !generationOptions.forceRegenerate) {
      setState(prev => ({
        ...prev,
        images: cached.images,
        metadata: cached.metadata,
        generationId: cached.generationId,
        prompt: promptToUse
      }));
      return cached;
    }

    // Set loading state
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      prompt: promptToUse 
    }));
    
    errorHandler.clearError();

    // Create generation function
    const generateFn = async () => {
      // Cancel previous request if still pending
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }

      // Create abort controller for this request
      const abortController = new AbortController();
      currentRequestRef.current = abortController;

      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: promptToUse,
            ...generationOptions
          }),
          signal: abortController.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Validate response structure
        if (!result.imageUrls || !Array.isArray(result.imageUrls)) {
          throw new Error('Invalid response format from image generation API');
        }

        const generationResult = {
          images: result.imageUrls,
          metadata: result.metadata || {
            prompt: promptToUse,
            generation_time: Date.now(),
            model_version: 'unknown'
          },
          generationId: result.generationId || `gen_${Date.now()}`
        };

        // Update state with results
        setState(prev => ({
          ...prev,
          images: generationResult.images,
          metadata: generationResult.metadata,
          generationId: generationResult.generationId,
          loading: false
        }));

        // Cache the result
        cacheResult(promptToUse, generationResult);

        return generationResult;

      } finally {
        // Clear current request reference
        if (currentRequestRef.current === abortController) {
          currentRequestRef.current = null;
        }
      }
    };

    try {
      return await errorHandler.executeWithErrorHandling(generateFn, {
        context: { 
          prompt: promptToUse,
          options: generationOptions
        }
      });
    } catch (error) {
      // Error is already handled by errorHandler
      throw error;
    }
  }, [state.prompt, validatePrompt, getCachedResult, cacheResult, errorHandler]);

  /**
   * Retry the last failed generation
   * @returns {Promise} Promise that resolves when retry completes
   */
  const retry = useCallback(async () => {
    try {
      return await errorHandler.retry();
    } catch (error) {
      // Error is already handled by errorHandler
      throw error;
    }
  }, [errorHandler]);

  /**
   * Cancel current generation if in progress
   */
  const cancelGeneration = useCallback(() => {
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
      currentRequestRef.current = null;
    }
    
    setState(prev => ({ ...prev, loading: false }));
    errorHandler.clearError();
  }, [errorHandler]);

  /**
   * Add images to current collection (for batch generation)
   * @param {Array} newImages - Array of image URLs to add
   */
  const addImages = useCallback((newImages) => {
    if (!Array.isArray(newImages)) return;
    
    setState(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  }, []);

  /**
   * Remove specific image from collection
   * @param {number} index - Index of image to remove
   */
  const removeImage = useCallback((index) => {
    setState(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  }, []);

  /**
   * Get generation statistics
   * @returns {Object} Generation statistics
   */
  const getStats = useCallback(() => {
    const retryInfo = errorHandler.getRetryInfo();
    
    return {
      totalImages: state.images.length,
      currentPrompt: state.prompt,
      isGenerating: state.loading,
      hasError: retryInfo.hasError,
      canRetry: retryInfo.canRetry,
      retryCount: retryInfo.retryCount,
      maxRetries: retryInfo.maxRetries,
      isRetrying: retryInfo.isRetrying,
      cacheSize: generationHistoryRef.current.size,
      lastGeneration: state.metadata?.generation_time
    };
  }, [state, errorHandler]);

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    cancelGeneration();
    setState({
      prompt: '',
      images: [],
      loading: false,
      generationId: null,
      metadata: null
    });
    errorHandler.clearError();
    generationHistoryRef.current.clear();
  }, [cancelGeneration, errorHandler]);

  return {
    // State
    prompt: state.prompt,
    images: state.images,
    loading: state.loading,
    error: errorHandler.error,
    metadata: state.metadata,
    generationId: state.generationId,
    
    // Actions
    setPrompt,
    generateImages,
    retry,
    cancelGeneration,
    clearImages,
    addImages,
    removeImage,
    reset,
    
    // Utilities
    validatePrompt,
    getStats,
    isRetrying: errorHandler.isRetrying,
    retryCount: errorHandler.retryCount,
    canRetry: errorHandler.getRetryInfo().canRetry
  };
};

export default useImageGeneration;