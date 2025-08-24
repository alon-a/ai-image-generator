/**
 * Integration tests for complete user workflows
 * Tests the interaction between components, hooks, and API
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ImageGenerator from '../../components/ImageGenerator';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}));

describe('Complete User Workflow Integration Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Successful Image Generation Workflow', () => {
    test('should complete full workflow from prompt to image display', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrls: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
            'https://example.com/image3.jpg',
            'https://example.com/image4.jpg'
          ],
          metadata: {
            prompt: 'A beautiful sunset over mountains',
            generation_time: 2500,
            model_version: 'flux/dev'
          },
          generationId: 'test-gen-123'
        })
      });

      render(<ImageGenerator />);

      // 1. User sees the initial interface
      expect(screen.getByText('AI Image Generator')).toBeInTheDocument();
      expect(screen.getByLabelText('Describe the image you want to create')).toBeInTheDocument();
      
      const generateButton = screen.getByRole('button', { name: /generate images/i });
      expect(generateButton).toBeDisabled();

      // 2. User enters a prompt
      const promptInput = screen.getByLabelText('Describe the image you want to create');
      await user.type(promptInput, 'A beautiful sunset over mountains');

      // 3. Generate button becomes enabled
      expect(generateButton).toBeEnabled();

      // 4. User clicks generate
      await user.click(generateButton);

      // 5. Loading state is shown
      expect(screen.getByText('Generating your images...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      // 6. API call is made with correct parameters
      expect(fetch).toHaveBeenCalledWith('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A beautiful sunset over mountains'
        }),
        signal: expect.any(AbortSignal)
      });

      // 7. Wait for API response and images to display
      await waitFor(() => {
        expect(screen.getByText('Generated Images')).toBeInTheDocument();
      });

      // 8. Images are displayed with correct information
      expect(screen.getByText('"A beautiful sunset over mountains"')).toBeInTheDocument();
      
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(4);
      
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('alt', `Generated image ${index + 1} for: A beautiful sunset over mountains`);
        expect(img).toHaveAttribute('src', `https://example.com/image${index + 1}.jpg`);
      });

      // 9. Image numbers are displayed
      expect(screen.getByText('Image 1')).toBeInTheDocument();
      expect(screen.getByText('Image 2')).toBeInTheDocument();
      expect(screen.getByText('Image 3')).toBeInTheDocument();
      expect(screen.getByText('Image 4')).toBeInTheDocument();

      // 10. Loading state is cleared
      expect(screen.queryByText('Generating your images...')).not.toBeInTheDocument();
      expect(generateButton).toBeEnabled();
    });

    test('should handle suggestion selection and generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrls: ['https://example.com/image1.jpg'],
          metadata: {
            prompt: 'A futuristic city at night',
            generation_time: 1500,
            model_version: 'flux/dev'
          },
          generationId: 'test-gen-456'
        })
      });

      render(<ImageGenerator />);

      // 1. User clicks on a suggestion
      const suggestion = screen.getByText('A futuristic city at night');
      await user.click(suggestion);

      // 2. Prompt is filled with suggestion
      const promptInput = screen.getByLabelText('Describe the image you want to create');
      expect(promptInput).toHaveValue('A futuristic city at night');

      // 3. Generate button is enabled
      const generateButton = screen.getByRole('button', { name: /generate images/i });
      expect(generateButton).toBeEnabled();

      // 4. User generates images
      await user.click(generateButton);

      // 5. API is called with suggestion text
      expect(fetch).toHaveBeenCalledWith('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A futuristic city at night'
        }),
        signal: expect.any(AbortSignal)
      });

      // 6. Images are generated successfully
      await waitFor(() => {
        expect(screen.getByText('Generated Images')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Workflow', () => {
    test('should handle API errors with retry functionality', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock API to fail first, then succeed
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            imageUrls: ['https://example.com/success.jpg'],
            metadata: {
              prompt: 'Test prompt',
              generation_time: 1000,
              model_version: 'flux/dev'
            },
            generationId: 'retry-success'
          })
        });

      render(<ImageGenerator />);

      // 1. User enters prompt and generates
      const promptInput = screen.getByLabelText('Describe the image you want to create');
      await user.type(promptInput, 'Test prompt');
      
      const generateButton = screen.getByRole('button', { name: /generate images/i });
      await user.click(generateButton);

      // 2. Error occurs and is displayed
      await waitFor(() => {
        expect(screen.getByText(/network/i)).toBeInTheDocument();
      });

      // 3. Retry button is available
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // 4. User clicks retry
      await user.click(retryButton);

      // 5. Second API call succeeds
      await waitFor(() => {
        expect(screen.getByText('Generated Images')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('should handle validation errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<ImageGenerator />);

      // 1. User enters invalid prompt (too long)
      const promptInput = screen.getByLabelText('Describe the image you want to create');
      const longPrompt = 'a'.repeat(501);
      await user.type(promptInput, longPrompt);

      // 2. Generate button should be disabled
      const generateButton = screen.getByRole('button', { name: /generate images/i });
      expect(generateButton).toBeDisabled();

      // 3. User tries to submit anyway (shouldn't work)
      await user.click(generateButton);

      // 4. No API call should be made
      expect(fetch).not.toHaveBeenCalled();

      // 5. User fixes the prompt
      await user.clear(promptInput);
      await user.type(promptInput, 'Valid prompt');

      // 6. Generate button becomes enabled
      expect(generateButton).toBeEnabled();
    });
  });

  describe('User Experience Features', () => {
    test('should show character count and warnings', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<ImageGenerator />);

      const promptInput = screen.getByLabelText('Describe the image you want to create');

      // 1. Initially shows 0/500
      expect(screen.getByText('0/500')).toBeInTheDocument();

      // 2. Shows count as user types
      await user.type(promptInput, 'Hello');
      expect(screen.getByText('5/500')).toBeInTheDocument();

      // 3. Shows warning near limit
      await user.clear(promptInput);
      const nearLimitText = 'a'.repeat(450);
      await user.type(promptInput, nearLimitText);
      
      const charCount = screen.getByText('450/500');
      expect(charCount).toBeInTheDocument();
      expect(charCount).toHaveClass('warning');

      // 4. Shows error over limit
      await user.type(promptInput, 'a'.repeat(60));
      expect(screen.getByText('Prompt is too long. Please keep it under 500 characters.')).toBeInTheDocument();
    });

    test('should support keyboard shortcuts', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrls: ['https://example.com/image1.jpg'],
          metadata: { prompt: 'Test', generation_time: 1000, model_version: 'flux/dev' },
          generationId: 'keyboard-test'
        })
      });

      render(<ImageGenerator />);

      const promptInput = screen.getByLabelText('Describe the image you want to create');
      
      // 1. User types prompt
      await user.type(promptInput, 'Test prompt');

      // 2. User uses Ctrl+Enter to submit
      await user.keyboard('{Control>}{Enter}{/Control}');

      // 3. API call is made
      expect(fetch).toHaveBeenCalledWith('/api/generate-image', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'Test prompt' })
      }));
    });

    test('should handle multiple rapid interactions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          imageUrls: ['https://example.com/image1.jpg'],
          metadata: { prompt: 'Test', generation_time: 1000, model_version: 'flux/dev' },
          generationId: 'rapid-test'
        })
      });

      render(<ImageGenerator />);

      const promptInput = screen.getByLabelText('Describe the image you want to create');
      const generateButton = screen.getByRole('button', { name: /generate images/i });
      
      // 1. User enters prompt
      await user.type(promptInput, 'Test prompt');

      // 2. User clicks generate multiple times rapidly
      await user.click(generateButton);
      await user.click(generateButton);
      await user.click(generateButton);

      // 3. Only one API call should be made (button disabled during generation)
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      // 4. Button should be disabled during generation
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Accessibility Workflow', () => {
    test('should be fully keyboard navigable', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<ImageGenerator />);

      // 1. Tab to prompt input
      await user.tab();
      expect(screen.getByLabelText('Describe the image you want to create')).toHaveFocus();

      // 2. Type prompt
      await user.keyboard('Test prompt');

      // 3. Tab to generate button
      await user.tab();
      expect(screen.getByRole('button', { name: /generate images/i })).toHaveFocus();

      // 4. Tab to first suggestion
      await user.tab();
      expect(screen.getByText('A futuristic city at night')).toHaveFocus();

      // 5. Use Enter to select suggestion
      await user.keyboard('{Enter}');
      expect(screen.getByLabelText('Describe the image you want to create')).toHaveValue('A futuristic city at night');
    });

    test('should have proper ARIA attributes and labels', () => {
      render(<ImageGenerator />);

      // Check form labeling
      const promptInput = screen.getByLabelText('Describe the image you want to create');
      expect(promptInput).toHaveAttribute('id', 'prompt');

      const label = screen.getByText('Describe the image you want to create');
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveAttribute('for', 'prompt');

      // Check button accessibility
      const generateButton = screen.getByRole('button', { name: /generate images/i });
      expect(generateButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Performance and State Management', () => {
    test('should maintain state correctly through interactions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<ImageGenerator />);

      const promptInput = screen.getByLabelText('Describe the image you want to create');

      // 1. Enter prompt
      await user.type(promptInput, 'First prompt');
      expect(promptInput).toHaveValue('First prompt');

      // 2. Clear and enter new prompt
      await user.clear(promptInput);
      await user.type(promptInput, 'Second prompt');
      expect(promptInput).toHaveValue('Second prompt');

      // 3. Use suggestion
      await user.click(screen.getByText('A futuristic city at night'));
      expect(promptInput).toHaveValue('A futuristic city at night');

      // 4. Modify suggestion
      await user.type(promptInput, ' with neon lights');
      expect(promptInput).toHaveValue('A futuristic city at night with neon lights');
    });

    test('should handle component unmounting gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock a slow API response
      fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ imageUrls: [], metadata: {}, generationId: 'test' })
          }), 5000)
        )
      );

      const { unmount } = render(<ImageGenerator />);

      const promptInput = screen.getByLabelText('Describe the image you want to create');
      await user.type(promptInput, 'Test prompt');
      
      const generateButton = screen.getByRole('button', { name: /generate images/i });
      await user.click(generateButton);

      // Unmount component while API call is in progress
      unmount();

      // Should not cause any errors or memory leaks
      expect(() => {
        jest.advanceTimersByTime(6000);
      }).not.toThrow();
    });
  });
});