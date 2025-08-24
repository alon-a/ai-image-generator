/**
 * Performance monitoring and optimization utilities
 */

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memoization utility for expensive computations
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Function to generate cache key
 * @returns {Function} Memoized function
 */
export const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return function memoized(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

/**
 * Performance measurement utility
 * @param {string} name - Performance mark name
 * @param {Function} fn - Function to measure
 * @returns {Promise} Function result with performance data
 */
export const measurePerformance = async (name, fn) => {
  if (typeof window === 'undefined' || !window.performance || !performance.mark) {
    return await fn();
  }
  
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-measure`;
  
  try {
    // Clear any existing marks first
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
    
    performance.mark(startMark);
    
    const result = await fn();
    
    performance.mark(endMark);
    
    // Check if marks exist before measuring
    const startEntries = performance.getEntriesByName(startMark);
    const endEntries = performance.getEntriesByName(endMark);
    
    if (startEntries.length > 0 && endEntries.length > 0) {
      performance.measure(measureName, startMark, endMark);
      
      const measures = performance.getEntriesByName(measureName);
      if (measures.length > 0) {
        console.log(`Performance: ${name} took ${measures[0].duration.toFixed(2)}ms`);
      }
    }
    
    return result;
  } catch (error) {
    console.warn(`Performance measurement failed for ${name}:`, error);
    return await fn();
  } finally {
    // Clean up marks and measures
    try {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
};

/**
 * Image preloader utility
 * @param {string[]} imageUrls - Array of image URLs to preload
 * @returns {Promise} Promise that resolves when all images are loaded
 */
export const preloadImages = (imageUrls) => {
  return Promise.allSettled(
    imageUrls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      });
    })
  );
};

/**
 * Lazy loading utility for components
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Loading options
 * @returns {React.Component} Lazy loaded component
 */
export const lazyLoad = (importFn, options = {}) => {
  const { 
    fallback = null, 
    delay = 0,
    retries = 3 
  } = options;
  
  let retryCount = 0;
  
  const loadWithRetry = async () => {
    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return await importFn();
    } catch (error) {
      if (retryCount < retries) {
        retryCount++;
        console.warn(`Lazy load retry ${retryCount}/${retries}:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return loadWithRetry();
      }
      throw error;
    }
  };
  
  return React.lazy(loadWithRetry);
};

/**
 * Request deduplication utility
 * @param {Function} requestFn - Request function
 * @param {Function} keyGenerator - Key generator for deduplication
 * @returns {Function} Deduplicated request function
 */
export const deduplicateRequests = (requestFn, keyGenerator = (...args) => JSON.stringify(args)) => {
  const pendingRequests = new Map();
  
  return async function deduplicatedRequest(...args) {
    const key = keyGenerator(...args);
    
    // If request is already pending, return the existing promise
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key);
    }
    
    // Create new request promise
    const requestPromise = requestFn(...args)
      .finally(() => {
        // Clean up after request completes
        pendingRequests.delete(key);
      });
    
    // Store the promise for deduplication
    pendingRequests.set(key, requestPromise);
    
    return requestPromise;
  };
};

/**
 * Resource cleanup utility
 * @param {Function} cleanupFn - Cleanup function
 * @param {number} delay - Delay before cleanup in milliseconds
 * @returns {Function} Cleanup function
 */
export const scheduleCleanup = (cleanupFn, delay = 5000) => {
  let timeoutId;
  
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(cleanupFn, delay);
  };
  
  cleanup.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return cleanup;
};

/**
 * Bundle size analyzer (development only)
 * @returns {Object} Bundle analysis data
 */
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const getResourceSizes = () => {
    if (typeof window === 'undefined' || !window.performance) {
      return {};
    }
    
    const resources = performance.getEntriesByType('resource');
    const analysis = {
      totalSize: 0,
      jsSize: 0,
      cssSize: 0,
      imageSize: 0,
      resources: []
    };
    
    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      const type = resource.name.split('.').pop()?.toLowerCase();
      
      analysis.totalSize += size;
      analysis.resources.push({
        name: resource.name,
        size,
        type,
        duration: resource.duration
      });
      
      if (['js', 'jsx', 'ts', 'tsx'].includes(type)) {
        analysis.jsSize += size;
      } else if (type === 'css') {
        analysis.cssSize += size;
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(type)) {
        analysis.imageSize += size;
      }
    });
    
    return analysis;
  };
  
  return {
    getResourceSizes,
    logBundleAnalysis: () => {
      const analysis = getResourceSizes();
      console.group('Bundle Analysis');
      console.log('Total Size:', (analysis.totalSize / 1024).toFixed(2), 'KB');
      console.log('JavaScript:', (analysis.jsSize / 1024).toFixed(2), 'KB');
      console.log('CSS:', (analysis.cssSize / 1024).toFixed(2), 'KB');
      console.log('Images:', (analysis.imageSize / 1024).toFixed(2), 'KB');
      console.groupEnd();
    }
  };
};