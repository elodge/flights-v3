/**
 * @fileoverview Personnel Import Validation Tests
 * 
 * @description Unit tests for personnel import validation functions
 * 
 * @coverage Tests field validation, normalization, and error handling
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeName,
  validateParty,
  parseDate,
  isValidEmail,
  validatePersonnelRow,
  validateAllPersonnelRows,
  getValidationSummary,
  PersonnelData
} from '@/lib/personnel-import/validation'

describe('Personnel Import Validation', () => {
  describe('normalizeName', () => {
    it('should trim and collapse spaces', () => {
      expect(normalizeName('  John   Smith  ')).toBe('John Smith')
      expect(normalizeName('Jane\tDoe\n')).toBe('Jane Doe')
      expect(normalizeName('Bob  Wilson')).toBe('Bob Wilson')
    })

    it('should handle empty strings', () => {
      expect(normalizeName('')).toBe('')
      expect(normalizeName('   ')).toBe('')
    })
  })

  describe('validateParty', () => {
    it('should accept valid parties case-insensitively', () => {
      expect(validateParty('A Party')).toBe('A Party')
      expect(validateParty('a party')).toBe('A Party')
      expect(validateParty('B PARTY')).toBe('B Party')
      expect(validateParty('c party')).toBe('C Party')
      expect(validateParty('D Party')).toBe('D Party')
    })

    it('should reject invalid parties', () => {
      expect(validateParty('Invalid Party')).toBe(null)
      expect(validateParty('Party A')).toBe(null)
      expect(validateParty('')).toBe(null)
      expect(validateParty('X Party')).toBe(null)
    })

    it('should handle whitespace', () => {
      expect(validateParty('  A Party  ')).toBe('A Party')
      expect(validateParty('\tB Party\n')).toBe('B Party')
    })
  })

  describe('parseDate', () => {
    it('should parse MM/DD/YYYY format', () => {
      expect(parseDate('12/31/2025')).toBe('2025-12-31')
      expect(parseDate('01/15/1985')).toBe('1985-01-15')
      expect(parseDate('6/5/2024')).toBe('2024-06-05')
    })

    it('should parse YYYY-MM-DD format', () => {
      expect(parseDate('2025-12-31')).toBe('2025-12-31')
      expect(parseDate('1985-01-15')).toBe('1985-01-15')
      expect(parseDate('2024-06-05')).toBe('2024-06-05')
    })

    it('should reject invalid dates', () => {
      expect(parseDate('invalid')).toBe(null)
      expect(parseDate('13/01/2025')).toBe(null) // Invalid month
      expect(parseDate('01/32/2025')).toBe(null) // Invalid day
      expect(parseDate('2025-13-01')).toBe(null) // Invalid month
      expect(parseDate('2025-01-32')).toBe(null) // Invalid day
    })

    it('should handle empty values', () => {
      expect(parseDate('')).toBe(null)
      expect(parseDate('   ')).toBe(null)
    })
  })

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
      expect(isValidEmail('user123@test-domain.org')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@domain')).toBe(false)
    })

    it('should accept empty emails (optional field)', () => {
      expect(isValidEmail('')).toBe(true)
      expect(isValidEmail('   ')).toBe(true)
    })
  })

  describe('validatePersonnelRow', () => {
    const validPersonnel: PersonnelData = {
      fullName: 'John Smith',
      party: 'A Party',
      email: 'john@example.com',
      phone: '+1-555-0123'
    }

    it('should validate correct data', () => {
      const result = validatePersonnelRow(validPersonnel, 0, [validPersonnel])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require full name', () => {
      const invalidData = { ...validPersonnel, fullName: '' }
      const result = validatePersonnelRow(invalidData, 0, [invalidData])
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual({
        type: 'error',
        message: 'Full Name is required',
        field: 'fullName'
      })
    })

    it('should validate full name length', () => {
      const shortName = { ...validPersonnel, fullName: 'Jo' }
      const result1 = validatePersonnelRow(shortName, 0, [shortName])
      expect(result1.isValid).toBe(false)
      expect(result1.errors).toContainEqual({
        type: 'error',
        message: 'Full Name must be at least 3 characters',
        field: 'fullName'
      })

      const longName = { ...validPersonnel, fullName: 'A'.repeat(121) }
      const result2 = validatePersonnelRow(longName, 0, [longName])
      expect(result2.isValid).toBe(false)
      expect(result2.errors).toContainEqual({
        type: 'error',
        message: 'Full Name must be 120 characters or less',
        field: 'fullName'
      })
    })

    it('should require valid party', () => {
      const invalidData = { ...validPersonnel, party: 'Invalid Party' }
      const result = validatePersonnelRow(invalidData, 0, [invalidData])
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual({
        type: 'error',
        message: 'Party must be one of: A Party, B Party, C Party, D Party',
        field: 'party'
      })
    })

    it('should validate email format', () => {
      const invalidData = { ...validPersonnel, email: 'invalid-email' }
      const result = validatePersonnelRow(invalidData, 0, [invalidData])
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual({
        type: 'error',
        message: 'Invalid email format',
        field: 'email'
      })
    })

    it('should validate field length limits', () => {
      const invalidData = {
        ...validPersonnel,
        phone: 'A'.repeat(41), // Too long
        notes: 'B'.repeat(1001) // Too long
      }
      const result = validatePersonnelRow(invalidData, 0, [invalidData])
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual({
        type: 'error',
        message: 'Phone must be 40 characters or less',
        field: 'phone'
      })
      expect(result.errors).toContainEqual({
        type: 'error',
        message: 'Notes must be 1000 characters or less',
        field: 'notes'
      })
    })

    it('should detect duplicates within file', () => {
      const duplicateData = [
        { ...validPersonnel, fullName: 'John Smith' },
        { ...validPersonnel, fullName: 'John Smith' }
      ]
      const result = validatePersonnelRow(duplicateData[0], 0, duplicateData)
      expect(result.warnings).toContainEqual({
        type: 'warning',
        message: 'Duplicate name found in file (2 occurrences)',
        field: 'fullName'
      })
    })
  })

  describe('validateAllPersonnelRows', () => {
    it('should validate multiple rows', () => {
      const data = [
        { fullName: 'John Smith', party: 'A Party' },
        { fullName: 'Jane Doe', party: 'B Party' }
      ]
      const results = validateAllPersonnelRows(data)
      expect(results).toHaveLength(2)
      expect(results.every(r => r.isValid)).toBe(true)
    })

    it('should reject too many rows', () => {
      const data = Array(501).fill(null).map((_, i) => ({
        fullName: `Person ${i}`,
        party: 'A Party'
      }))
      const results = validateAllPersonnelRows(data)
      expect(results).toHaveLength(1)
      expect(results[0].errors).toContainEqual({
        type: 'error',
        message: 'Maximum 500 rows allowed per import'
      })
    })
  })

  describe('getValidationSummary', () => {
    it('should count errors and warnings correctly', () => {
      const validations = [
        { rowIndex: 0, errors: [], warnings: [], isValid: true },
        { rowIndex: 1, errors: [{ type: 'error' as const, message: 'Error 1' }], warnings: [], isValid: false },
        { rowIndex: 2, errors: [], warnings: [{ type: 'warning' as const, message: 'Warning 1' }], isValid: true },
        { rowIndex: 3, errors: [{ type: 'error' as const, message: 'Error 2' }], warnings: [{ type: 'warning' as const, message: 'Warning 2' }], isValid: false }
      ]
      
      const summary = getValidationSummary(validations)
      expect(summary.totalErrors).toBe(2)
      expect(summary.totalWarnings).toBe(2)
      expect(summary.validRows).toBe(2)
      expect(summary.totalRows).toBe(4)
    })
  })
})
