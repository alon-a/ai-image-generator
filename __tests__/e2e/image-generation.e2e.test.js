/**
 * End-to-end tests for the AI Image Generator application
 * These tests simulate real user interactions with the application
 */

import { test, expect } from '@playwright/test';

// Mock API responses for consistent testing
const mockSuccessResponse = {
  imageUrls: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
    'https://example.com/image4.jpg'
  ],
  metadata: {
    prompt: 'A beautiful landscape',
    generation_time: 2500,
    model_version: 'flux/dev'
  },
  generationId: 'test-gen-123'
};

const mockErrorResponse = {
  error: 'Image generation failed. Please try again.',
  category: 'generation',
  retryable: true
};

test.describe('AI Image Generator E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('Page Load and Initial State', () => {
    test('should load the page with correct title and elements', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle('AI Image Generator');
      
      // Check main heading
      await expect(page.getByRole('heading', { name: 'AI Image Generator' })).toBeVisible();
      
      // Check description
      await expect(page.getByText('Create stunning images from your text descriptions using AI')).toBeVisible();
      
      // Check form elements
      await expect(page.getByLabelText('Describe the image you want to create')).toBeVisible();
      await expect(page.getByRole('button', { name: /generate images/i })).toBeVisible();
      
      // Check that generate button is initially disabled
      await expect(page.getByRole('button', { name: /generate images/i })).toBeDisabled();
    });

    test('should show suggestion prompts', async ({ page }) => {
      await expect(page.getByText('Try these prompts:')).toBeVisible();
      await expect(page.getByText('A futuristic city at night')).toBeVisible();
      await expect(page.getByText('Cute cat wearing a wizard hat')).toBeVisible();
      await expect(page.getByText('Abstract art with vibrant colors')).toBeVisible();
      await expect(page.getByText('Peaceful forest scene')).toBeVisible();
    });

    test('should have responsive design on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that elements are still visible and properly arranged
      await expect(page.getByRole('heading', { name: 'AI Image Generator' })).toBeVisible();
      await expect(page.getByLabelText('Describe the image you want to create')).toBeVisible();
      await expect(page.getByRole('button', { name: /generate images/i })).toBeVisible();
    });
  });

  test.describe('Form Interaction', () => {
    test('should enable generate button when prompt is entered', async ({ page }) => {
      const promptInput = page.getByLabelText('Describe the image you want to create');
      const generateButton = page.getByRole('button', { name: /generate images/i });
      
      // Initially disabled
      await expect(generateButton).toBeDisabled();
      
      // Type a prompt
      await promptInput.fill('A beautiful sunset');
      
      // Should be enabled now
      await expect(generateButton).toBeEnabled();
    });

    test('should show character count while typing', async ({ page }) => {
      const promptInput = page.getByLabelText('Describe the image you want to create');
      
      await promptInput.fill('Hello world');
      
      await expect(page.getByText('11/500')).toBeVisible();
    });

    test('should show warning when approaching character limit', async ({ page }) => {
      const promptInput = page.getByLabelText('Describe the image you want to create');
      
      // Fill with text near the limit (450 characters)
      const longText = 'a'.repeat(450);
      await promptInput.fill(longText);
      
      const charCount = page.getByText('450/500');
      await expect(charCount).toBeVisible();
      await expect(charCount).toHaveClass(/warning/);
    });

    test('should show error when exceeding character limit', async ({ page }) => {
      const promptInput = page.getByLabelText('Describe the image you want to create');
      
      // Fill with text over the limit
      const tooLongText = 'a'.repeat(501);
      await promptInput.fill(tooLongText);
      
      await expect(page.getByText('Prompt is too long. Please keep it under 500 characters.')).toBeVisible();
      await expect(page.getByRole('button', { name: /generate images/i })).toBeDisabled();
    });

    test('should apply suggestion when clicked', async ({ page }) => {
      const promptInput = page.getByLabelText('Describe the image you want to create');
      const suggestion = page.getByText('A futuristic city at night');
      
      await suggestion.click();
      
      await expect(promptInput).toHaveValue('A futuristic city at night');
      await expect(page.getByRole('button', { name: /generate images/i })).toBeEnabled();
    });

    test('should support keyboard shortcuts', async ({ page }) => {
      const promptInput = page.getByLabelText('Describe the image you want to create');
      
      await promptInput.fill('Test prompt');
      
      // Mock the API call
      await page.route('/api/generate-image', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSuccessResponse)
        });
      });
      
      // Use Ctrl+Enter to submit
      await promptInput.press('Control+Enter');
      
      // Should show loading state
      await expect(page.getByText('Generating...')).toBeVisible();
    });
  });

  test.describe('Image Generation Workflow', () => {
    test('should complete successful image generation', async ({ page }) => {
      // Mock successful API response
      await page.route('/api/generate-image', async route => {
        // Add delay to simulate real API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSuccessResponse)
        });
      });
      
      const promptInput = page.getByLabelText('Describe the image you want to create');
      const generateButton = page.getByRole('button', { name: /generate images/i });
      
      // Enter prompt and submit
      await promptInput.fill('A beautiful landscape');
      await generateButton.click();
      
      // Should show loading state
      await expect(page.getByText('Generating your images...')).toBeVisible();
      await expect(page.getByText('Processing prompt')).toBeVisible();
      await expect(generateButton).toBeDisabled();
      
      // Wait for images to load
      await expect(page.getByText('Generated Images')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('"A beautiful landscape"')).toBeVisible();
      
      // Should show 4 images
      const images = page.getByRole('img', { name: /Generated image \d+ for: A beautiful landscape/ });
      await expect(images).toHaveCount(4);
      
      // Should show image numbers
      await expect(page.getByText('Image 1')).toBeVisible();
      await expect(page.getByText('Image 2')).toBeVisible();
      await expect(page.getByText('Image 3')).toBeVisible();
      await expect(page.getByText('Image 4')).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock error response
      await page.route('/api/generate-image', async route => {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify(mockErrorResponse)
        });
      });
      
      const promptInput = page.getByLabelText('Describe the image you want to create');
      const generateButton = page.getByRole('button', { name: /generate images/i });
      
      await promptInput.fill('Test prompt');
      await generateButton.click();
      
      // Should show loading, then error
      await expect(page.getByText('Generating your images...')).toBeVisible();
      await expect(page.getByText('Image generation failed. Please try again.')).toBeVisible();
      
      // Should show retry button
      await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    });

    test('should handle retry functionality', async ({ page }) => {
      let callCount = 0;
      
      // Mock API to fail first time, succeed second time
      await page.route('/api/generate-image', async route => {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify(mockErrorResponse)
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockSuccessResponse)
          });
        }
      });
      
      const promptInput = page.getByLabelText('Describe the image you want to create');
      const generateButton = page.getByRole('button', { name: /generate images/i });
      
      await promptInput.fill('Test prompt');
      await generateButton.click();
      
      // Wait for error
      await expect(page.getByText('Image generation failed. Please try again.')).toBeVisible();
      
      // Click retry
      await page.getByRole('button', { name: 'Try Again' }).click();
      
      // Should succeed on retry
      await expect(page.getByText('Generated Images')).toBeVisible({ timeout: 10000 });
    });

    test('should handle network errors', async ({ page }) => {
      // Mock network failure
      await page.route('/api/generate-image', async route => {
        await route.abort('failed');
      });
      
      const promptInput = page.getByLabelText('Describe the image you want to create');
      const generateButton = page.getByRole('button', { name: /generate images/i });
      
      await promptInput.fill('Test prompt');
      await generateButton.click();
      
      // Should show network error
      await expect(page.getByText(/network/i)).toBeVisible();
    });
  });

  test.describe('Image Display and Interaction', () => {
    test.beforeEach(async ({ page }) => {
      // Set up successful image generation for each test
      await page.route('/api/generate-image', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSuccessResponse)
        });
      });
      
      // Generate images
      await page.getByLabelText('Describe the image you want to create').fill('Test prompt');
      await page.getByRole('button', { name: /generate images/i }).click();
      await expect(page.getByText('Generated Images')).toBeVisible({ timeout: 10000 });
    });

    test('should display images in a grid layout', async ({ page }) => {
      const imageGrid = page.locator('[class*="grid"]').first();
      await expect(imageGrid).toBeVisible();
      
      const images = page.getByRole('img', { name: /Generated image/ });
      await expect(images).toHaveCount(4);
    });

    test('should show download buttons on image hover', async ({ page }) => {
      const firstImage = page.getByRole('img', { name: /Generated image 1/ });
      
      // Hover over the first image
      await firstImage.hover();
      
      // Should show download button
      await expect(page.getByTitle('Download image')).toBeVisible();
    });

    test('should handle image loading states', async ({ page }) => {
      // Images should have loading="lazy" attribute
      const images = page.getByRole('img', { name: /Generated image/ });
      
      for (let i = 0; i < 4; i++) {
        const image = images.nth(i);
        await expect(image).toHaveAttribute('loading', 'lazy');
      }
    });

    test('should show image error states', async ({ page }) => {
      // Mock image loading failure
      await page.route('https://example.com/image1.jpg', route => route.abort());
      
      // Trigger image error by trying to load the failed image
      await page.evaluate(() => {
        const img = document.querySelector('img[src="https://example.com/image1.jpg"]');
        if (img) {
          img.dispatchEvent(new Event('error'));
        }
      });
      
      // Should show error placeholder
      await expect(page.getByText('Failed to load image')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through the form
      await page.keyboard.press('Tab');
      await expect(page.getByLabelText('Describe the image you want to create')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /generate images/i })).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const promptInput = page.getByLabelText('Describe the image you want to create');
      await expect(promptInput).toHaveAttribute('id', 'prompt');
      
      const label = page.locator('label[for="prompt"]');
      await expect(label).toBeVisible();
    });

    test('should have proper image alt text', async ({ page }) => {
      // Set up and generate images
      await page.route('/api/generate-image', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSuccessResponse)
        });
      });
      
      await page.getByLabelText('Describe the image you want to create').fill('A beautiful sunset');
      await page.getByRole('button', { name: /generate images/i }).click();
      await expect(page.getByText('Generated Images')).toBeVisible({ timeout: 10000 });
      
      // Check alt text
      const firstImage = page.getByRole('img', { name: 'Generated image 1 for: A beautiful sunset' });
      await expect(firstImage).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'AI Image Generator' })).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle multiple rapid submissions', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('/api/generate-image', async route => {
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockSuccessResponse,
            generationId: `test-gen-${requestCount}`
          })
        });
      });
      
      const promptInput = page.getByLabelText('Describe the image you want to create');
      const generateButton = page.getByRole('button', { name: /generate images/i });
      
      await promptInput.fill('Test prompt');
      
      // Submit multiple times rapidly
      await generateButton.click();
      await generateButton.click();
      await generateButton.click();
      
      // Should handle gracefully (button should be disabled during generation)
      await expect(generateButton).toBeDisabled();
      
      // Wait for completion
      await expect(page.getByText('Generated Images')).toBeVisible({ timeout: 10000 });
      
      // Should only make one request (due to button being disabled)
      expect(requestCount).toBe(1);
    });
  });
});