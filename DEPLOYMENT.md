# Deployment Guide

This guide covers deploying the AI Image Generator application to various platforms.

## 🚀 Quick Deploy Options

### Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications and is created by the same team.

#### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ai-image-generator)

#### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add FAL_KEY
   # Enter your FAL AI API key when prompted
   ```

5. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Netlify

1. **Build the application**
   ```bash
   npm run build
   npm run export
   ```

2. **Deploy to Netlify**
   - Drag and drop the `out/` folder to [netlify.com/drop](https://netlify.com/drop)
   - Or connect your GitHub repository at [netlify.com](https://netlify.com)

3. **Configure Environment Variables**
   - Go to Site Settings > Environment Variables
   - Add `FAL_KEY` with your API key value

### Railway

1. **Connect Repository**
   - Visit [railway.app](https://railway.app)
   - Connect your GitHub repository

2. **Configure Environment Variables**
   - Add `FAL_KEY` in the Variables section

3. **Deploy**
   - Railway will automatically deploy your application

## 🐳 Docker Deployment

### Basic Docker Setup

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app

   # Install dependencies based on the preferred package manager
   COPY package.json package-lock.json* ./
   RUN npm ci --only=production

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .

   # Build the application
   RUN npm run build

   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app

   ENV NODE_ENV production

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public

   # Set the correct permission for prerender cache
   RUN mkdir .next
   RUN chown nextjs:nodejs .next

   # Automatically leverage output traces to reduce image size
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs

   EXPOSE 3000

   ENV PORT 3000
   ENV HOSTNAME "0.0.0.0"

   CMD ["node", "server.js"]
   ```

2. **Update next.config.js**
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'standalone',
     // ... other config
   }
   
   module.exports = nextConfig
   ```

3. **Build and Run**
   ```bash
   # Build the Docker image
   docker build -t ai-image-generator .

   # Run the container
   docker run -p 3000:3000 -e FAL_KEY=your_api_key ai-image-generator
   ```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - FAL_KEY=${FAL_KEY}
    restart: unless-stopped
```

Run with:
```bash
FAL_KEY=your_api_key docker-compose up -d
```

## ☁️ Cloud Platform Deployment

### AWS (Elastic Beanstalk)

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB Application**
   ```bash
   eb init
   ```

3. **Create Environment**
   ```bash
   eb create production
   ```

4. **Set Environment Variables**
   ```bash
   eb setenv FAL_KEY=your_api_key
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

### Google Cloud Platform (Cloud Run)

1. **Build and Push to Container Registry**
   ```bash
   # Build the image
   docker build -t gcr.io/your-project-id/ai-image-generator .

   # Push to registry
   docker push gcr.io/your-project-id/ai-image-generator
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy ai-image-generator \
     --image gcr.io/your-project-id/ai-image-generator \
     --platform managed \
     --region us-central1 \
     --set-env-vars FAL_KEY=your_api_key
   ```

### Azure (Container Instances)

1. **Create Resource Group**
   ```bash
   az group create --name ai-image-generator --location eastus
   ```

2. **Deploy Container**
   ```bash
   az container create \
     --resource-group ai-image-generator \
     --name ai-image-generator \
     --image your-registry/ai-image-generator \
     --dns-name-label ai-image-generator \
     --ports 3000 \
     --environment-variables FAL_KEY=your_api_key
   ```

## 🔧 Production Configuration

### Environment Variables for Production

Set these environment variables in your production environment:

```env
# Required
FAL_KEY=your_production_fal_api_key

# Optional - Production optimizations
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Performance Optimizations

1. **Enable Compression**
   - Most platforms enable this automatically
   - For custom servers, ensure gzip compression is enabled

2. **CDN Configuration**
   - Use a CDN for static assets
   - Configure proper cache headers

3. **Database Optimization** (if applicable)
   - Use connection pooling
   - Implement proper indexing

### Security Considerations

1. **HTTPS**
   - Ensure HTTPS is enabled (most platforms do this automatically)
   - Use HSTS headers

2. **Environment Variables**
   - Never expose API keys in client-side code
   - Use platform-specific secret management

3. **Rate Limiting**
   - Implement rate limiting at the platform level
   - Monitor API usage

## 📊 Monitoring and Logging

### Vercel Analytics

Enable Vercel Analytics for performance monitoring:

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Error Tracking

Consider integrating error tracking services:

- **Sentry**: For error monitoring
- **LogRocket**: For session replay
- **DataDog**: For comprehensive monitoring

### Health Checks

Create a health check endpoint:

```javascript
// pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🚨 Troubleshooting Deployment Issues

### Common Deployment Problems

1. **Build Failures**
   ```bash
   # Check build logs
   npm run build
   
   # Common fixes:
   # - Update Node.js version
   # - Clear cache: rm -rf .next node_modules && npm install
   # - Check for TypeScript errors
   ```

2. **Environment Variable Issues**
   ```bash
   # Verify variables are set
   echo $FAL_KEY
   
   # Check in application
   console.log('FAL_KEY configured:', !!process.env.FAL_KEY);
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

4. **Port Conflicts**
   ```bash
   # Use different port
   PORT=3001 npm start
   ```

### Platform-Specific Issues

#### Vercel
- **Function timeout**: Upgrade to Pro plan for longer timeouts
- **Bundle size**: Optimize imports and use dynamic imports

#### Netlify
- **Build timeout**: Optimize build process or upgrade plan
- **Function limits**: Consider splitting large functions

#### Docker
- **Image size**: Use multi-stage builds and alpine images
- **Memory limits**: Adjust container memory allocation

## 📋 Deployment Checklist

Before deploying to production:

- [ ] All tests pass (`npm run test`)
- [ ] Application builds successfully (`npm run build`)
- [ ] Environment variables are configured
- [ ] FAL AI API key is valid and has sufficient credits
- [ ] Error handling is implemented
- [ ] Rate limiting is configured
- [ ] Security headers are set
- [ ] Performance optimizations are applied
- [ ] Monitoring and logging are set up
- [ ] Backup and recovery plan is in place
- [ ] Domain and SSL certificate are configured
- [ ] Load testing has been performed (for high-traffic applications)

## 🔗 Useful Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [FAL AI Documentation](https://docs.fal.ai)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [AWS Deployment Guide](https://aws.amazon.com/getting-started/hands-on/deploy-nodejs-web-app/)