import '../styles/globals.css';
import { useEffect, useState } from 'react';
import PerformanceMonitor from '../components/PerformanceMonitor';

/**
 * Custom App Component
 * @description This component wraps all pages and allows for global CSS imports
 * and app-wide configurations
 */
export default function App({ Component, pageProps }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Component {...pageProps} />
      {isMounted && (
        <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
      )}
    </>
  );
}