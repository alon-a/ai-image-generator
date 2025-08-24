# AI Image Generator

A modern, production-ready web application that generates high-quality images from text descriptions using FAL AI's powerful image generation models. Built with Next.js for optimal performance and user experience.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or later
- npm or yarn package manager
- FAL AI API key (get one at [fal.ai/dashboard](https://fal.ai/dashboard))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-image-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your FAL AI API key:
   ```env
   FAL_KEY=your_actual_fal_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
├── components/                     # Reusable React components
│   ├── ErrorMessage.js            # Error display component
│   ├── ImageGenerator.js          # Main UI component
│   ├── ImageGrid.js               # Image display grid
│   ├── LoadingSpinner.js          # Loading state component
│   └── PromptForm.js              # Input form component
├── hooks/                          # Custom React hooks
│   ├── useErrorHandler.js         # Error handling logic
│   └── useImageGeneration.js      # Image generation state management
├── pages/                          # Next.js pages and API routes
│   ├── api/
│   │   └── generate-image.js      # Image generation API endpoint
│   ├── index.js                   # Main application page
│   └── _app.js                    # App configuration
├── styles/                         # CSS modules and global styles
│   ├── globals.css                # Global styles
│   └── *.module.css               # Component-specific styles
├── utils/                          # Utility functions
│   ├── api.js                     # API client utilities
│   ├── config.js                  # Configuration management
│   └── validation.js              # Input validation
├── __tests__/                      # Test files
├── .env.local                      # Environment variables (create this)
├── next.config.js                  # Next.js configuration
├── package.json                    # Dependencies and scripts
└── README.md                       # This file
```

## 🔧 Configuration

### Environment Variables

All configuration is handled through environment variables. Create a `.env.local` file in the project root with the following variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FAL_KEY` | ✅ Yes | Your FAL AI API key | `fal_xxxxxxxxxxxxxxxx` |

#### Getting Your FAL AI API Key

1. Visit [fal.ai/dashboard](https://fal.ai/dashboard)
2. Sign up for an account or log in
3. Navigate to the API Keys section
4. Generate a new API key
5. Copy the key and add it to your `.env.local` file

### Application Configuration

The application includes several configuration options in `utils/config.js`:

```javascript
const config = {
  fal: {
    model: 'fal-ai/flux/dev',        // AI model to use
    timeout: 30000,                   // Request timeout (30 seconds)
    retryAttempts: 3,                 // Number of retry attempts
  },
  app: {
    maxPromptLength: 500,             // Maximum prompt length
    imagesPerGeneration: 4,           // Number of images to generate
    rateLimitPerMinute: 10,           // Rate limit per user per minute
  }
};
```

## 🛠️ Development Guide

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Development Workflow

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Make your changes**
   - Components are in the `components/` directory
   - API routes are in `pages/api/`
   - Styles use CSS Modules (`.module.css` files)

3. **Run tests**
   ```bash
   npm run test
   ```

4. **Check code quality**
   ```bash
   npm run lint
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

### Code Style Guidelines

- Use functional components with hooks
- Follow the existing file structure
- Write tests for new components and utilities
- Use CSS Modules for component styling
- Keep components small and focused
- Handle errors gracefully with user-friendly messages

### Testing

The project uses Jest and React Testing Library:

- **Unit tests**: Test individual components and utilities
- **Integration tests**: Test API endpoints and user workflows
- **Coverage**: Aim for >80% test coverage

Run tests with:
```bash
# Run all tests
npm run test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment Guide

### Vercel (Recommended)

1. **Connect your repository to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository

2. **Configure environment variables**
   - In your Vercel dashboard, go to Settings > Environment Variables
   - Add `FAL_KEY` with your API key

3. **Deploy**
   - Vercel will automatically deploy on every push to main branch

### Other Platforms

#### Netlify

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `out/` directory to Netlify

3. Configure environment variables in Netlify dashboard

#### Docker

1. Create a `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t ai-image-generator .
   docker run -p 3000:3000 -e FAL_KEY=your_key ai-image-generator
   ```

### Production Checklist

- [ ] Environment variables are properly configured
- [ ] Application builds without errors (`npm run build`)
- [ ] All tests pass (`npm run test`)
- [ ] No console errors in production build
- [ ] FAL AI API key is valid and has sufficient credits
- [ ] HTTPS is enabled (handled by most platforms automatically)

## 🔍 API Documentation

### Generate Image Endpoint

**Endpoint:** `POST /api/generate-image`

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "options": {
    "seed": 12345,
    "num_images": 4,
    "image_size": {
      "width": 1024,
      "height": 1024
    }
  }
}
```

**Success Response (200):**
```json
{
  "imageUrls": [
    "https://fal.media/files/...",
    "https://fal.media/files/...",
    "https://fal.media/files/...",
    "https://fal.media/files/..."
  ],
  "metadata": {
    "prompt": "A beautiful sunset over mountains",
    "generation_time": 2.5,
    "model_version": "flux-dev"
  }
}
```

**Error Responses:**

- **400 Bad Request:** Invalid input
  ```json
  {
    "error": "Prompt is required and must be between 1 and 500 characters",
    "code": "VALIDATION_ERROR"
  }
  ```

- **429 Too Many Requests:** Rate limit exceeded
  ```json
  {
    "error": "Rate limit exceeded. Please wait before making another request.",
    "code": "RATE_LIMIT_EXCEEDED"
  }
  ```

- **500 Internal Server Error:** Server configuration or API issues
  ```json
  {
    "error": "Image generation failed",
    "code": "GENERATION_ERROR",
    "setup": {
      "message": "Please configure your FAL AI API key",
      "instructions": "Visit https://fal.ai/dashboard to get your API key"
    }
  }
  ```

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 18 with Next.js 14
- **Styling**: CSS Modules with responsive design
- **API**: Next.js API Routes
- **AI Service**: FAL AI (Flux model)
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel (recommended)

### Key Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Performance**: Optimized images, lazy loading, and efficient API calls
- **Accessibility**: WCAG compliant components
- **Testing**: Full test coverage for reliability
- **Security**: Input validation and rate limiting

## 🐛 Troubleshooting

### Common Issues

#### "API key not configured" Error

**Problem**: The application shows an error about missing API configuration.

**Solution**:
1. Ensure you have a `.env.local` file in the project root
2. Verify your FAL AI API key is correctly set:
   ```env
   FAL_KEY=fal_xxxxxxxxxxxxxxxx
   ```
3. Restart the development server: `npm run dev`
4. Check that your API key is valid at [fal.ai/dashboard](https://fal.ai/dashboard)

#### Images Not Loading

**Problem**: Generated images don't display or show broken image icons.

**Solution**:
1. Check browser console for CORS or network errors
2. Verify your FAL AI account has sufficient credits
3. Try generating with a different prompt
4. Check if the FAL AI service is operational

#### "Rate limit exceeded" Error

**Problem**: Getting rate limit errors when generating images.

**Solution**:
1. Wait a few minutes before trying again
2. The default rate limit is 10 requests per minute
3. For higher limits, upgrade your FAL AI plan

#### Development Server Won't Start

**Problem**: `npm run dev` fails or shows port errors.

**Solution**:
1. Ensure Node.js 18+ is installed: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
4. Check if port 3000 is available or use a different port: `npm run dev -- -p 3001`

#### Build Failures

**Problem**: `npm run build` fails with errors.

**Solution**:
1. Run `npm run lint` to check for code issues
2. Ensure all environment variables are set
3. Check for TypeScript errors if using TypeScript
4. Clear Next.js cache: `rm -rf .next`

#### Tests Failing

**Problem**: Tests fail when running `npm run test`.

**Solution**:
1. Ensure test environment variables are set in `jest.setup.js`
2. Check for missing test dependencies: `npm install`
3. Run tests in verbose mode: `npm run test -- --verbose`
4. Clear Jest cache: `npx jest --clearCache`

### Getting Help

If you're still experiencing issues:

1. **Check the logs**: Look at browser console and terminal output for detailed error messages
2. **Verify configuration**: Double-check all environment variables and configuration files
3. **Test API key**: Verify your FAL AI API key works by testing it directly on their platform
4. **Update dependencies**: Ensure all packages are up to date: `npm update`
5. **Create an issue**: If the problem persists, create an issue in the repository with:
   - Error messages
   - Steps to reproduce
   - Your environment (Node.js version, OS, etc.)

### Performance Issues

#### Slow Image Generation

**Possible causes and solutions**:
- **Network latency**: Check your internet connection
- **FAL AI service load**: Try again during off-peak hours
- **Large prompts**: Keep prompts concise and specific
- **Browser cache**: Clear browser cache and cookies

#### High Memory Usage

**Solutions**:
- **Limit concurrent generations**: Wait for current generation to complete
- **Clear image history**: Refresh the page to clear stored images
- **Update browser**: Ensure you're using a modern browser version

## 📝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/ai-image-generator.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run tests: `npm run test`
7. Commit your changes: `git commit -m "Add your feature"`
8. Push to your fork: `git push origin feature/your-feature-name`
9. Create a Pull Request

### Code Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Keep commits focused and atomic

### Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update the README.md if you've made significant changes
3. Add tests for new functionality
4. Ensure all existing tests still pass
5. Request review from maintainers

## 📚 Additional Documentation

- **[Development Guide](DEVELOPMENT.md)** - Comprehensive guide for developers
- **[Deployment Guide](DEPLOYMENT.md)** - Detailed deployment instructions for various platforms
- **[Configuration Guide](CONFIGURATION.md)** - Complete configuration reference for all environments
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Solutions for common issues and problems
- **[FAL AI Integration](docs/fal-ai/README.md)** - Detailed FAL AI integration documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FAL AI](https://fal.ai) for providing the image generation API
- [Next.js](https://nextjs.org) for the excellent React framework
- [Vercel](https://vercel.com) for hosting and deployment platform 