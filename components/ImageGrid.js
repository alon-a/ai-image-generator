import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ImageGrid.module.css';

const ImageGrid = ({ images, prompt }) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());
  const [visibleImages, setVisibleImages] = useState(new Set());
  const observerRef = useRef(null);
  const imageRefs = useRef(new Map());

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!window.IntersectionObserver) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10);
            setVisibleImages(prev => new Set([...prev, index]));
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Set up intersection observer for new images
  useEffect(() => {
    if (!observerRef.current) return;

    imageRefs.current.forEach((element, index) => {
      if (element && !visibleImages.has(index)) {
        observerRef.current?.observe(element);
      }
    });
  }, [images, visibleImages]);

  const setImageRef = useCallback((element, index) => {
    if (element) {
      imageRefs.current.set(index, element);
    } else {
      imageRefs.current.delete(index);
    }
  }, []);

  const handleImageLoad = (index) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

  const handleImageError = (index) => {
    setFailedImages(prev => new Set([...prev, index]));
  };

  const downloadImage = useCallback(async (imageUrl, index) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-generated-image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Generated Images</h2>
        <p className={styles.prompt}>"{prompt}"</p>
      </div>
      
      <div className={styles.grid}>
        {images.map((imageUrl, index) => (
          <div 
            key={index} 
            className={styles.imageWrapper}
            ref={(el) => setImageRef(el, index)}
            data-index={index}
          >
            <div className={styles.imageContainer}>
              {!loadedImages.has(index) && !failedImages.has(index) && (
                <div className={styles.imagePlaceholder}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              )}
              
              {failedImages.has(index) ? (
                <div className={styles.errorPlaceholder}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <p className={styles.errorText}>Failed to load image</p>
                </div>
              ) : visibleImages.has(index) ? (
                <picture>
                  <source srcSet={imageUrl} type="image/webp" />
                  <img
                    src={imageUrl}
                    alt={`Generated image ${index + 1} for: ${prompt}`}
                    className={`${styles.image} ${
                      loadedImages.has(index) ? styles.loaded : styles.loading
                    }`}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                    loading="lazy"
                    decoding="async"
                    fetchpriority={index < 2 ? "high" : "low"}
                  />
                </picture>
              ) : (
                <div className={styles.imagePlaceholder}>
                  <div className={styles.lazyPlaceholder}>Loading...</div>
                </div>
              )}
              
              {loadedImages.has(index) && (
                <div className={styles.imageOverlay}>
                  <button
                    className={styles.downloadButton}
                    onClick={() => downloadImage(imageUrl, index)}
                    title="Download image"
                  >
                    ⬇️
                  </button>
                </div>
              )}
            </div>
            
            <div className={styles.imageInfo}>
              <span className={styles.imageNumber}>Image {index + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGrid;