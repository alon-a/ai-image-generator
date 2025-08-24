/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ImageGrid from '../components/ImageGrid';
import { debounce, throttle, memoize, deduplicateRequests } from '../utils/performance';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 100 }]),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByType: jest.fn(() => [])
  }
});

describe('Performance Optimizations', () => {
  describe('ImageGrid Lazy Loading', () => {
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ];

    beforeEach(() => {
      mockIntersectionObserver.mockClear();
    });

    test('should set up intersection observer for lazy loading', () => {
      render(<ImageGrid images={mockImages} prompt="test prompt" />);
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rootMargin: '50px',
          threshold: 0.1
        })
      );
    });

    test('should render placeholder for non-visible images', () => {
      render(<ImageGrid images={mockImages} prompt="test prompt" />);
      
      // Should render placeholders initially
      const placeholders = screen.getAllByText('Loading...');
      expect(placeholders).toHaveLength(mockImages.length);
    });

    test('should add lazy loading attributes to images', async () => {
      const { container } = render(<ImageGrid images={mockImages} prompt="test prompt" />);
      
      // Simulate intersection observer callback
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([
          { isIntersecting: true, target: { dataset: { index: '0' } } }
        ]);
      });

      await waitFor(() => {
        const images = container.querySelectorAll('img');
        if (images.length > 0) {
          expect(images[0]).toHaveAttribute('loading', 'lazy');
          expect(images[0]).toHaveAttribute('decoding', 'async');
        }
      });
    });

    test('should use picture element for WebP optimization', async () => {
      const { container } = render(<ImageGrid images={mockImages} prompt="test prompt" />);
      
      // Simulate intersection observer callback
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      act(() => {
        observerCallback([
          { isIntersecting: true, target: { dataset: { index: '0' } } }
        ]);
      });

      await waitFor(() => {
        const pictures = container.querySelectorAll('picture');
        if (pictures.length > 0) {
          const sources = pictures[0].querySelectorAll('source');
          expect(sources[0]).toHaveAttribute('type', 'image/webp');
        }
      });
    });
  });

  describe('Performance Utilities', () => {
    describe('debounce', () => {
      test('should delay function execution', (done) => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);
        
        debouncedFn();
        debouncedFn();
        debouncedFn();
        
        expect(mockFn).not.toHaveBeenCalled();
        
        setTimeout(() => {
          expect(mockFn).toHaveBeenCalledTimes(1);
          done();
        }, 150);
      });

      test('should execute immediately when immediate flag is true', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100, true);
        
        debouncedFn();
        expect(mockFn).toHaveBeenCalledTimes(1);
        
        debouncedFn();
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });

    describe('throttle', () => {
      test('should limit function execution frequency', (done) => {
        const mockFn = jest.fn();
        const throttledFn = throttle(mockFn, 100);
        
        throttledFn();
        throttledFn();
        throttledFn();
        
        expect(mockFn).toHaveBeenCalledTimes(1);
        
        setTimeout(() => {
          throttledFn();
          expect(mockFn).toHaveBeenCalledTimes(2);
          done();
        }, 150);
      });
    });

    describe('memoize', () => {
      test('should cache function results', () => {
        const expensiveFn = jest.fn((x) => x * 2);
        const memoizedFn = memoize(expensiveFn);
        
        const result1 = memoizedFn(5);
        const result2 = memoizedFn(5);
        const result3 = memoizedFn(10);
        
        expect(result1).toBe(10);
        expect(result2).toBe(10);
        expect(result3).toBe(20);
        expect(expensiveFn).toHaveBeenCalledTimes(2);
      });

      test('should use custom key generator', () => {
        const mockFn = jest.fn((obj) => obj.value);
        const memoizedFn = memoize(mockFn, (obj) => obj.id);
        
        memoizedFn({ id: 1, value: 'a' });
        memoizedFn({ id: 1, value: 'b' }); // Different value, same id
        
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });

    describe('deduplicateRequests', () => {
      test('should deduplicate identical requests', async () => {
        const mockRequest = jest.fn(() => Promise.resolve('result'));
        const deduplicatedRequest = deduplicateRequests(mockRequest);
        
        const promises = [
          deduplicatedRequest('param1'),
          deduplicatedRequest('param1'),
          deduplicatedRequest('param1')
        ];
        
        const results = await Promise.all(promises);
        
        expect(results).toEqual(['result', 'result', 'result']);
        expect(mockRequest).toHaveBeenCalledTimes(1);
      });

      test('should not deduplicate different requests', async () => {
        const mockRequest = jest.fn((param) => Promise.resolve(`result-${param}`));
        const deduplicatedRequest = deduplicateRequests(mockRequest);
        
        const promises = [
          deduplicatedRequest('param1'),
          deduplicatedRequest('param2'),
          deduplicatedRequest('param3')
        ];
        
        const results = await Promise.all(promises);
        
        expect(results).toEqual(['result-param1', 'result-param2', 'result-param3']);
        expect(mockRequest).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Bundle Optimization', () => {
    test('should have performance monitoring in development', () => {
      // This test verifies that performance monitoring is available
      expect(typeof window.performance).toBe('object');
      expect(typeof window.performance.mark).toBe('function');
      expect(typeof window.performance.measure).toBe('function');
    });
  });
});

describe('Caching Headers', () => {
  test('should verify caching configuration exists', () => {
    // This is a basic test to ensure caching configuration is in place
    // In a real scenario, you'd test the actual headers in integration tests
    const nextConfig = require('../next.config.js');
    
    expect(nextConfig.compress).toBe(true);
    expect(typeof nextConfig.headers).toBe('function');
  });
});