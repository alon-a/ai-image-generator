# Development Guide

This guide covers everything you need to know for developing and contributing to the AI Image Generator project.

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: Version 18.0 or later
- **npm**: Version 8.0 or later (comes with Node.js)
- **Git**: For version control
- **Code Editor**: VS Code recommended with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - Auto Rename Tag
  - Bracket Pair Colorizer

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-image-generator.git
   cd ai-image-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your FAL AI API key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Verify setup**
   - Open [http://localhost:3000](http://localhost:3000)
   - Try generating an image to ensure everything works

## 📁 Project Architecture

### Directory Structure

```
├── components/                 # Reusable React components
│   ├── ErrorMessage.js        # Error display component
│   ├── ErrorMessage.module.css
│   ├── ImageGenerator.js      # Main UI component
│   ├── ImageGenerator.module.css
│   ├── ImageGrid.js           # Image display grid
│   ├── ImageGrid.module.css
│   ├── LoadingSpinner.js      # Loading state component
│   ├── LoadingSpinner.module.css
│   ├── PromptForm.js          # Input form component
│   └── PromptForm.module.css
├── hooks/                      # Custom React hooks
│   ├── useErrorHandler.js     # Error handling logic
│   └── useImageGeneration.js  # Image generation state
├── pages/                      # Next.js pages and API routes
│   ├── api/
│   │   └── generate-image.js  # Image generation endpoint
│   ├── index.js               # Main application page
│   └── _app.js                # App configuration
├── styles/                     # Global styles
│   ├── globals.css            # Global CSS
│   └── Home.module.css        # Page-specific styles
├── utils/                      # Utility functions
│   ├── api.js                 # API client utilities
│   ├── config.js              # Configuration management
│   ├── performance.js         # Performance utilities
│   ├── rateLimiter.js         # Rate limiting logic
│   └── validation.js          # Input validation
├── __tests__/                  # Test files
│   ├── components/            # Component tests
│   ├── hooks/                 # Hook tests
│   ├── pages/                 # Page and API tests
│   └── utils/                 # Utility tests
└── docs/                       # Documentation
    └── fal-ai/                # FAL AI integration docs
```

### Architecture Patterns

#### Component Structure
```javascript
// Standard component structure
import React from 'react';
import styles from './ComponentName.module.css';

const ComponentName = ({ prop1, prop2, ...props }) => {
  // Hooks at the top
  const [state, setState] = useState(initialValue);
  
  // Event handlers
  const handleEvent = (event) => {
    // Handle event
  };
  
  // Render
  return (
    <div className={styles.container} {...props}>
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

#### Custom Hooks Pattern
```javascript
// Custom hook structure
import { useState, useEffect, useCallback } from 'react';

const useCustomHook = (initialValue) => {
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const performAction = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    
    try {
      // Perform action
      const result = await someAsyncOperation(params);
      setState(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    state,
    loading,
    error,
    performAction
  };
};

export default useCustomHook;
```

#### API Route Pattern
```javascript
// API route structure
export default async function handler(req, res) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Input validation
    const { error, data } = validateInput(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    
    // Business logic
    const result = await performOperation(data);
    
    // Success response
    res.status(200).json(result);
  } catch (error) {
    // Error handling
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## 🧪 Testing Strategy

### Testing Philosophy

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test how components work together
- **End-to-End Tests**: Test complete user workflows
- **Coverage Goal**: Maintain >80% test coverage

### Testing Tools

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **MSW (Mock Service Worker)**: API mocking for tests
- **Playwright**: End-to-end testing (optional)

### Writing Tests

#### Component Tests
```javascript
// __tests__/components/ErrorMessage.test.js
import { render, screen } from '@testing-library/react';
import ErrorMessage from '../../components/ErrorMessage';

describe('ErrorMessage', () => {
  test('renders error message', () => {
    const error = { message: 'Test error' };
    render(<ErrorMessage error={error} />);
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
  
  test('renders retry button when onRetry provided', () => {
    const error = { message: 'Test error' };
    const onRetry = jest.fn();
    
    render(<ErrorMessage error={error} onRetry={onRetry} />);
    
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
```

#### Hook Tests
```javascript
// __tests__/hooks/useImageGeneration.test.js
import { renderHook, act } from '@testing-library/react';
import useImageGeneration from '../../hooks/useImageGeneration';

describe('useImageGeneration', () => {
  test('initial state is correct', () => {
    const { result } = renderHook(() => useImageGeneration());
    
    expect(result.current.images).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
  
  test('generates images successfully', async () => {
    const { result } = renderHook(() => useImageGeneration());
    
    await act(async () => {
      await result.current.generateImages('test prompt');
    });
    
    expect(result.current.images).toHaveLength(4);
    expect(result.current.loading).toBe(false);
  });
});
```

#### API Tests
```javascript
// __tests__/api/generate-image.test.js
import handler from '../../pages/api/generate-image';
import { createMocks } from 'node-mocks-http';

describe('/api/generate-image', () => {
  test('generates images successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'test prompt' }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.imageUrls).toBeDefined();
  });
  
  test('validates input', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: '' }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test ErrorMessage.test.js

# Run tests matching pattern
npm run test -- --testNamePattern="renders"
```

## 🎨 Styling Guidelines

### CSS Modules

We use CSS Modules for component-specific styling:

```css
/* ComponentName.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button:hover {
  background-color: var(--primary-color-dark);
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### CSS Variables

Global CSS variables are defined in `styles/globals.css`:

```css
:root {
  /* Colors */
  --primary-color: #0070f3;
  --primary-color-dark: #0051cc;
  --secondary-color: #f4f4f4;
  --text-primary: #333;
  --text-secondary: #666;
  --error-color: #e53e3e;
  --success-color: #38a169;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Breakpoints */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

### Responsive Design

Use mobile-first approach:

```css
/* Mobile first */
.container {
  padding: var(--spacing-md);
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-lg);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-xl);
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## 🔧 Development Tools

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Utilities
npm run analyze          # Analyze bundle size
npm run clean            # Clean build artifacts
```

### VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.associations": {
    "*.css": "css"
  }
}
```

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Git Hooks

Set up pre-commit hooks with Husky:

```bash
# Install Husky
npm install --save-dev husky

# Set up pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## 🚀 Performance Optimization

### Code Splitting

Use dynamic imports for large components:

```javascript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});
```

### Image Optimization

Use Next.js Image component:

```javascript
import Image from 'next/image';

const OptimizedImage = ({ src, alt }) => (
  <Image
    src={src}
    alt={alt}
    width={500}
    height={300}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,..."
  />
);
```

### Bundle Analysis

Analyze bundle size:

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

## 🐛 Debugging

### Browser DevTools

- **React DevTools**: Install browser extension for React debugging
- **Network Tab**: Monitor API calls and performance
- **Console**: Check for errors and warnings
- **Performance Tab**: Profile application performance

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "pwa-chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Logging

Use structured logging:

```javascript
// utils/logger.js
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, data);
  },
  error: (message, error = {}) => {
    console.error(`[ERROR] ${message}`, error);
  },
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
};

export default logger;
```

## 📋 Code Review Guidelines

### Before Submitting PR

- [ ] Code follows project conventions
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Code is properly documented
- [ ] Performance impact considered
- [ ] Accessibility requirements met
- [ ] Mobile responsiveness verified

### Review Checklist

- **Functionality**: Does the code work as expected?
- **Performance**: Are there any performance implications?
- **Security**: Are there any security vulnerabilities?
- **Maintainability**: Is the code easy to understand and maintain?
- **Testing**: Are there adequate tests?
- **Documentation**: Is the code properly documented?

## 🔄 Release Process

### Version Management

We use semantic versioning (semver):

- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Patch**: Bug fixes (1.0.0 → 1.0.1)

### Release Steps

1. **Update version**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Update CHANGELOG.md**
   - Document new features
   - List bug fixes
   - Note breaking changes

3. **Create release PR**
   - Review all changes
   - Ensure tests pass
   - Update documentation

4. **Deploy to production**
   - Merge to main branch
   - Automatic deployment via CI/CD

## 🤝 Contributing Guidelines

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
4. **Write tests**
5. **Update documentation**
6. **Submit a pull request**

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(components): add image lazy loading
fix(api): handle rate limit errors properly
docs(readme): update setup instructions
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 📚 Learning Resources

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn Course](https://nextjs.org/learn)
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)

### React
- [React Documentation](https://react.dev)
- [React Hooks Guide](https://react.dev/reference/react)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### FAL AI
- [FAL AI Documentation](https://docs.fal.ai)
- [FAL AI Models](https://fal.ai/models)
- [FAL AI API Reference](https://docs.fal.ai/api-reference)

### General
- [MDN Web Docs](https://developer.mozilla.org)
- [JavaScript.info](https://javascript.info)
- [CSS-Tricks](https://css-tricks.com)