/**
 * @fileoverview Unit tests for personnel validation schemas
 * 
 * @description Tests Zod validation schemas for personnel data validation
 * @coverage Validates addPersonSchema and updatePersonSchema behavior
 */

import { describe, it, expect } from 'vitest';
import { addPersonSchema, updatePersonSchema, PartyEnum } from '../personnel';

describe('Personnel Validation Schemas', () => {
  describe('PartyEnum', () => {
    it('should accept valid party values', () => {
      expect(PartyEnum.parse('A Party')).toBe('A Party');
      expect(PartyEnum.parse('B Party')).toBe('B Party');
      expect(PartyEnum.parse('C Party')).toBe('C Party');
      expect(PartyEnum.parse('D Party')).toBe('D Party');
    });

    it('should reject invalid party values', () => {
      expect(() => PartyEnum.parse('E Party')).toThrow();
      expect(() => PartyEnum.parse('Invalid Party')).toThrow();
      expect(() => PartyEnum.parse('')).toThrow();
    });
  });

  describe('addPersonSchema', () => {
    it('should accept valid personnel data', () => {
      const validData = {
        full_name: 'John Doe',
        party: 'A Party',
        email: 'john@example.com',
        phone: '+1 (415) 555-0123',
        seat_pref: 'Window',
        ff_numbers: 'AA123456, UA789012',
        notes: 'Vegetarian meals preferred'
      };

      const result = addPersonSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should accept minimal required data', () => {
      const minimalData = {
        full_name: 'Jane Smith',
        party: 'B Party'
      };

      const result = addPersonSchema.parse(minimalData);
      expect(result.full_name).toBe('Jane Smith');
      expect(result.party).toBe('B Party');
    });

    it('should reject empty full name', () => {
      const invalidData = {
        full_name: '',
        party: 'A Party'
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Full name must be at least 3 characters');
    });

    it('should reject full name that is too short', () => {
      const invalidData = {
        full_name: 'Jo',
        party: 'A Party'
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Full name must be at least 3 characters');
    });

    it('should reject full name that is too long', () => {
      const invalidData = {
        full_name: 'A'.repeat(121),
        party: 'A Party'
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Full name must be less than 120 characters');
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        full_name: 'John Doe',
        party: 'A Party',
        email: 'invalid-email'
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Invalid email format');
    });

    it('should accept empty string email and transform to undefined', () => {
      const data = {
        full_name: 'John Doe',
        party: 'A Party',
        email: ''
      };

      const result = addPersonSchema.parse(data);
      expect(result.email).toBeUndefined();
    });

    it('should validate phone numbers using international format', () => {
      const validPhoneData = {
        full_name: 'John Doe',
        party: 'A Party',
        phone: '+1 (415) 555-0123'
      };

      const result = addPersonSchema.parse(validPhoneData);
      expect(result.phone).toBe('+1 (415) 555-0123');
    });

    it('should reject invalid phone numbers', () => {
      const invalidData = {
        full_name: 'John Doe',
        party: 'A Party',
        phone: 'invalid-phone'
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Please enter a valid phone number');
    });

    it('should accept international phone numbers from different countries', () => {
      const testCases = [
        '+1 415 555 0123',    // US
        '+44 20 7946 0958',   // UK
        '+33 1 42 86 83 26',  // France
        '+49 30 12345678',    // Germany
      ];

      testCases.forEach(phone => {
        const data = {
          full_name: 'John Doe',
          party: 'A Party',
          phone
        };

        const result = addPersonSchema.parse(data);
        expect(result.phone).toBe(phone);
      });
    });

    it('should reject seat preference that is too long', () => {
      const invalidData = {
        full_name: 'John Doe',
        party: 'A Party',
        seat_pref: 'A'.repeat(41)
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Seat preference must be less than 40 characters');
    });

    it('should reject frequent flyer numbers that are too long', () => {
      const invalidData = {
        full_name: 'John Doe',
        party: 'A Party',
        ff_numbers: 'A'.repeat(201)
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Frequent flyer numbers must be less than 200 characters');
    });

    it('should reject notes that are too long', () => {
      const invalidData = {
        full_name: 'John Doe',
        party: 'A Party',
        notes: 'A'.repeat(1001)
      };

      expect(() => addPersonSchema.parse(invalidData)).toThrow('Notes must be less than 1000 characters');
    });

    it('should trim whitespace from string fields', () => {
      const data = {
        full_name: '  John Doe  ',
        party: 'A Party',
        email: 'john@example.com', // Don't add spaces to email as it would be invalid
        phone: '  +1 (415) 555-0123  '
      };

      const result = addPersonSchema.parse(data);
      expect(result.full_name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('+1 (415) 555-0123');
    });
  });

  describe('updatePersonSchema', () => {
    it('should accept partial updates', () => {
      const partialData = {
        full_name: 'John Updated',
        status: 'inactive'
      };

      const result = updatePersonSchema.parse(partialData);
      expect(result.full_name).toBe('John Updated');
      expect(result.status).toBe('inactive');
    });

    it('should accept empty object for no updates', () => {
      const result = updatePersonSchema.parse({});
      expect(result).toEqual({});
    });

    it('should validate status enum', () => {
      expect(updatePersonSchema.parse({ status: 'active' }).status).toBe('active');
      expect(updatePersonSchema.parse({ status: 'inactive' }).status).toBe('inactive');
      expect(() => updatePersonSchema.parse({ status: 'invalid' })).toThrow();
    });

    it('should inherit validation rules from addPersonSchema', () => {
      // Should reject invalid email format
      expect(() => updatePersonSchema.parse({ email: 'invalid-email' })).toThrow('Invalid email format');
      
      // Should reject invalid party
      expect(() => updatePersonSchema.parse({ party: 'E Party' })).toThrow();
      
      // Should reject name that is too short
      expect(() => updatePersonSchema.parse({ full_name: 'Jo' })).toThrow('Full name must be at least 3 characters');
    });
  });
});
