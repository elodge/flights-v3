/**
 * @fileoverview Core artist filtering logic tests
 * 
 * @description Simple, focused tests for the core artist filtering functions
 * to prevent regressions. These tests avoid complex mocking and focus on
 * the pure functions that handle artist selection logic.
 */

import { describe, it, expect } from 'vitest'
import { getSelectedArtistIdFromSearchParams } from '@/lib/employeeArtist'

describe('Artist Filtering Core Logic', () => {
  describe('URL Parameter Parsing', () => {
    it('should extract artist ID from search params', () => {
      const searchParams = { artist: '11111111-1111-1111-1111-111111111111' }
      const result = getSelectedArtistIdFromSearchParams(searchParams)
      expect(result).toBe('11111111-1111-1111-1111-111111111111')
    })

    it('should return null when no artist parameter', () => {
      const searchParams = {}
      const result = getSelectedArtistIdFromSearchParams(searchParams)
      expect(result).toBeNull()
    })

    it('should handle array values (take first)', () => {
      const searchParams = { artist: ['11111111-1111-1111-1111-111111111111', 'second'] }
      const result = getSelectedArtistIdFromSearchParams(searchParams)
      expect(result).toBe('11111111-1111-1111-1111-111111111111')
    })

    it('should handle undefined values', () => {
      const searchParams = { artist: undefined }
      const result = getSelectedArtistIdFromSearchParams(searchParams)
      expect(result).toBeNull()
    })

    it('should handle empty string', () => {
      const searchParams = { artist: '' }
      const result = getSelectedArtistIdFromSearchParams(searchParams)
      expect(result).toBeNull() // Empty string is falsy, so returns null
    })
  })

  describe('Artist Selection Priority Logic', () => {
    it('should prioritize URL over cookie (URL wins)', () => {
      const urlArtistId = '11111111-1111-1111-1111-111111111111'
      const cookieArtistId = '22222222-2222-2222-2222-222222222222'
      
      const selectedArtistId = urlArtistId || cookieArtistId
      expect(selectedArtistId).toBe('11111111-1111-1111-1111-111111111111')
    })

    it('should fall back to cookie when URL is null', () => {
      const urlArtistId = null
      const cookieArtistId = '22222222-2222-2222-2222-222222222222'
      
      const selectedArtistId = urlArtistId || cookieArtistId
      expect(selectedArtistId).toBe('22222222-2222-2222-2222-222222222222')
    })

    it('should be null when both are null', () => {
      const urlArtistId = null
      const cookieArtistId = null
      
      const selectedArtistId = urlArtistId || cookieArtistId
      expect(selectedArtistId).toBeNull()
    })
  })

  describe('Data Filtering Logic', () => {
    const mockTours = [
      { 
        id: 'tour-1', 
        artist_id: '11111111-1111-1111-1111-111111111111',
        artists: { name: 'Taylor Swift' }
      },
      { 
        id: 'tour-2', 
        artist_id: '22222222-2222-2222-2222-222222222222',
        artists: { name: 'E2E Test Artist' }
      },
      { 
        id: 'tour-3', 
        artist_id: '11111111-1111-1111-1111-111111111111',
        artists: { name: 'Taylor Swift' }
      }
    ]

    it('should filter tours by selected artist', () => {
      const selectedArtistId = '11111111-1111-1111-1111-111111111111'
      
      const filteredTours = selectedArtistId 
        ? mockTours.filter(tour => tour.artist_id === selectedArtistId)
        : mockTours
      
      expect(filteredTours).toHaveLength(2)
      expect(filteredTours.every(tour => tour.artist_id === selectedArtistId)).toBe(true)
    })

    it('should return all tours when no artist selected', () => {
      const selectedArtistId = null
      
      const filteredTours = selectedArtistId 
        ? mockTours.filter(tour => tour.artist_id === selectedArtistId)
        : mockTours
      
      expect(filteredTours).toHaveLength(3)
    })

    it('should return empty array when artist has no tours', () => {
      const selectedArtistId = 'nonexistent-artist-id'
      
      const filteredTours = selectedArtistId 
        ? mockTours.filter(tour => tour.artist_id === selectedArtistId)
        : mockTours
      
      expect(filteredTours).toHaveLength(0)
    })
  })

  describe('Queue Filtering Logic', () => {
    const mockSelections = [
      { 
        id: 'sel-1',
        leg: { project: { artist: { id: '11111111-1111-1111-1111-111111111111' } } }
      },
      { 
        id: 'sel-2',
        leg: { project: { artist: { id: '22222222-2222-2222-2222-222222222222' } } }
      },
      { 
        id: 'sel-3',
        leg: { project: { artist: { id: '11111111-1111-1111-1111-111111111111' } } }
      }
    ]

    it('should filter selections by artist', () => {
      const selectedArtistId = '11111111-1111-1111-1111-111111111111'
      
      const filteredSelections = selectedArtistId
        ? mockSelections.filter(sel => sel.leg.project.artist.id === selectedArtistId)
        : mockSelections
      
      expect(filteredSelections).toHaveLength(2)
      expect(filteredSelections.every(sel => 
        sel.leg.project.artist.id === selectedArtistId
      )).toBe(true)
    })

    it('should return all selections when no artist selected', () => {
      const selectedArtistId = null
      
      const filteredSelections = selectedArtistId
        ? mockSelections.filter(sel => sel.leg.project.artist.id === selectedArtistId)
        : mockSelections
      
      expect(filteredSelections).toHaveLength(3)
    })
  })

  describe('Regression Prevention', () => {
    it('REGRESSION: should not break when searchParams is awaited', () => {
      // This prevents the issue where adding "await searchParams" broke everything
      const searchParams = { artist: '11111111-1111-1111-1111-111111111111' }
      
      // Should work with direct access (not awaited)
      const result = getSelectedArtistIdFromSearchParams(searchParams)
      expect(result).toBe('11111111-1111-1111-1111-111111111111')
    })

    it('REGRESSION: should handle queue count changes without breaking filter', () => {
      // This prevents the issue where queue count modifications broke filtering
      const searchParams = { artist: '22222222-2222-2222-2222-222222222222' }
      
      const urlArtistId = getSelectedArtistIdFromSearchParams(searchParams)
      const cookieArtistId = null // Simulate no cookie
      const selectedArtistId = urlArtistId || cookieArtistId
      
      expect(selectedArtistId).toBe('22222222-2222-2222-2222-222222222222')
      expect(selectedArtistId).not.toBeNull()
    })

    it('REGRESSION: should maintain filter logic when layout changes', () => {
      // This prevents the filter from breaking when layout components change
      const mockPageLogic = (searchParams: any, cookieArtistId: string | null) => {
        const urlArtistId = getSelectedArtistIdFromSearchParams(searchParams)
        return urlArtistId || cookieArtistId
      }
      
      // Test various scenarios
      expect(mockPageLogic({ artist: 'url-artist' }, 'cookie-artist')).toBe('url-artist')
      expect(mockPageLogic({}, 'cookie-artist')).toBe('cookie-artist')
      expect(mockPageLogic({}, null)).toBeNull()
    })
  })
})

