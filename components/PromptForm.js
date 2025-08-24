import { useState } from 'react';
import styles from './PromptForm.module.css';

const PromptForm = ({ prompt, onPromptChange, onSubmit, loading }) => {
  const [charCount, setCharCount] = useState(prompt.length);
  const maxLength = 500;

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCharCount(value.length);
    onPromptChange(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      return;
    }

    if (prompt.length > maxLength) {
      return;
    }

    onSubmit(prompt.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  const isValid = prompt.trim().length > 0 && prompt.length <= maxLength;
  const isNearLimit = charCount > maxLength * 0.8;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputContainer}>
        <label htmlFor="prompt" className={styles.label}>
          Describe the image you want to create
        </label>
        
        <div className={styles.textareaWrapper}>
          <textarea
            id="prompt"
            value={prompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="A serene landscape with mountains and a lake at sunset, painted in watercolor style..."
            className={`${styles.textarea} ${
              charCount > maxLength ? styles.error : ''
            }`}
            rows={4}
            maxLength={maxLength + 50} // Allow slight overflow for better UX
            disabled={loading}
          />
          
          <div className={styles.inputFooter}>
            <div className={`${styles.charCount} ${
              isNearLimit ? styles.warning : ''
            } ${charCount > maxLength ? styles.error : ''}`}>
              {charCount}/{maxLength}
            </div>
            
            <div className={styles.hint}>
              Press Ctrl+Enter to generate
            </div>
          </div>
        </div>

        {charCount > maxLength && (
          <div className={styles.errorMessage}>
            Prompt is too long. Please keep it under {maxLength} characters.
          </div>
        )}
      </div>

      <div className={styles.buttonContainer}>
        <button
          type="submit"
          disabled={!isValid || loading}
          className={`${styles.submitButton} ${
            loading ? styles.loading : ''
          }`}
        >
          {loading ? (
            <>
              <span className={styles.buttonSpinner}></span>
              Generating...
            </>
          ) : (
            <>
              <span className={styles.buttonIcon}>✨</span>
              Generate Images
            </>
          )}
        </button>
        
        {!loading && (
          <div className={styles.suggestions}>
            <p className={styles.suggestionsTitle}>Try these prompts:</p>
            <div className={styles.suggestionTags}>
              {[
                "A futuristic city at night",
                "Cute cat wearing a wizard hat",
                "Abstract art with vibrant colors",
                "Peaceful forest scene"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.suggestionTag}
                  onClick={() => onPromptChange(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default PromptForm;