import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
    })

    it('should handle conditional classes', () => {
      expect(cn('base-class', false && 'conditional-class')).toBe('base-class')
      expect(cn('base-class', true && 'conditional-class')).toBe('base-class conditional-class')
    })

    it('should override conflicting classes', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
    })

    it('should handle undefined and null values', () => {
      expect(cn('base-class', undefined, null, 'other-class')).toBe('base-class other-class')
    })

    it('should handle empty strings', () => {
      expect(cn('', 'valid-class', '')).toBe('valid-class')
    })
  })
})
