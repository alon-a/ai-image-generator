import { renderHook, act } from '@testing-library/react';
import useErrorHandler from '../hooks/useErrorHandler';

describe('useErrorHandler Hook', () => {
  test('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  test('handles string errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('Test error message');
    });
    
    expect(result.current.error).toEqual(
      expect.objectContaining({
        message: 'Test error message',
        category: 'unknown',
        retryable: true
      })
    );
  });

  test('handles Error objects correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Network connection failed');
    
    act(() => {
      result.current.handleError(testError);
    });
    
    expect(result.current.error).toEqual(
      expect.objectContaining({
        message: 'Network connection failed',
        category: 'network',
        retryable: true
      })
    );
  });

  test('categorizes validation errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('Invalid input provided');
    });
    
    expect(result.current.error.category).toBe('validation');
    expect(result.current.error.retryable).toBe(false);
  });

  test('categorizes configuration errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('API key is not configured');
    });
    
    expect(result.current.error.category).toBe('configuration');
    expect(result.current.error.retryable).toBe(false);
  });

  test('categorizes rate limit errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('Rate limit exceeded');
    });
    
    expect(result.current.error.category).toBe('rate_limit');
    expect(result.current.error.retryable).toBe(true);
  });

  test('clears error correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError('Test error');
    });
    
    expect(result.current.error).not.toBeNull();
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);
  });

  test('executeWithErrorHandling succeeds on first try', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    let operationResult;
    await act(async () => {
      operationResult = await result.current.executeWithErrorHandling(mockOperation);
    });
    
    expect(operationResult).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  test('executeWithErrorHandling retries on failure', async () => {
    const { result } = renderHook(() => useErrorHandler({
      maxRetries: 2,
      baseDelay: 10 // Short delay for testing
    }));
    
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce('success');
    
    let operationResult;
    await act(async () => {
      operationResult = await result.current.executeWithErrorHandling(mockOperation);
    });
    
    expect(operationResult).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  test('executeWithErrorHandling fails after max retries', async () => {
    const { result } = renderHook(() => useErrorHandler({
      maxRetries: 1,
      baseDelay: 10
    }));
    
    const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    
    await act(async () => {
      try {
        await result.current.executeWithErrorHandling(mockOperation);
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    expect(result.current.error).not.toBeNull();
    expect(result.current.error.message).toBe('Persistent failure');
  });

  test('does not retry non-retryable errors', async () => {
    const { result } = renderHook(() => useErrorHandler({
      maxRetries: 2,
      baseDelay: 10
    }));
    
    const mockOperation = jest.fn().mockRejectedValue(new Error('Invalid input'));
    
    await act(async () => {
      try {
        await result.current.executeWithErrorHandling(mockOperation);
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(mockOperation).toHaveBeenCalledTimes(1); // No retries for validation errors
    expect(result.current.error.category).toBe('validation');
  });

  test('getRetryInfo provides correct information', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // Initially no error
    expect(result.current.getRetryInfo()).toEqual({
      canRetry: false,
      retryCount: 0,
      maxRetries: 3,
      isRetrying: false,
      hasError: false
    });
    
    // After error
    act(() => {
      result.current.handleError('Network error');
    });
    
    const retryInfo = result.current.getRetryInfo();
    expect(retryInfo.hasError).toBe(true);
    expect(retryInfo.canRetry).toBe(false); // No operation to retry yet
  });

  test('calls callback functions correctly', () => {
    const onError = jest.fn();
    const onRetry = jest.fn();
    const onSuccess = jest.fn();
    
    const { result } = renderHook(() => useErrorHandler({
      onError,
      onRetry,
      onSuccess
    }));
    
    act(() => {
      result.current.handleError('Test error');
    });
    
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      {}
    );
  });

  test('isRetryable correctly identifies retryable errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(result.current.isRetryable({ retryable: true })).toBe(true);
    expect(result.current.isRetryable({ retryable: false })).toBe(false);
    expect(result.current.isRetryable(null)).toBe(false);
    expect(result.current.isRetryable('string')).toBe(false);
  });
});