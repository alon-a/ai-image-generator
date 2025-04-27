# AI Image Generator with Next.js and FAL AI

A modern web application that generates images from text descriptions using FAL AI's powerful image generation models.

## Technologies Used

- **Next.js**: A React framework for production-grade applications
  - Version: Latest stable
  - Features used: API Routes, CSS Modules, React Hooks
  - Purpose: Provides the frontend and backend infrastructure

- **FAL AI**: State-of-the-art AI image generation API
  - Model: fal-ai/flux
  - Features: Text-to-image generation
  - Documentation: [FAL AI Docs](https://docs.fal.ai)
  - Detailed Integration Guide: [FAL AI Integration](./docs/fal-ai/README.md)

## Project Structure

```
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   └── generate-image.js   # Backend API endpoint
│   │   └── index.js                # Main application page
│   └── styles/
│       └── Home.module.css         # Component styles
├── .env.local                      # Environment variables
├── package.json                    # Project dependencies
└── README.md                       # Project documentation
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file in the project root:
   ```
   FAL_KEY=your_fal_api_key_here
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## API Documentation

### Generate Image Endpoint

- **URL**: `/api/generate-image`
- **Method**: POST
- **Body**:
  ```json
  {
    "prompt": "string"  // Text description of the desired image
  }
  ```
- **Response**:
  ```json
  {
    "imageUrl": "string"  // URL of the generated image
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "string"  // Error message
  }
  ```

## Frontend Components

### Main Page (`pages/index.js`)

The main page contains:
- Text input for the image description
- Generate button with loading state
- Image display area
- Error handling with user feedback

### Styling (`Home.module.css`)

Includes:
- Responsive design
- Modern UI elements
- Loading states
- Image container with proper scaling

## FAL AI Integration

The project uses FAL AI's Flux model for image generation:
- High-quality image outputs
- Fast generation times
- Reliable API integration
- Production-ready implementation

### FAL AI Configuration

```javascript
// API key configuration
fal.setApiKey(process.env.FAL_KEY);

// Model configuration
const result = await fal.subscribe('fal-ai/flux', {
  input: { prompt },
  logs: false,
});
```

## Best Practices

1. **Environment Variables**
   - Keep API keys secure in `.env.local`
   - Never commit sensitive data to version control

2. **Error Handling**
   - Comprehensive error catching
   - User-friendly error messages
   - Proper HTTP status codes

3. **UI/UX**
   - Loading states for better user feedback
   - Responsive design for all screen sizes
   - Clean and modern interface

4. **Performance**
   - Optimized image loading
   - Efficient API calls
   - Proper state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- [ ] Add image history
- [ ] Implement different AI models
- [ ] Add image customization options
- [ ] Implement user authentication
- [ ] Add image download functionality 