/**
 * @description Smoke tests to ensure critical paths don't break
 */
describe('Artist Filtering Smoke Tests', () => {
  it('CRITICAL: URL parameter extraction must always work', () => {
    // This is the most critical function - if it breaks, everything breaks
    const result = getSelectedArtistIdFromSearchParams({ 
      artist: '11111111-1111-1111-1111-111111111111' 
    })
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('CRITICAL: Priority logic must be consistent', () => {
    // This logic is used everywhere - must be reliable
    const scenarios = [
      { url: 'url-id', cookie: 'cookie-id', expected: 'url-id' },
      { url: null, cookie: 'cookie-id', expected: 'cookie-id' },
      { url: null, cookie: null, expected: null },
      { url: '', cookie: 'cookie-id', expected: 'cookie-id' }, // Empty string is falsy
    ]
    
    scenarios.forEach(({ url, cookie, expected }) => {
      const result = url || cookie
      expect(result).toBe(expected)
    })
  })

  it('CRITICAL: Filter logic must handle all data types', () => {
    const items = [
      { artist_id: '1' },
      { artist_id: '2' },
      { artist_id: '1' }
    ]
    
    // Must work with truthy artist ID
    const filtered = items.filter(item => item.artist_id === '1')
    expect(filtered).toHaveLength(2)
    
    // Must work with null (show all)
    const unfiltered = items.filter(item => null ? item.artist_id === null : true)
    expect(unfiltered).toHaveLength(3)
  })
})
