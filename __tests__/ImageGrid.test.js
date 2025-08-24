import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageGrid from '../components/ImageGrid';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch for download functionality
global.fetch = jest.fn();

describe('ImageGrid Component', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg'
  ];
  const mockPrompt = 'A beautiful landscape';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['fake image data'], { type: 'image/png' }))
    });
  });

  test('renders null when no images provided', () => {
    const { container } = render(<ImageGrid images={[]} prompt={mockPrompt} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders null when images is null or undefined', () => {
    const { container: container1 } = render(<ImageGrid images={null} prompt={mockPrompt} />);
    const { container: container2 } = render(<ImageGrid images={undefined} prompt={mockPrompt} />);
    
    expect(container1.firstChild).toBeNull();
    expect(container2.firstChild).toBeNull();
  });

  test('renders header with title and prompt', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    expect(screen.getByText('Generated Images')).toBeInTheDocument();
    expect(screen.getByText(`"${mockPrompt}"`)).toBeInTheDocument();
  });

  test('renders correct number of image containers', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const imageContainers = screen.getAllByRole('img', { hidden: true });
    expect(imageContainers).toHaveLength(mockImages.length);
  });

  test('sets up intersection observer for lazy loading', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  });

  test('handles image load success', async () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const firstImage = screen.getAllByRole('img')[0];
    
    // Simulate image load
    fireEvent.load(firstImage);
    
    await waitFor(() => {
      expect(firstImage).toHaveClass('loaded');
    });
  });

  test('handles image load error', async () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const firstImage = screen.getAllByRole('img')[0];
    
    // Simulate image error
    fireEvent.error(firstImage);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
  });

  test('shows loading placeholder initially', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    expect(screen.getAllByText('Loading...')).toHaveLength(mockImages.length);
  });

  test('displays download button after image loads', async () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const firstImage = screen.getAllByRole('img')[0];
    fireEvent.load(firstImage);
    
    await waitFor(() => {
      expect(screen.getByTitle('Download image')).toBeInTheDocument();
    });
  });

  test('handles image download', async () => {
    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    };
    const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
    const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const firstImage = screen.getAllByRole('img')[0];
    fireEvent.load(firstImage);
    
    await waitFor(() => {
      const downloadButton = screen.getByTitle('Download image');
      fireEvent.click(downloadButton);
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(mockImages[0]);
      expect(createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('ai-generated-image-1.png');
    });
    
    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });

  test('handles download error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValue(new Error('Download failed'));
    
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const firstImage = screen.getAllByRole('img')[0];
    fireEvent.load(firstImage);
    
    await waitFor(() => {
      const downloadButton = screen.getByTitle('Download image');
      fireEvent.click(downloadButton);
    });
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to download image:', expect.any(Error));
    });
    
    consoleError.mockRestore();
  });

  test('sets correct alt text for images', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const images = screen.getAllByRole('img');
    images.forEach((img, index) => {
      expect(img).toHaveAttribute('alt', `Generated image ${index + 1} for: ${mockPrompt}`);
    });
  });

  test('sets correct image attributes for performance', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const images = screen.getAllByRole('img');
    images.forEach((img, index) => {
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
      
      // First two images should have high priority
      if (index < 2) {
        expect(img).toHaveAttribute('fetchpriority', 'high');
      } else {
        expect(img).toHaveAttribute('fetchpriority', 'low');
      }
    });
  });

  test('displays image numbers correctly', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    mockImages.forEach((_, index) => {
      expect(screen.getByText(`Image ${index + 1}`)).toBeInTheDocument();
    });
  });

  test('uses picture element with WebP source', () => {
    render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    const pictures = document.querySelectorAll('picture');
    expect(pictures).toHaveLength(mockImages.length);
    
    pictures.forEach((picture, index) => {
      const source = picture.querySelector('source');
      expect(source).toHaveAttribute('srcSet', mockImages[index]);
      expect(source).toHaveAttribute('type', 'image/webp');
    });
  });

  test('cleans up intersection observer on unmount', () => {
    const mockDisconnect = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: mockDisconnect,
    });
    
    const { unmount } = render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    unmount();
    
    expect(mockDisconnect).toHaveBeenCalled();
  });

  test('handles intersection observer not supported', () => {
    const originalIntersectionObserver = window.IntersectionObserver;
    delete window.IntersectionObserver;
    
    // Should not throw error
    expect(() => {
      render(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    }).not.toThrow();
    
    window.IntersectionObserver = originalIntersectionObserver;
  });

  test('observes new images when images prop changes', () => {
    const mockObserve = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: mockObserve,
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    
    const { rerender } = render(<ImageGrid images={mockImages.slice(0, 1)} prompt={mockPrompt} />);
    
    rerender(<ImageGrid images={mockImages} prompt={mockPrompt} />);
    
    // Should observe new images
    expect(mockObserve).toHaveBeenCalled();
  });
});