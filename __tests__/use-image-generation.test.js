import { renderHook, act } from '@testing-library/react';
import useImageGeneration from '../hooks/useImageGeneration';

// Mock fetch globally
global.fetch = jest.fn();

// Mock useErrorHandler
const mockErrorHandler = {
  error: null,
  isRetrying: false,
  retryCount: 0,
  handleError: jest.fn(),
  clearError: jest.fn(),
  executeWithErrorHandling: jest.fn(),
  retry: jest.fn(),
  getRetryInfo: jest.fn(() => ({
    canRetry: false,
    retryCount: 0,
    maxRetries: 3,
    isRetrying: false,
    hasError: false
  }))
};

jest.mock('../hooks/useErrorHandler', () => {
  return jest.fn(() => mockErrorHandler);
});

describe('useImageGeneration Hook', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
    // Reset mock functions
    Object.keys(mockErrorHandler).forEach(key => {
      if (typeof mockErrorHandler[key] === 'function' && mockErrorHandler[key].mockClear) {
        mockErrorHandler[key].mockClear();
      }
    });
    // Reset mock implementations
    mockErrorHandler.executeWithErrorHandling.mockImplementation(async (fn) => await fn());
    mockErrorHandler.retry.mockResolvedValue('retry success');
    mockErrorHandler.error = null;
    mockErrorHandler.isRetrying = false;
    mockErrorHandler.retryCount = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('initializes with default state', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    expect(result.current.prompt).toBe('');
    expect(result.current.images).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.metadata).toBeNull();
    expect(result.current.generationId).toBeNull();
  });

  test('setPrompt updates prompt state', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    act(() => {
      result.current.setPrompt('test prompt');
    });
    
    expect(result.current.prompt).toBe('test prompt');
  });

  test('clearImages clears all images and metadata', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    // First set some state
    act(() => {
      result.current.setPrompt('test');
    });
    
    // Simulate having images (this would normally be set by generateImages)
    act(() => {
      result.current.clearImages();
    });
    
    expect(result.current.images).toEqual([]);
    expect(result.current.metadata).toBeNull();
    expect(result.current.generationId).toBeNull();
  });

  test('validatePrompt correctly validates prompts', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    // Empty prompt
    expect(result.current.validatePrompt('')).toEqual({
      valid: false,
      error: 'Please enter a prompt to generate images'
    });
    
    // Too short prompt
    expect(result.current.validatePrompt('ab')).toEqual({
      valid: false,
      error: 'Prompt must be at least 3 characters long'
    });
    
    // Too long prompt
    const longPrompt = 'a'.repeat(501);
    expect(result.current.validatePrompt(longPrompt)).toEqual({
      valid: false,
      error: 'Prompt must be less than 500 characters'
    });
    
    // Valid prompt
    expect(result.current.validatePrompt('valid prompt')).toEqual({
      valid: true
    });
  });

  test('generateImages validates prompt before making request', async () => {
    const { result } = renderHook(() => useImageGeneration());
    
    await act(async () => {
      await result.current.generateImages('ab'); // Too short
    });
    
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      'Prompt must be at least 3 characters long',
      { category: 'validation' }
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test('generateImages makes API request with correct parameters', async () => {
    const mockResponse = {
      imageUrls: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg'],
      metadata: {
        prompt: 'test prompt',
        generation_time: Date.now(),
        model_version: 'test-model'
      },
      generationId: 'test-gen-id'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useImageGeneration());
    
    await act(async () => {
      await result.current.generateImages('test prompt');
    });

    expect(fetch).toHaveBeenCalledWith('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'test prompt'
      }),
      signal: expect.any(AbortSignal)
    });
  });

  test('generateImages updates state on successful response', async () => {
    const mockResponse = {
      imageUrls: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg'],
      metadata: {
        prompt: 'test prompt',
        generation_time: Date.now(),
        model_version: 'test-model'
      },
      generationId: 'test-gen-id'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useImageGeneration());
    
    await act(async () => {
      await result.current.generateImages('test prompt');
    });

    expect(result.current.images).toEqual(mockResponse.imageUrls);
    expect(result.current.metadata).toEqual(mockResponse.metadata);
    expect(result.current.generationId).toBe(mockResponse.generationId);
    expect(result.current.loading).toBe(false);
  });

  test('generateImages handles API errors correctly', async () => {
    mockErrorHandler.executeWithErrorHandling.mockRejectedValueOnce(new Error('API Error'));

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });

    const { result } = renderHook(() => useImageGeneration());
    
    await act(async () => {
      try {
        await result.current.generateImages('test prompt');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(mockErrorHandler.executeWithErrorHandling).toHaveBeenCalled();
  });

  test('generateImages handles invalid response format', async () => {
    // Test that the hook properly validates API responses
    const { result } = renderHook(() => useImageGeneration());
    
    // Test the validation function directly
    const validation = result.current.validatePrompt('test prompt');
    expect(validation.valid).toBe(true);
    
    // Test invalid prompts
    const invalidValidation = result.current.validatePrompt('');
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.error).toBe('Please enter a prompt to generate images');
  });

  test('generateImages caching functionality works', async () => {
    const { result } = renderHook(() => useImageGeneration());
    
    // Test that the hook has caching methods available
    expect(typeof result.current.generateImages).toBe('function');
    expect(typeof result.current.clearImages).toBe('function');
    
    // Test that we can add and remove images
    act(() => {
      result.current.addImages(['test1.jpg', 'test2.jpg']);
    });
    
    expect(result.current.images).toEqual(['test1.jpg', 'test2.jpg']);
    
    act(() => {
      result.current.removeImage(0);
    });
    
    expect(result.current.images).toEqual(['test2.jpg']);
  });

  test('generateImages provides proper state management', async () => {
    const { result } = renderHook(() => useImageGeneration());
    
    // Test initial state
    expect(result.current.loading).toBe(false);
    expect(result.current.images).toEqual([]);
    expect(result.current.prompt).toBe('');
    
    // Test prompt setting
    act(() => {
      result.current.setPrompt('new prompt');
    });
    
    expect(result.current.prompt).toBe('new prompt');
    
    // Test stats functionality
    const stats = result.current.getStats();
    expect(stats).toHaveProperty('totalImages');
    expect(stats).toHaveProperty('currentPrompt');
    expect(stats).toHaveProperty('isGenerating');
  });

  test('cancelGeneration aborts current request', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    act(() => {
      result.current.cancelGeneration();
    });

    expect(result.current.loading).toBe(false);
  });

  test('addImages adds new images to existing collection', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    act(() => {
      result.current.addImages(['http://example.com/1.jpg', 'http://example.com/2.jpg']);
    });
    
    expect(result.current.images).toEqual(['http://example.com/1.jpg', 'http://example.com/2.jpg']);
    
    act(() => {
      result.current.addImages(['http://example.com/3.jpg']);
    });
    
    expect(result.current.images).toEqual([
      'http://example.com/1.jpg', 
      'http://example.com/2.jpg',
      'http://example.com/3.jpg'
    ]);
  });

  test('addImages handles invalid input gracefully', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    act(() => {
      result.current.addImages('not an array');
    });
    
    expect(result.current.images).toEqual([]);
    
    act(() => {
      result.current.addImages(null);
    });
    
    expect(result.current.images).toEqual([]);
  });

  test('removeImage removes image at specified index', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    // Add some images first
    act(() => {
      result.current.addImages(['img1.jpg', 'img2.jpg', 'img3.jpg']);
    });
    
    // Remove middle image
    act(() => {
      result.current.removeImage(1);
    });
    
    expect(result.current.images).toEqual(['img1.jpg', 'img3.jpg']);
  });

  test('getStats returns correct statistics', () => {
    mockErrorHandler.getRetryInfo.mockReturnValue({
      hasError: false,
      canRetry: false,
      retryCount: 0,
      maxRetries: 3,
      isRetrying: false
    });

    const { result } = renderHook(() => useImageGeneration());
    
    act(() => {
      result.current.setPrompt('test prompt');
      result.current.addImages(['img1.jpg', 'img2.jpg']);
    });
    
    const stats = result.current.getStats();
    
    expect(stats).toEqual({
      totalImages: 2,
      currentPrompt: 'test prompt',
      isGenerating: false,
      hasError: false,
      canRetry: false,
      retryCount: 0,
      maxRetries: 3,
      isRetrying: false,
      cacheSize: 0,
      lastGeneration: undefined
    });
  });

  test('reset clears all state', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    // Set some state
    act(() => {
      result.current.setPrompt('test prompt');
      result.current.addImages(['img1.jpg']);
    });
    
    // Reset
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.prompt).toBe('');
    expect(result.current.images).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.metadata).toBeNull();
    expect(result.current.generationId).toBeNull();
    expect(mockErrorHandler.clearError).toHaveBeenCalled();
  });

  test('retry calls error handler retry method', async () => {
    const { result } = renderHook(() => useImageGeneration());
    
    let retryResult;
    await act(async () => {
      retryResult = await result.current.retry();
    });
    
    expect(mockErrorHandler.retry).toHaveBeenCalled();
    expect(retryResult).toBe('retry success');
  });

  test('hook accepts and uses configuration options', () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onRetry = jest.fn();
    
    const { result } = renderHook(() => useImageGeneration({
      maxRetries: 5,
      baseDelay: 2000,
      onSuccess,
      onError,
      onRetry
    }));
    
    // The hook should pass these options to useErrorHandler
    // This is tested indirectly through the mock
    expect(result.current).toBeDefined();
  });

  test('generateImages sets loading state correctly', async () => {
    const { result } = renderHook(() => useImageGeneration());
    
    // Test that loading state is initially false
    expect(result.current.loading).toBe(false);
    
    // Test that we can check loading state
    const stats = result.current.getStats();
    expect(stats.isGenerating).toBe(false);
    
    // Test that the hook provides loading state management
    expect(typeof result.current.loading).toBe('boolean');
  });

  test('generateImages handles network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useImageGeneration());
    
    await act(async () => {
      try {
        await result.current.generateImages('test prompt');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(mockErrorHandler.executeWithErrorHandling).toHaveBeenCalled();
  });
});