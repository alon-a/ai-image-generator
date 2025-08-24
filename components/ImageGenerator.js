import { useState, useCallback, useMemo } from 'react';
import PromptForm from './PromptForm';
import ImageGrid from './ImageGrid';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import useImageGeneration from '../hooks/useImageGeneration';
import styles from './ImageGenerator.module.css';

const ImageGenerator = () => {
  // Use the enhanced hook with deduplication and retry logic
  const {
    prompt,
    setPrompt,
    images,
    loading,
    error,
    generateImages,
    retry,
    getStats
  } = useImageGeneration({
    maxRetries: 3,
    baseDelay: 1000,
    onSuccess: (result, attempts) => {
      if (attempts > 1) {
        console.log(`Image generation succeeded after ${attempts} attempts`);
      }
    },
    onError: (error, context) => {
      console.error('Image generation failed:', error, context);
    }
  });

  // Memoized handlers for performance
  const handleGenerateImages = useCallback(async (promptText) => {
    try {
      await generateImages(promptText);
    } catch (error) {
      // Error is already handled by the hook
      console.error('Generation failed:', error);
    }
  }, [generateImages]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  // Performance stats for debugging (can be removed in production)
  const stats = useMemo(() => getStats(), [getStats, images, loading, error]);

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Image Generator</h1>
        <p className={styles.description}>
          Create stunning images from your text descriptions using AI
        </p>
      </div>

      <PromptForm
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleGenerateImages}
        loading={loading}
      />

      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={handleRetry}
          showRetry={!!prompt.trim()}
        />
      )}

      {loading && <LoadingSpinner />}

      {images.length > 0 && (
        <ImageGrid images={images} prompt={prompt} />
      )}
    </main>
  );
};

export default ImageGenerator;