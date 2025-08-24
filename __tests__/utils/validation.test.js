/**
 * Tests for utils/validation.js
 */

const {
  ValidationError,
  validatePrompt,
  validateGenerateImageRequest,
  validateHttpMethod,
  validateEmail,
  sanitizeInput
} = require('../../utils/validation');

describe('Validation Utils', () => {
  describe('ValidationError', () => {
    test('should create error with message', () => {
      const error = new ValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
    });

    test('should create error with field and code', () => {
      const error = new ValidationError('Test error', 'testField', 'TEST_CODE');
      expect(error.field).toBe('testField');
      expect(error.code).toBe('TEST_CODE');
    });
  });

  describe('validatePrompt', () => {
    test('should validate correct prompt', () => {
      const result = validatePrompt('A beautiful sunset over mountains');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('A beautiful sunset over mountains');
    });

    test('should trim whitespace from prompt', () => {
      const result = validatePrompt('  A beautiful sunset  ');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('A beautiful sunset');
    });

    test('should reject empty prompt', () => {
      const result = validatePrompt('');
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('REQUIRED');
    });

    test('should reject null prompt', () => {
      const result = validatePrompt(null);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('REQUIRED');
    });

    test('should reject non-string prompt', () => {
      const result = validatePrompt(123);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_TYPE');
    });

    test('should reject whitespace-only prompt', () => {
      const result = validatePrompt('   ');
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('EMPTY');
    });

    test('should reject too long prompt', () => {
      const longPrompt = 'a'.repeat(501); // Exceeds default max length
      const result = validatePrompt(longPrompt);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('TOO_LONG');
    });

    test('should reject inappropriate content', () => {
      const result = validatePrompt('Generate nude images');
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INAPPROPRIATE_CONTENT');
    });

    test('should reject violent content', () => {
      const result = validatePrompt('Show me violence and gore');
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INAPPROPRIATE_CONTENT');
    });
  });

  describe('validateGenerateImageRequest', () => {
    test('should validate correct request', () => {
      const request = {
        prompt: 'A beautiful landscape',
        options: {
          seed: 123,
          num_images: 2
        }
      };
      
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.data.prompt).toBe('A beautiful landscape');
      expect(result.data.options.seed).toBe(123);
    });

    test('should validate request without options', () => {
      const request = { prompt: 'A beautiful landscape' };
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(true);
    });

    test('should reject null request body', () => {
      const result = validateGenerateImageRequest(null);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_BODY');
    });

    test('should reject non-object request body', () => {
      const result = validateGenerateImageRequest('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_BODY');
    });

    test('should reject invalid prompt in request', () => {
      const request = { prompt: '' };
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(false);
    });

    test('should reject invalid seed', () => {
      const request = {
        prompt: 'Valid prompt',
        options: { seed: -1 }
      };
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_SEED');
    });

    test('should reject invalid num_images', () => {
      const request = {
        prompt: 'Valid prompt',
        options: { num_images: 0 }
      };
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_COUNT');
    });

    test('should reject too many images', () => {
      const request = {
        prompt: 'Valid prompt',
        options: { num_images: 15 }
      };
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_COUNT');
    });

    test('should reject invalid image dimensions', () => {
      const request = {
        prompt: 'Valid prompt',
        options: {
          image_size: { width: 100, height: 100 } // Too small
        }
      };
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_SIZE');
    });

    test('should reject non-integer dimensions', () => {
      const request = {
        prompt: 'Valid prompt',
        options: {
          image_size: { width: 512.5, height: 512 }
        }
      };
      const result = validateGenerateImageRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_DIMENSIONS');
    });
  });

  describe('validateHttpMethod', () => {
    test('should validate allowed method', () => {
      const result = validateHttpMethod('POST', ['POST', 'GET']);
      expect(result.isValid).toBe(true);
    });

    test('should reject disallowed method', () => {
      const result = validateHttpMethod('DELETE', ['POST', 'GET']);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    test('should use default allowed methods', () => {
      const result = validateHttpMethod('POST');
      expect(result.isValid).toBe(true);
    });

    test('should reject method not in default list', () => {
      const result = validateHttpMethod('GET');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    test('should normalize email case', () => {
      const result = validateEmail('TEST@EXAMPLE.COM');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    test('should trim email whitespace', () => {
      const result = validateEmail('  test@example.com  ');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    test('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('INVALID_FORMAT');
    });

    test('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('REQUIRED');
    });

    test('should reject null email', () => {
      const result = validateEmail(null);
      expect(result.isValid).toBe(false);
      expect(result.error.code).toBe('REQUIRED');
    });
  });

  describe('sanitizeInput', () => {
    test('should remove HTML tags', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    test('should remove javascript protocols', () => {
      const result = sanitizeInput('javascript:alert("xss")');
      expect(result).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
      const result = sanitizeInput('onclick=alert("xss")');
      expect(result).not.toContain('onclick=');
    });

    test('should trim whitespace', () => {
      const result = sanitizeInput('  clean text  ');
      expect(result).toBe('clean text');
    });

    test('should handle non-string input', () => {
      const result = sanitizeInput(123);
      expect(result).toBe('');
    });

    test('should preserve clean text', () => {
      const cleanText = 'This is clean text with numbers 123';
      const result = sanitizeInput(cleanText);
      expect(result).toBe(cleanText);
    });
  });
});