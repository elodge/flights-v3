/**
 * @fileoverview Tests for phone number validation and parsing utilities
 * 
 * @description Tests the parsePhoneInput and formatPhoneDisplay functions
 * from the personnel validation module. Covers international phone number
 * handling, E.164 format conversion, and display formatting.
 * 
 * @coverage
 * - Phone number parsing with different country defaults
 * - E.164 format conversion and validation
 * - Phone number formatting for display
 * - Error handling for invalid numbers
 * - Edge cases and malformed input
 */

import { describe, it, expect } from 'vitest';
import { parsePhoneInput, formatPhoneDisplay } from '@/lib/validation/personnel';

describe('Phone Number Validation and Parsing', () => {
  describe('parsePhoneInput', () => {
    it('should parse US phone numbers to E.164 format', () => {
      // CONTEXT: Test US phone number parsing
      const result = parsePhoneInput('+1 (415) 555-0123');
      
      expect(result).toEqual({
        e164: '+14155550123',
        country: 'US',
        nationalNumber: '4155550123',
        extension: null,
      });
    });

    it('should parse national format with default country', () => {
      // CONTEXT: Test national format parsing with default country
      const result = parsePhoneInput('(415) 555-0123', 'US');
      
      expect(result).toEqual({
        e164: '+14155550123',
        country: 'US', 
        nationalNumber: '4155550123',
        extension: null,
      });
    });

    it('should parse international phone numbers from different countries', () => {
      // CONTEXT: Test international numbers
      const testCases = [
        {
          input: '+44 20 7946 0958',
          expected: {
            e164: '+442079460958',
            country: 'GB',
            nationalNumber: '2079460958',
            extension: null,
          }
        },
        {
          input: '+33 1 42 86 83 26',
          expected: {
            e164: '+33142868326',
            country: 'FR', 
            nationalNumber: '142868326',
            extension: null,
          }
        },
        {
          input: '+49 30 12345678',
          expected: {
            e164: '+493012345678',
            country: 'DE',
            nationalNumber: '3012345678',
            extension: null,
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parsePhoneInput(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle phone numbers with extensions', () => {
      // CONTEXT: Test extension parsing
      const result = parsePhoneInput('+1 (415) 555-0123 ext 123');
      
      expect(result).toEqual({
        e164: '+14155550123',
        country: 'US',
        nationalNumber: '4155550123',
        extension: '123',
      });
    });

    it('should return null for invalid phone numbers', () => {
      // CONTEXT: Test invalid input handling
      const invalidNumbers = [
        'invalid',
        '123',
        '+1',
        'abc-def-ghij',
        '',
        '   ',
      ];

      invalidNumbers.forEach(invalid => {
        const result = parsePhoneInput(invalid);
        expect(result).toBeNull();
      });
    });

    it('should return null for undefined or empty input', () => {
      // CONTEXT: Test null/undefined input handling
      expect(parsePhoneInput(undefined)).toBeNull();
      expect(parsePhoneInput('')).toBeNull();
      expect(parsePhoneInput('   ')).toBeNull();
    });

    it('should handle malformed international numbers gracefully', () => {
      // CONTEXT: Test graceful error handling
      const malformedNumbers = [
        '+999 123 456 789', // Invalid country code
        '+1 123',           // Too short
        '+1 1234567890123456789', // Too long
      ];

      malformedNumbers.forEach(malformed => {
        const result = parsePhoneInput(malformed);
        expect(result).toBeNull();
      });
    });

    it('should parse mobile and landline numbers', () => {
      // CONTEXT: Test different number types
      const mobileUS = parsePhoneInput('+1 415 555 0123');
      const landlineUS = parsePhoneInput('+1 212 555 0123');
      
      expect(mobileUS?.e164).toBe('+14155550123');
      expect(landlineUS?.e164).toBe('+12125550123');
      expect(mobileUS?.country).toBe('US');
      expect(landlineUS?.country).toBe('US');
    });
  });

  describe('formatPhoneDisplay', () => {
    it('should format E.164 numbers for international display', () => {
      // CONTEXT: Test international formatting
      const testCases = [
        { e164: '+14155550123', expected: '+1 415 555 0123' },
        { e164: '+442079460958', expected: '+44 20 7946 0958' },
        { e164: '+33142868326', expected: '+33 1 42 86 83 26' },
        { e164: '+493012345678', expected: '+49 30 12345678' },
      ];

      testCases.forEach(({ e164, expected }) => {
        const result = formatPhoneDisplay(e164, 'international');
        expect(result).toBe(expected);
      });
    });

    it('should format E.164 numbers for national display', () => {
      // CONTEXT: Test national formatting
      const testCases = [
        { e164: '+14155550123', expected: '(415) 555-0123' },
        { e164: '+442079460958', expected: '020 7946 0958' },
        { e164: '+33142868326', expected: '01 42 86 83 26' },
      ];

      testCases.forEach(({ e164, expected }) => {
        const result = formatPhoneDisplay(e164, 'national');
        expect(result).toBe(expected);
      });
    });

    it('should return empty string for null input', () => {
      // CONTEXT: Test null input handling
      expect(formatPhoneDisplay(null)).toBe('');
      expect(formatPhoneDisplay(null, 'national')).toBe('');
    });

    it('should return original value for invalid E.164 numbers', () => {
      // CONTEXT: Test fallback behavior for invalid input
      const invalidE164 = 'invalid-number';
      const result = formatPhoneDisplay(invalidE164);
      expect(result).toBe(invalidE164);
    });

    it('should default to international format when format not specified', () => {
      // CONTEXT: Test default formatting behavior
      const e164 = '+14155550123';
      const result = formatPhoneDisplay(e164);
      const explicitInternational = formatPhoneDisplay(e164, 'international');
      
      expect(result).toBe(explicitInternational);
      expect(result).toBe('+1 415 555 0123');
    });

    it('should handle empty string input gracefully', () => {
      // CONTEXT: Test empty string handling
      const result = formatPhoneDisplay('');
      expect(result).toBe('');
    });
  });

  describe('Integration Tests', () => {
    it('should round-trip phone numbers through parse and format', () => {
      // CONTEXT: Test parsing then formatting produces consistent results
      const inputNumbers = [
        '+1 (415) 555-0123',
        '+44 20 7946 0958',
        '+33 1 42 86 83 26',
        '(415) 555-0123', // National format
      ];

      inputNumbers.forEach(input => {
        const parsed = parsePhoneInput(input, 'US');
        if (parsed) {
          const formatted = formatPhoneDisplay(parsed.e164, 'international');
          expect(formatted).toBeTruthy();
          expect(formatted.length).toBeGreaterThan(0);
          
          // The formatted number should be valid when parsed again
          const reparsed = parsePhoneInput(formatted);
          expect(reparsed?.e164).toBe(parsed.e164);
        }
      });
    });

    it('should preserve country information through parse operations', () => {
      // CONTEXT: Test country code preservation
      const testCases = [
        { input: '+1 415 555 0123', expectedCountry: 'US' },
        { input: '+44 20 7946 0958', expectedCountry: 'GB' },
        { input: '+33 1 42 86 83 26', expectedCountry: 'FR' },
        { input: '+49 30 12345678', expectedCountry: 'DE' },
        { input: '+61 2 9374 4000', expectedCountry: 'AU' },
      ];

      testCases.forEach(({ input, expectedCountry }) => {
        const parsed = parsePhoneInput(input);
        expect(parsed?.country).toBe(expectedCountry);
      });
    });

    it('should handle database storage and retrieval simulation', () => {
      // CONTEXT: Simulate database round-trip scenario
      const userInput = '+1 (415) 555-0123 ext 123';
      
      // Parse for storage
      const parsed = parsePhoneInput(userInput);
      expect(parsed).toBeTruthy();
      
      // Simulate database storage (E.164 format)
      const storedE164 = parsed!.e164;
      const storedCountry = parsed!.country;
      const storedNational = parsed!.nationalNumber;
      const storedExtension = parsed!.extension;
      
      // Simulate database retrieval and display formatting
      const displayFormat = formatPhoneDisplay(storedE164, 'international');
      expect(displayFormat).toBe('+1 415 555 0123');
      
      // Verify all components are preserved
      expect(storedE164).toBe('+14155550123');
      expect(storedCountry).toBe('US');
      expect(storedNational).toBe('4155550123');
      expect(storedExtension).toBe('123');
    });
  });
});
