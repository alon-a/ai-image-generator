# Configuration Guide

This document provides detailed information about configuring the AI Image Generator application for different environments and use cases.

## 📋 Environment Variables

### Required Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `FAL_KEY` | FAL AI API key for image generation | `fal_1234567890abcdef` | Get from [fal.ai/dashboard](https://fal.ai/dashboard) |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `development` | `production`, `development`, `test` |
| `PORT` | Server port | `3000` | `3001`, `8080` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `false` | `true` |

### Environment Files

#### Development (`.env.local`)
```env
# Development environment variables
FAL_KEY=your_development_fal_api_key
NODE_ENV=development
```

#### Production (Platform-specific)
```env
# Production environment variables
FAL_KEY=your_production_fal_api_key
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### Testing (`.env.test`)
```env
# Test environment variables
FAL_KEY=test_api_key_mock
NODE_ENV=test
```

## ⚙️ Application Configuration

### Core Configuration (`utils/config.js`)

```javascript
const config = {
  // FAL AI Configuration
  fal: {
    apiKey: process.env.FAL_KEY,
    model: 'fal-ai/flux/dev',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second base delay
  },
  
  // Application Settings
  app: {
    maxPromptLength: 500,
    imagesPerGeneration: 4,
    rateLimitPerMinute: 10,
    enableAnalytics: process.env.NODE_ENV === 'production',
  },
  
  // Performance Settings
  performance: {
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableRequestDeduplication: true,
    cacheTimeout: 300000, // 5 minutes
  },
  
  // Security Settings
  security: {
    enableRateLimiting: true,
    enableInputValidation: true,
    maxRequestSize: '10mb',
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000'],
  }
};

export default config;
```

### Next.js Configuration (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Configuration
  reactStrictMode: true,
  swcMinify: true,
  
  // Performance Optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // Compression
  compress: true,
  
  // Image Optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    domains: ['fal.media'], // FAL AI image domains
  },
  
  // Headers for Security and Caching
  async headers() {
    return [
      // Static Assets Caching
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API Routes - No Caching
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
  
  // Environment Variables (public)
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack Configuration
  webpack: (config, { dev, isServer }) => {
    // Bundle Analyzer (development only)
    if (dev && !isServer) {
      config.devtool = 'eval-source-map';
    }
    
    return config;
  },
};

module.exports = nextConfig;
```

## 🧪 Testing Configuration

### Jest Configuration (`jest.config.js`)

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
  },
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'hooks/**/*.{js,jsx}',
    'pages/**/*.{js,jsx}',
    'utils/**/*.{js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).{js,jsx}',
    '**/*.(test|spec).{js,jsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### Test Setup (`jest.setup.js`)

```javascript
import '@testing-library/jest-dom';

// Mock environment variables
process.env.FAL_KEY = 'test_api_key_123';
process.env.NODE_ENV = 'test';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock FAL AI client
jest.mock('@fal-ai/serverless-client', () => ({
  subscribe: jest.fn().mockResolvedValue({
    data: {
      images: [
        { url: 'https://fal.media/files/test-image-1.jpg' },
        { url: 'https://fal.media/files/test-image-2.jpg' },
      ],
    },
  }),
}));

// Global test utilities
global.fetch = jest.fn();

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

## 🔒 Security Configuration

### Content Security Policy

Add to `next.config.js`:

```javascript
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://fal.media;
  connect-src 'self' https://fal.ai https://api.fal.ai;
  font-src 'self';
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'false',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];
```

### Rate Limiting Configuration

```javascript
// utils/rateLimiter.js
import { LRUCache } from 'lru-cache';

const rateLimit = (options = {}) => {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (limit, token) =>
      new Promise((resolve, reject) => {
        const tokenCount = tokenCache.get(token) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        resolve({
          limit,
          current: currentUsage,
          remaining: isRateLimited ? 0 : limit - currentUsage,
          reset: new Date(Date.now() + options.interval),
        });
      }),
  };
};

