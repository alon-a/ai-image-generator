import { useEffect, useState } from 'react';
import { measurePerformance, analyzeBundleSize } from '../utils/performance';

/**
 * Performance monitoring component for development
 * Tracks and displays performance metrics
 */
const PerformanceMonitor = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    bundleSize: null,
    imageLoadTimes: [],
    apiResponseTimes: []
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Monitor initial render performance
    const measureRender = async () => {
      const renderTime = await measurePerformance('component-render', async () => {
        // Simulate component render measurement
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      setMetrics(prev => ({ ...prev, renderTime }));
    };

    measureRender();

    // Analyze bundle size
    const bundleAnalyzer = analyzeBundleSize();
    if (bundleAnalyzer) {
      const bundleSize = bundleAnalyzer.getResourceSizes();
      setMetrics(prev => ({ ...prev, bundleSize }));
      
      // Log bundle analysis
      setTimeout(() => {
        bundleAnalyzer.logBundleAnalysis();
      }, 2000);
    }

    let imageObserver, apiObserver;

    // Monitor image loading performance (only in browser)
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        imageObserver = new PerformanceObserver((list) => {
          const imageEntries = list.getEntries().filter(entry => 
            entry.name.includes('image') || 
            entry.name.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)
          );
          
          if (imageEntries.length > 0) {
            setMetrics(prev => ({
              ...prev,
              imageLoadTimes: [...prev.imageLoadTimes, ...imageEntries.map(e => e.duration)]
            }));
          }
        });

        // Monitor API performance
        apiObserver = new PerformanceObserver((list) => {
          const apiEntries = list.getEntries().filter(entry => 
            entry.name.includes('/api/')
          );
          
          if (apiEntries.length > 0) {
            setMetrics(prev => ({
              ...prev,
              apiResponseTimes: [...prev.apiResponseTimes, ...apiEntries.map(e => e.duration)]
            }));
          }
        });

        imageObserver.observe({ entryTypes: ['resource'] });
        apiObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }

    return () => {
      if (imageObserver) imageObserver.disconnect();
      if (apiObserver) apiObserver.disconnect();
    };
  }, [enabled]);

  // Performance logging
  useEffect(() => {
    if (!enabled || !metrics.bundleSize) return;

    const logPerformanceMetrics = () => {
      console.group('🚀 Performance Metrics');
      
      if (metrics.bundleSize) {
        console.log('📦 Bundle Size:', {
          total: `${(metrics.bundleSize.totalSize / 1024).toFixed(2)} KB`,
          js: `${(metrics.bundleSize.jsSize / 1024).toFixed(2)} KB`,
          css: `${(metrics.bundleSize.cssSize / 1024).toFixed(2)} KB`,
          images: `${(metrics.bundleSize.imageSize / 1024).toFixed(2)} KB`
        });
      }
      
      if (metrics.imageLoadTimes.length > 0) {
        const avgImageLoad = metrics.imageLoadTimes.reduce((a, b) => a + b, 0) / metrics.imageLoadTimes.length;
        console.log('🖼️ Image Loading:', {
          average: `${avgImageLoad.toFixed(2)}ms`,
          count: metrics.imageLoadTimes.length,
          fastest: `${Math.min(...metrics.imageLoadTimes).toFixed(2)}ms`,
          slowest: `${Math.max(...metrics.imageLoadTimes).toFixed(2)}ms`
        });
      }
      
      if (metrics.apiResponseTimes.length > 0) {
        const avgApiResponse = metrics.apiResponseTimes.reduce((a, b) => a + b, 0) / metrics.apiResponseTimes.length;
        console.log('🌐 API Performance:', {
          average: `${avgApiResponse.toFixed(2)}ms`,
          count: metrics.apiResponseTimes.length,
          fastest: `${Math.min(...metrics.apiResponseTimes).toFixed(2)}ms`,
          slowest: `${Math.max(...metrics.apiResponseTimes).toFixed(2)}ms`
        });
      }
      
      console.groupEnd();
    };

    // Log metrics after a delay to collect data
    const timeoutId = setTimeout(logPerformanceMetrics, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [enabled, metrics]);

  // Don't render anything in production
  if (!enabled) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div>🚀 Performance Monitor</div>
      {metrics.bundleSize && (
        <div>Bundle: {(metrics.bundleSize.totalSize / 1024).toFixed(1)}KB</div>
      )}
      {metrics.imageLoadTimes.length > 0 && (
        <div>Images: {metrics.imageLoadTimes.length} loaded</div>
      )}
      {metrics.apiResponseTimes.length > 0 && (
        <div>API calls: {metrics.apiResponseTimes.length}</div>
      )}
    </div>
  );
};

export default PerformanceMonitor;