# Troubleshooting Guide

This guide helps you resolve common issues when developing or deploying the AI Image Generator application.

## 🚨 Common Issues

### Setup and Configuration Issues

#### Issue: "API key not configured" Error

**Symptoms:**
- Error message: "Please configure your FAL AI API key"
- Images fail to generate
- Console shows configuration errors

**Solutions:**

1. **Check .env.local file exists**
   ```bash
   ls -la .env.local
   ```
   If it doesn't exist, create it from the example:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Verify API key format**
   Your `.env.local` should look like:
   ```env
   FAL_KEY=fal_1234567890abcdef1234567890abcdef
   ```
   - API key should start with `fal_`
   - No quotes around the value
   - No spaces before or after the equals sign

3. **Restart development server**
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

4. **Verify API key is valid**
   - Go to [fal.ai/dashboard](https://fal.ai/dashboard)
   - Check if your API key is active
   - Generate a new key if needed

5. **Check environment variable loading**
   Add this to your API route temporarily:
   ```javascript
   console.log('FAL_KEY configured:', !!process.env.FAL_KEY);
   console.log('FAL_KEY length:', process.env.FAL_KEY?.length);
   ```

#### Issue: "Module not found" Errors

**Symptoms:**
- Import errors in console
- Application won't start
- Build failures

**Solutions:**

1. **Clear node_modules and reinstall**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version**
   ```bash
   node --version
   # Should be 18.0 or later
   ```

3. **Update npm**
   ```bash
   npm install -g npm@latest
   ```

4. **Clear Next.js cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

### Development Issues

#### Issue: Development Server Won't Start

**Symptoms:**
- `npm run dev` fails
- Port already in use errors
- Permission denied errors

**Solutions:**

1. **Check if port 3000 is in use**
   ```bash
   # On macOS/Linux
   lsof -i :3000
   
   # On Windows
   netstat -ano | findstr :3000
   ```

2. **Use a different port**
   ```bash
   npm run dev -- -p 3001
   ```

3. **Kill processes using port 3000**
   ```bash
   # On macOS/Linux
   kill -9 $(lsof -ti:3000)
   
   # On Windows
   taskkill /PID <PID> /F
   ```

4. **Check file permissions**
   ```bash
   # Ensure you have read/write permissions
   ls -la
   chmod 755 .
   ```

#### Issue: Hot Reload Not Working

**Symptoms:**
- Changes don't reflect automatically
- Need to manually refresh browser
- Console shows no updates

**Solutions:**

1. **Check file watching limits (Linux)**
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Restart development server**
   ```bash
   # Stop and restart
   npm run dev
   ```

3. **Check for syntax errors**
   - Look for JavaScript/React syntax errors
   - Check browser console for errors

4. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - Clear browser cache and cookies

### API and Integration Issues

#### Issue: Images Not Generating

**Symptoms:**
- Loading spinner shows indefinitely
- No images appear after generation
- API errors in console

**Solutions:**

1. **Check API endpoint**
   Test the API directly:
   ```bash
   curl -X POST http://localhost:3000/api/generate-image \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test image"}'
   ```

2. **Verify FAL AI service status**
   - Check [FAL AI status page](https://status.fal.ai)
   - Try generating an image directly on FAL AI dashboard

3. **Check API key credits**
   - Log into [fal.ai/dashboard](https://fal.ai/dashboard)
   - Verify you have sufficient credits

4. **Review server logs**
   Check the terminal running `npm run dev` for error messages

5. **Test with simple prompt**
   Try a basic prompt like "red apple" to rule out prompt-related issues

#### Issue: "Rate limit exceeded" Errors

**Symptoms:**
- Error message about rate limiting
- Requests failing after several attempts
- 429 HTTP status codes

**Solutions:**

1. **Wait before retrying**
   - Default rate limit is 10 requests per minute
   - Wait 60 seconds before trying again

2. **Check rate limiting configuration**
   ```javascript
   // In utils/config.js
   const config = {
     app: {
       rateLimitPerMinute: 10, // Adjust if needed
     }
   };
   ```

3. **Upgrade FAL AI plan**
   - Higher plans have increased rate limits
   - Check pricing at [fal.ai/pricing](https://fal.ai/pricing)

#### Issue: Images Display as Broken

**Symptoms:**
- Broken image icons
- Images don't load in browser
- CORS errors in console

**Solutions:**

1. **Check image URLs**
   ```javascript
   console.log('Generated URLs:', imageUrls);
   ```

2. **Verify CORS configuration**
   Add to `next.config.js`:
   ```javascript
   async headers() {
     return [
       {
         source: '/api/:path*',
         headers: [
           { key: 'Access-Control-Allow-Origin', value: '*' },
           { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
         ],
       },
     ];
   }
   ```

3. **Test image URLs directly**
   Copy an image URL and open it in a new browser tab

### Build and Deployment Issues

#### Issue: Build Failures

**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Memory issues during build

**Solutions:**

1. **Check for TypeScript errors**
   ```bash
   npm run lint
   ```

2. **Increase Node.js memory**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

3. **Clear build cache**
   ```bash
   rm -rf .next
   npm run build
   ```

4. **Check for unused imports**
   Remove any unused imports that might cause build issues

#### Issue: Deployment Failures

**Symptoms:**
- Vercel/Netlify deployment fails
- Environment variables not working in production
- 500 errors in production

**Solutions:**

1. **Verify environment variables in deployment platform**
   - Vercel: Project Settings > Environment Variables
   - Netlify: Site Settings > Environment Variables

2. **Check build logs**
   Review deployment logs for specific error messages

3. **Test production build locally**
   ```bash
   npm run build
   npm run start
   ```

4. **Verify API routes work in production**
   Test API endpoints after deployment

### Performance Issues

#### Issue: Slow Image Generation

**Symptoms:**
- Long wait times for images
- Timeouts during generation
- Poor user experience

**Solutions:**

1. **Check network connection**
   Test internet speed and stability

2. **Optimize prompts**
   - Keep prompts concise
   - Avoid overly complex descriptions

3. **Implement timeout handling**
   ```javascript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 30000);
   
   try {
     const response = await fetch('/api/generate-image', {
       signal: controller.signal,
       // ... other options
     });
   } finally {
     clearTimeout(timeoutId);
   }
   ```

4. **Add progress indicators**
   Implement better loading states to improve perceived performance

#### Issue: High Memory Usage

**Symptoms:**
- Browser becomes slow
- Tab crashes
- Out of memory errors

**Solutions:**

1. **Limit concurrent generations**
   Prevent multiple simultaneous image generations

2. **Implement image cleanup**
   ```javascript
   useEffect(() => {
     return () => {
       // Cleanup image URLs when component unmounts
       images.forEach(url => URL.revokeObjectURL(url));
     };
   }, [images]);
   ```

3. **Use image lazy loading**
   ```javascript
   <img loading="lazy" src={imageUrl} alt="Generated image" />
   ```

### Testing Issues

#### Issue: Tests Failing

**Symptoms:**
- Jest tests fail
- Component tests don't render
- API tests timeout

**Solutions:**

1. **Check test environment setup**
   ```bash
   # Verify jest.setup.js exists and is configured
   cat jest.setup.js
   ```

2. **Update test dependencies**
   ```bash
   npm update @testing-library/react @testing-library/jest-dom
   ```

3. **Clear Jest cache**
   ```bash
   npx jest --clearCache
   ```

4. **Run tests in verbose mode**
   ```bash
   npm run test -- --verbose
   ```

5. **Check for async/await issues**
   Ensure async operations in tests are properly awaited

#### Issue: Mock Issues in Tests

**Symptoms:**
- API calls not mocked properly
- External dependencies causing test failures
- Inconsistent test results

**Solutions:**

1. **Set up proper mocks**
   ```javascript
   // __tests__/setup.js
   jest.mock('@fal-ai/serverless-client', () => ({
     subscribe: jest.fn().mockResolvedValue({
       data: { images: [{ url: 'mock-url' }] }
     })
   }));
   ```

2. **Mock environment variables**
   ```javascript
   // In jest.setup.js
   process.env.FAL_KEY = 'test_key';
   ```

3. **Use MSW for API mocking**
   ```javascript
   import { setupServer } from 'msw/node';
   import { rest } from 'msw';
   
   const server = setupServer(
     rest.post('/api/generate-image', (req, res, ctx) => {
       return res(ctx.json({ imageUrls: ['mock-url'] }));
     })
   );
   ```

## 🔧 Debugging Tools and Techniques

### Browser DevTools

1. **Console Tab**
   - Check for JavaScript errors
   - Look for network request failures
   - Monitor API responses

2. **Network Tab**
   - Monitor API calls to `/api/generate-image`
   - Check request/response headers
   - Verify request payloads

3. **Application Tab**
   - Check Local Storage for cached data
   - Verify Service Worker status
   - Monitor cookies and session data

### VS Code Debugging

1. **Set up launch configuration**
   Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Debug Next.js",
         "type": "node",
         "request": "attach",
         "port": 9229,
         "skipFiles": ["<node_internals>/**"]
       }
     ]
   }
   ```

2. **Start debugging session**
   ```bash
   NODE_OPTIONS='--inspect' npm run dev
   ```

### Logging and Monitoring

1. **Add structured logging**
   ```javascript
   // utils/logger.js
   const logger = {
     info: (message, data) => console.log(`[INFO] ${message}`, data),
     error: (message, error) => console.error(`[ERROR] ${message}`, error),
     debug: (message, data) => {
       if (process.env.NODE_ENV === 'development') {
         console.debug(`[DEBUG] ${message}`, data);
       }
     }
   };
   ```

2. **Monitor API performance**
   ```javascript
   // In API routes
   const startTime = Date.now();
   // ... API logic
   const duration = Date.now() - startTime;
   console.log(`API call took ${duration}ms`);
   ```

## 📋 Diagnostic Checklist

When encountering issues, go through this checklist:

### Environment Check
- [ ] Node.js version 18+ installed
- [ ] npm/yarn up to date
- [ ] `.env.local` file exists with correct FAL_KEY
- [ ] Development server starts without errors
- [ ] No console errors in browser

### Configuration Check
- [ ] FAL AI API key is valid and active
- [ ] API key has sufficient credits
- [ ] Environment variables load correctly
- [ ] Next.js configuration is valid

### Code Check
- [ ] No syntax errors in JavaScript/React code
- [ ] All imports are correct and modules exist
- [ ] Component props are passed correctly
- [ ] API routes handle errors properly

### Network Check
- [ ] Internet connection is stable
- [ ] FAL AI service is operational
- [ ] No firewall blocking requests
- [ ] CORS is configured correctly

### Performance Check
- [ ] No memory leaks in components
- [ ] Images are optimized
- [ ] API calls are not excessive
- [ ] Loading states are implemented

## 🆘 Getting Additional Help

### Documentation Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [FAL AI Documentation](https://docs.fal.ai)

### Community Support
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [React Community Discord](https://discord.gg/react)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)

### Creating Bug Reports

When creating a bug report, include:

1. **Environment Information**
   ```bash
   node --version
   npm --version
   # OS and browser version
   ```

2. **Steps to Reproduce**
   - Exact steps that cause the issue
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Error Messages**
   - Full error messages from console
   - Network request details
   - Server logs if available

4. **Code Samples**
   - Minimal reproducible example
   - Relevant configuration files
   - Environment variables (without sensitive data)

### Emergency Contacts

For critical production issues:
- Check [FAL AI Status](https://status.fal.ai)
- Review [Vercel Status](https://www.vercel-status.com) (if using Vercel)
- Contact your hosting provider's support

Remember: Most issues can be resolved by carefully reading error messages and following the solutions in this guide. Take your time to understand the problem before implementing fixes.