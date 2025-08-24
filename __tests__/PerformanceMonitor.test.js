import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceMonitor from '../components/PerformanceMonitor';

// Mock the performance utilities
jest.mock('../utils/performance', () => ({
  measurePerformance: jest.fn(),
  analyzeBundleSize: jest.fn()
}));

import { measurePerformance, analyzeBundleSize } from '../utils/performance';

// Mock PerformanceObserver
const mockPerformanceObserver = jest.fn();
mockPerformanceObserver.mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  getEntries: jest.fn(() => [])
}));
global.PerformanceObserver = mockPerformanceObserver;

describe('PerformanceMonitor Component', () => {
  const originalEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Mock console methods
    jest.spyOn(console, 'group').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  test('renders nothing in production by default', () => {
    process.env.NODE_ENV = 'production';
    const { container } = render(<PerformanceMonitor />);
    
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when explicitly disabled', () => {
    process.env.NODE_ENV = 'development';
    const { container } = render(<PerformanceMonitor enabled={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('renders performance monitor in development', () => {
    process.env.NODE_ENV = 'development';
    render(<PerformanceMonitor />);
    
    expect(screen.getByText('🚀 Performance Monitor')).toBeInTheDocument();
  });

  test('renders when explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    render(<PerformanceMonitor enabled={true} />);
    
    expect(screen.getByText('🚀 Performance Monitor')).toBeInTheDocument();
  });

  test('measures render performance on mount', async () => {
    measurePerformance.mockResolvedValue(150);
    
    render(<PerformanceMonitor enabled={true} />);
    
    await waitFor(() => {
      expect(measurePerformance).toHaveBeenCalledWith(
        'component-render',
        expect.any(Function)
      );
    });
  });

  test('analyzes bundle size on mount', () => {
    const mockAnalyzer = {
      getResourceSizes: jest.fn(() => ({
        totalSize: 1024000,
        jsSize: 512000,
        cssSize: 256000,
        imageSize: 256000
      })),
      logBundleAnalysis: jest.fn()
    };
    
    analyzeBundleSize.mockReturnValue(mockAnalyzer);
    
    render(<PerformanceMonitor enabled={true} />);
    
    expect(analyzeBundleSize).toHaveBeenCalled();
    expect(mockAnalyzer.getResourceSizes).toHaveBeenCalled();
  });

  test('displays bundle size when available', async () => {
    const mockAnalyzer = {
      getResourceSizes: jest.fn(() => ({
        totalSize: 1024000, // 1000KB
        jsSize: 512000,
        cssSize: 256000,
        imageSize: 256000
      })),
      logBundleAnalysis: jest.fn()
    };
    
    analyzeBundleSize.mockReturnValue(mockAnalyzer);
    
    render(<PerformanceMonitor enabled={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Bundle: 1000.0KB')).toBeInTheDocument();
    });
  });

  test('sets up performance observers', () => {
    render(<PerformanceMonitor enabled={true} />);
    
    expect(mockPerformanceObserver).toHaveBeenCalledTimes(2); // Image and API observers
    expect(mockPerformanceObserver).toHaveBeenCalledWith(expect.any(Function));
  });

  test('handles performance observer not supported', () => {
    const consoleWarn = jest.spyOn(console, 'warn');
    
    // Mock observer.observe to throw
    mockPerformanceObserver.mockImplementation(() => ({
      observe: jest.fn(() => { throw new Error('Not supported'); }),
      disconnect: jest.fn()
    }));
    
    render(<PerformanceMonitor enabled={true} />);
    
    expect(consoleWarn).toHaveBeenCalledWith('Performance Observer not supported:', expect.any(Error));
  });

  test('tracks image loading performance', async () => {
    let imageObserverCallback;
    
    mockPerformanceObserver.mockImplementation((callback) => {
      if (!imageObserverCallback) {
        imageObserverCallback = callback;
      }
      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
    });
    
    render(<PerformanceMonitor enabled={true} />);
    
    // Simulate image loading entries
    const mockEntries = [
      { name: 'image1.jpg', duration: 150 },
      { name: 'image2.png', duration: 200 }
    ];
    
    imageObserverCallback({
      getEntries: () => mockEntries
    });
    
    await waitFor(() => {
      expect(screen.getByText('Images: 2 loaded')).toBeInTheDocument();
    });
  });

  test('tracks API performance', async () => {
    let apiObserverCallback;
    
    mockPerformanceObserver.mockImplementation((callback) => {
      if (apiObserverCallback) {
        // This is the second observer (API observer)
        return {
          observe: jest.fn(),
          disconnect: jest.fn()
        };
      } else {
        apiObserverCallback = callback;
        return {
          observe: jest.fn(),
          disconnect: jest.fn()
        };
      }
    });
    
    render(<PerformanceMonitor enabled={true} />);
    
    // Simulate API entries
    const mockEntries = [
      { name: '/api/generate-image', duration: 2000 },
      { name: '/api/health', duration: 100 }
    ];
    
    if (apiObserverCallback) {
      apiObserverCallback({
        getEntries: () => mockEntries
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText('API calls: 2')).toBeInTheDocument();
    });
  });

  test('logs performance metrics after delay', async () => {
    const mockAnalyzer = {
      getResourceSizes: jest.fn(() => ({
        totalSize: 1024000,
        jsSize: 512000,
        cssSize: 256000,
        imageSize: 256000
      })),
      logBundleAnalysis: jest.fn()
    };
    
    analyzeBundleSize.mockReturnValue(mockAnalyzer);
    
    render(<PerformanceMonitor enabled={true} />);
    
    // Fast-forward time to trigger logging
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(console.group).toHaveBeenCalledWith('🚀 Performance Metrics');
      expect(console.log).toHaveBeenCalledWith('📦 Bundle Size:', expect.any(Object));
      expect(console.groupEnd).toHaveBeenCalled();
    });
  });

  test('calls bundle analyzer logBundleAnalysis after delay', async () => {
    const mockAnalyzer = {
      getResourceSizes: jest.fn(() => ({ totalSize: 1024000 })),
      logBundleAnalysis: jest.fn()
    };
    
    analyzeBundleSize.mockReturnValue(mockAnalyzer);
    
    render(<PerformanceMonitor enabled={true} />);
    
    // Fast-forward time to trigger bundle analysis logging
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(mockAnalyzer.logBundleAnalysis).toHaveBeenCalled();
    });
  });

  test('disconnects observers on unmount', () => {
    const mockDisconnect = jest.fn();
    
    mockPerformanceObserver.mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: mockDisconnect
    }));
    
    const { unmount } = render(<PerformanceMonitor enabled={true} />);
    
    unmount();
    
    expect(mockDisconnect).toHaveBeenCalledTimes(2); // Both observers
  });

  test('clears timeouts on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { unmount } = render(<PerformanceMonitor enabled={true} />);
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test('handles missing bundle analyzer gracefully', () => {
    analyzeBundleSize.mockReturnValue(null);
    
    expect(() => {
      render(<PerformanceMonitor enabled={true} />);
    }).not.toThrow();
  });

  test('has correct styling for development overlay', () => {
    render(<PerformanceMonitor enabled={true} />);
    
    const monitor = screen.getByText('🚀 Performance Monitor').parentElement;
    
    expect(monitor).toHaveStyle({
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      zIndex: '9999'
    });
  });

  test('filters image entries correctly', async () => {
    let observerCallback;
    
    mockPerformanceObserver.mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
    });
    
    render(<PerformanceMonitor enabled={true} />);
    
    // Simulate mixed entries
    const mockEntries = [
      { name: 'image1.jpg', duration: 150 },
      { name: 'script.js', duration: 100 },
      { name: 'photo.png', duration: 200 },
      { name: 'style.css', duration: 50 }
    ];
    
    observerCallback({
      getEntries: () => mockEntries
    });
    
    await waitFor(() => {
      // Should only count image files
      expect(screen.getByText('Images: 2 loaded')).toBeInTheDocument();
    });
  });

  test('filters API entries correctly', async () => {
    let apiObserverCallback;
    
    mockPerformanceObserver.mockImplementation((callback) => {
      if (apiObserverCallback) {
        return { observe: jest.fn(), disconnect: jest.fn() };
      }
      apiObserverCallback = callback;
      return { observe: jest.fn(), disconnect: jest.fn() };
    });
    
    render(<PerformanceMonitor enabled={true} />);
    
    // Simulate mixed entries
    const mockEntries = [
      { name: '/api/generate-image', duration: 2000 },
      { name: '/static/image.jpg', duration: 100 },
      { name: '/api/health', duration: 50 }
    ];
    
    if (apiObserverCallback) {
      apiObserverCallback({
        getEntries: () => mockEntries
      });
    }
    
    await waitFor(() => {
      // Should only count API calls
      expect(screen.getByText('API calls: 2')).toBeInTheDocument();
    });
  });
});