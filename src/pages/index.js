import { useState } from 'react';
import styles from '../../styles/Home.module.css';

/**
 * Home Page Component - Text to Image Generator
 * @component
 * @description A React component that provides a user interface for generating images from text descriptions using FAL AI
 * 
 * @example
 * return (
 *   <Home />
 * )
 */
export default function Home() {
  /** @type {[string, function]} State for the text prompt */
  const [prompt, setPrompt] = useState('');
  /** @type {[string[], function]} State for the generated image URLs */
  const [imageUrls, setImageUrls] = useState([]);
  /** @type {[boolean, function]} State for loading status */
  const [loading, setLoading] = useState(false);
  /** @type {[string | null, function]} State for error handling */
  const [error, setError] = useState(null);

  /**
   * Handles form submission and image generation
   * @async
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setImageUrls([]);
    setError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to generate images');
      }

      if (!data.imageUrls || !Array.isArray(data.imageUrls)) {
        throw new Error('Invalid response format from server');
      }

      setImageUrls(data.imageUrls);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to generate images');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>AI Image Generator</h1>
        <p className={styles.description}>
          Enter a prompt to generate four unique variations
        </p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your image description..."
            className={styles.input}
            required
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !prompt.trim()}
            className={styles.button}
          >
            {loading ? 'Generating...' : 'Generate Images'}
          </button>
        </form>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {loading && (
          <div className={styles.loadingGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={styles.loadingPlaceholder}>
                <div className={styles.loadingSpinner} />
              </div>
            ))}
          </div>
        )}

        {!loading && imageUrls.length > 0 && (
          <div className={styles.imageGrid}>
            {imageUrls.map((url, index) => (
              <div key={index} className={styles.imageWrapper}>
                <img 
                  src={url} 
                  alt={`${prompt} - variation ${index + 1}`}
                  className={styles.generatedImage}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 