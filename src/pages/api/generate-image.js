import * as fal from '@fal-ai/serverless-client';

// Initialize the FAL client with your API key
fal.config({
  credentials: process.env.FAL_KEY
});

/**
 * API handler for generating images using FAL AI's Flux model
 * @async
 * @function handler
 * @param {Object} req - Next.js API request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.prompt - Text description for image generation
 * @param {Object} res - Next.js API response object
 * @returns {Promise<void>} - Returns a promise that resolves when the response is sent
 * @throws {Error} - Throws an error if image generation fails
 * 
 * @example
 * // Example request:
 * POST /api/generate-image
 * {
 *   "prompt": "A serene mountain landscape at sunset"
 * }
 * 
 * // Example success response:
 * {
 *   "imageUrls": ["https://fal.ai/generated-image-url-1.jpg", "https://fal.ai/generated-image-url-2.jpg", "https://fal.ai/generated-image-url-3.jpg", "https://fal.ai/generated-image-url-4.jpg"]
 * }
 * 
 * // Example error response:
 * {
 *   "error": "Failed to generate images"
 * }
 */
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.FAL_KEY) {
    console.error('FAL_KEY is not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    console.log('Generating images for prompt:', prompt);

    // Generate 4 different images with different seeds
    const imagePromises = Array.from({ length: 4 }, (_, index) => {
      const seed = Math.floor(Math.random() * 1000000) + index;
      console.log(`Generating image ${index + 1} with seed ${seed}`);
      
      return fal.run('fal-ai/flux/dev', {
        input: {
          prompt: prompt,
          seed: seed,
          num_images: 1,
          image_size: {
            width: 1024,
            height: 1024
          },
          enable_safety_checker: true,
          scheduler: "euler"
        }
      });
    });

    console.log('Waiting for all images to generate...');
    const results = await Promise.all(imagePromises);
    
    const imageUrls = results.map(result => {
      if (!result || !result.images || !result.images[0] || !result.images[0].url) {
        console.error('Invalid result structure:', result);
        return null;
      }
      return result.images[0].url;
    }).filter(Boolean);

    console.log(`Generated ${imageUrls.length} images successfully`);

    if (imageUrls.length === 0) {
      throw new Error('No images were generated');
    }

    return res.status(200).json({ imageUrls });
  } catch (error) {
    console.error('Error generating images:', error);
    return res.status(500).json({ 
      error: 'Failed to generate images',
      details: error.message 
    });
  }
} 