export default rateLimit;
```

## 🚀 Performance Configuration

### Bundle Optimization

```javascript
// next.config.js - Bundle optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... other config
  
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
});
```

### Image Optimization

```javascript
// utils/imageOptimization.js
export const imageConfig = {
  formats: ['image/webp', 'image/avif'],
  sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  domains: ['fal.media'],
  minimumCacheTTL: 60,
  dangerouslyAllowSVG: false,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
};

export const optimizeImageUrl = (url, width = 800, quality = 75) => {
  if (!url) return '';
  
  // For FAL AI images, add optimization parameters
  const urlObj = new URL(url);
  urlObj.searchParams.set('w', width.toString());
  urlObj.searchParams.set('q', quality.toString());
  
  return urlObj.toString();
};
```

## 📊 Monitoring Configuration

### Analytics Setup

```javascript
// utils/analytics.js
export const analytics = {
  // Google Analytics
  gtag: {
    trackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
    enabled: process.env.NODE_ENV === 'production',
  },
  
  // Custom events
  track: (eventName, properties = {}) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        custom_map: properties,
      });
    }
  },
  
  // Page views
  pageview: (url) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', analytics.gtag.trackingId, {
        page_path: url,
      });
    }
  },
};
```

### Error Tracking

```javascript
// utils/errorTracking.js
export const errorTracking = {
  // Sentry configuration
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
  },
  
  // Log error
  captureException: (error, context = {}) => {
    console.error('Error captured:', error, context);
    
    // Send to error tracking service
    if (errorTracking.sentry.enabled && window.Sentry) {
      window.Sentry.captureException(error, {
        extra: context,
      });
    }
  },
  
  // Log message
  captureMessage: (message, level = 'info') => {
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    if (errorTracking.sentry.enabled && window.Sentry) {
      window.Sentry.captureMessage(message, level);
    }
  },
};
```

## 🌍 Environment-Specific Configurations

### Development Environment

```javascript
// config/development.js
export const developmentConfig = {
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retries: 3,
  },
  logging: {
    level: 'debug',
    enableConsole: true,
  },
  features: {
    enableHotReload: true,
    enableDevTools: true,
    enableMocking: true,
  },
};
```

### Production Environment

```javascript
// config/production.js
export const productionConfig = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    timeout: 15000,
    retries: 2,
  },
  logging: {
    level: 'error',
    enableConsole: false,
  },
  features: {
    enableHotReload: false,
    enableDevTools: false,
    enableMocking: false,
  },
  performance: {
    enableCompression: true,
    enableCaching: true,
    enableMinification: true,
  },
};
```

### Testing Environment

```javascript
// config/testing.js
export const testingConfig = {
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 5000,
    retries: 0,
  },
  logging: {
    level: 'silent',
    enableConsole: false,
  },
  features: {
    enableMocking: true,
    enableTestUtils: true,
  },
};
```

## 🔧 Platform-Specific Configurations

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "FAL_KEY": "@fal-key"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

### Netlify Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "origin-when-cross-origin"

[[redirects]]
  from = "/home"
  to = "/"
  status = 301
```

### Docker Configuration

```dockerfile
# Multi-stage Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci --only=production

FROM base AS builder
COPY . .
RUN npm ci
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

## 📝 Configuration Validation

### Environment Validation

```javascript
// utils/validateConfig.js
export const validateConfig = () => {
  const requiredEnvVars = ['FAL_KEY'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate FAL_KEY format
  if (!process.env.FAL_KEY.startsWith('fal_')) {
    throw new Error('FAL_KEY must start with "fal_"');
  }
  
  return true;
};

// Runtime validation
export const validateRuntime = async () => {
  try {
    // Test FAL AI connection
    const response = await fetch('https://api.fal.ai/health');
    if (!response.ok) {
      throw new Error('FAL AI service unavailable');
    }
    
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

This configuration guide provides comprehensive setup instructions for all aspects of the AI Image Generator application. Refer to specific sections based on your deployment needs and environment requirements.