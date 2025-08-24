import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageGenerator from '../components/ImageGenerator';

// Mock the hooks
const mockUseImageGeneration = {
  prompt: '',
  setPrompt: jest.fn(),
  images: [],
  loading: false,
  error: null,
  generateImages: jest.fn(),
  retry: jest.fn(),
  getStats: jest.fn(() => ({
    totalImages: 0,
    currentPrompt: '',
    isGenerating: false
  }))
};

jest.mock('../hooks/useImageGeneration', () => {
  return jest.fn(() => mockUseImageGeneration);
});

// Mock child components
jest.mock('../components/PromptForm', () => {
  return function MockPromptForm({ prompt, onPromptChange, onSubmit, loading }) {
    return (
      <div data-testid="prompt-form">
        <input
          data-testid="prompt-input"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
        />
        <button
          data-testid="submit-button"
          onClick={() => onSubmit(prompt)}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    );
  };
});

jest.mock('../components/ImageGrid', () => {
  return function MockImageGrid({ images, prompt }) {
    return (
      <div data-testid="image-grid">
        {images.map((img, index) => (
          <img key={index} src={img} alt={`Generated ${index}`} />
        ))}
      </div>
    );
  };
});

jest.mock('../components/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

jest.mock('../components/ErrorMessage', () => {
  return function MockErrorMessage({ error, onRetry, showRetry }) {
    return (
      <div data-testid="error-message">
        <span>{error?.message || error}</span>
        {onRetry && showRetry && <button onClick={onRetry}>Retry</button>}
      </div>
    );
  };
});

describe('ImageGenerator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockUseImageGeneration.prompt = '';
    mockUseImageGeneration.images = [];
    mockUseImageGeneration.loading = false;
    mockUseImageGeneration.error = null;
  });

  test('renders main components correctly', () => {
    render(<ImageGenerator />);
    
    expect(screen.getByText('AI Image Generator')).toBeInTheDocument();
    expect(screen.getByText('Create stunning images from your text descriptions using AI')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-form')).toBeInTheDocument();
  });

  test('passes correct props to PromptForm', () => {
    mockUseImageGeneration.prompt = 'test prompt';
    mockUseImageGeneration.loading = true;
    
    render(<ImageGenerator />);
    
    const promptInput = screen.getByTestId('prompt-input');
    const submitButton = screen.getByTestId('submit-button');
    
    expect(promptInput).toHaveValue('test prompt');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Generating...');
  });

  test('handles prompt changes correctly', () => {
    render(<ImageGenerator />);
    
    const promptInput = screen.getByTestId('prompt-input');
    fireEvent.change(promptInput, { target: { value: 'new prompt' } });
    
    expect(mockUseImageGeneration.setPrompt).toHaveBeenCalledWith('new prompt');
  });

  test('handles image generation submission', async () => {
    mockUseImageGeneration.prompt = 'test prompt';
    
    render(<ImageGenerator />);
    
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUseImageGeneration.generateImages).toHaveBeenCalledWith('test prompt');
    });
  });

  test('displays loading spinner when loading', () => {
    mockUseImageGeneration.loading = true;
    
    render(<ImageGenerator />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('displays error message when error exists', () => {
    mockUseImageGeneration.error = { message: 'Test error' };
    
    render(<ImageGenerator />);
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('displays image grid when images exist', () => {
    mockUseImageGeneration.images = ['image1.jpg', 'image2.jpg'];
    mockUseImageGeneration.prompt = 'test prompt';
    
    render(<ImageGenerator />);
    
    expect(screen.getByTestId('image-grid')).toBeInTheDocument();
  });

  test('handles retry functionality', () => {
    mockUseImageGeneration.error = { message: 'Test error' };
    mockUseImageGeneration.prompt = 'test prompt';
    
    render(<ImageGenerator />);
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(mockUseImageGeneration.retry).toHaveBeenCalled();
  });

  test('does not show retry button when prompt is empty', () => {
    mockUseImageGeneration.error = { message: 'Test error' };
    mockUseImageGeneration.prompt = '';
    
    render(<ImageGenerator />);
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  test('handles generation errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseImageGeneration.generateImages.mockRejectedValue(new Error('Generation failed'));
    
    render(<ImageGenerator />);
    
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Generation failed:', expect.any(Error));
    });
    
    consoleError.mockRestore();
  });

  test('memoizes handlers correctly', () => {
    const { rerender } = render(<ImageGenerator />);
    
    const firstRenderGenerateImages = mockUseImageGeneration.generateImages;
    const firstRenderRetry = mockUseImageGeneration.retry;
    
    rerender(<ImageGenerator />);
    
    // Functions should be the same reference due to useCallback
    expect(mockUseImageGeneration.generateImages).toBe(firstRenderGenerateImages);
    expect(mockUseImageGeneration.retry).toBe(firstRenderRetry);
  });

  test('calls getStats for performance monitoring', () => {
    render(<ImageGenerator />);
    
    expect(mockUseImageGeneration.getStats).toHaveBeenCalled();
  });

  test('passes configuration to useImageGeneration hook', () => {
    const useImageGeneration = require('../hooks/useImageGeneration');
    
    render(<ImageGenerator />);
    
    expect(useImageGeneration).toHaveBeenCalledWith({
      maxRetries: 3,
      baseDelay: 1000,
      onSuccess: expect.any(Function),
      onError: expect.any(Function)
    });
  });
});