// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.FAL_KEY = 'test_api_key_123';
process.env.NODE_ENV = 'test';