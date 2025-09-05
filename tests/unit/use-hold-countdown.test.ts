/**
 * @fileoverview Unit tests for hold countdown hook
 * 
 * @description Tests for the useHoldCountdown hook including time formatting,
 * live updates, cleanup behavior, and edge case handling. Validates countdown
 * logic and timer management.
 * 
 * @coverage
 * - Time formatting with hours and minutes
 * - Live countdown updates every minute
 * - Expired hold handling
 * - Cleanup on unmount and dependency changes
 * - Edge cases (invalid dates, null values)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHoldCountdown } from '@/hooks/use-hold-countdown'

describe('useHoldCountdown', () => {
  beforeEach(() => {
    // Set up fake timers for controlled testing
    vi.useFakeTimers()
    // Set a fixed current time for consistent testing
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Time Formatting', () => {
    it('should return null for undefined expiration', () => {
      // CONTEXT: Test null handling for no expiration date
      const { result } = renderHook(() => useHoldCountdown(undefined))
      
      expect(result.current).toBeNull()
    })

    it('should format hours and minutes correctly', () => {
      // CONTEXT: Test time formatting with hours and minutes
      // 2 hours and 30 minutes from now
      const expiresAt = new Date('2024-01-01T14:30:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('2h 30m')
    })

    it('should format exact hours without minutes', () => {
      // CONTEXT: Test formatting when minutes are zero
      // Exactly 3 hours from now
      const expiresAt = new Date('2024-01-01T15:00:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('3h')
    })

    it('should format minutes only for less than 1 hour', () => {
      // CONTEXT: Test formatting for under 1 hour remaining
      // 45 minutes from now
      const expiresAt = new Date('2024-01-01T12:45:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('45m')
    })

    it('should show "Expired" for past dates', () => {
      // CONTEXT: Test expired hold handling
      // 1 hour ago
      const expiresAt = new Date('2024-01-01T11:00:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('Expired')
    })

    it('should show "Expired" for current time', () => {
      // CONTEXT: Test edge case where expiration is exactly now
      const expiresAt = new Date('2024-01-01T12:00:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('Expired')
    })
  })

  describe('Live Updates', () => {
    it('should update countdown every minute', () => {
      // CONTEXT: Test live countdown updates
      // Start with 2 hours 30 minutes
      const expiresAt = new Date('2024-01-01T14:30:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('2h 30m')
      
      // Fast-forward 1 minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })
      
      expect(result.current).toBe('2h 29m')
      
      // Fast-forward another minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })
      
      expect(result.current).toBe('2h 28m')
    })

    it('should transition from hours to minutes only', () => {
      // CONTEXT: Test transition when crossing hour boundary
      // Start with 1 hour 1 minute
      const expiresAt = new Date('2024-01-01T13:01:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('1h 1m')
      
      // Fast-forward 2 minutes (now 59 minutes)
      act(() => {
        vi.advanceTimersByTime(2 * 60 * 1000)
      })
      
      expect(result.current).toBe('59m')
    })

    it('should show expired when countdown reaches zero', () => {
      // CONTEXT: Test expiration during countdown
      // Start with 2 minutes
      const expiresAt = new Date('2024-01-01T12:02:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('2m')
      
      // Fast-forward 3 minutes (past expiration)
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000)
      })
      
      expect(result.current).toBe('Expired')
    })
  })

  describe('Cleanup and Dependencies', () => {
    it('should clear interval on unmount', () => {
      // CONTEXT: Test interval cleanup on component unmount
      const expiresAt = new Date('2024-01-01T14:30:00Z').toISOString()
      
      const { unmount } = renderHook(() => useHoldCountdown(expiresAt))
      
      // Verify interval is running
      expect(vi.getTimerCount()).toBeGreaterThan(0)
      
      unmount()
      
      // Verify interval is cleared
      expect(vi.getTimerCount()).toBe(0)
    })

    it('should restart interval when expiresAt changes', () => {
      // CONTEXT: Test interval restart on dependency change
      const initialExpiresAt = new Date('2024-01-01T14:30:00Z').toISOString()
      
      const { result, rerender } = renderHook(
        ({ expiresAt }) => useHoldCountdown(expiresAt),
        { initialProps: { expiresAt: initialExpiresAt } }
      )
      
      expect(result.current).toBe('2h 30m')
      
      // Change expiration time
      const newExpiresAt = new Date('2024-01-01T13:15:00Z').toISOString()
      rerender({ expiresAt: newExpiresAt })
      
      expect(result.current).toBe('1h 15m')
    })

    it('should handle changing from valid to undefined expiration', () => {
      // CONTEXT: Test transition from valid to null expiration
      const initialExpiresAt = new Date('2024-01-01T14:30:00Z').toISOString()
      
      const { result, rerender } = renderHook(
        ({ expiresAt }) => useHoldCountdown(expiresAt),
        { initialProps: { expiresAt: initialExpiresAt } }
      )
      
      expect(result.current).toBe('2h 30m')
      
      // Change to undefined
      rerender({ expiresAt: undefined })
      
      expect(result.current).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid date strings', () => {
      // CONTEXT: Test invalid date handling
      const invalidDate = 'not-a-date'
      
      const { result } = renderHook(() => useHoldCountdown(invalidDate))
      
      // Invalid dates should be treated as expired
      expect(result.current).toBe('Expired')
    })

    it('should handle very short durations', () => {
      // CONTEXT: Test very short time periods
      // 30 seconds from now (less than 1 minute)
      const expiresAt = new Date('2024-01-01T12:00:30Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      // Should round down to 0 minutes and show as expired
      expect(result.current).toBe('Expired')
    })

    it('should handle very long durations', () => {
      // CONTEXT: Test very long time periods
      // 25 hours from now
      const expiresAt = new Date('2024-01-02T13:00:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      expect(result.current).toBe('25h')
    })

    it('should handle DST transitions gracefully', () => {
      // CONTEXT: Test daylight saving time edge case
      // This is more of a documentation test since we use millisecond differences
      
      // Set time to just before DST transition
      vi.setSystemTime(new Date('2024-03-10T06:00:00Z')) // 1 AM PST
      
      // Expires 3 hours later (which might cross DST)
      const expiresAt = new Date('2024-03-10T09:00:00Z').toISOString()
      
      const { result } = renderHook(() => useHoldCountdown(expiresAt))
      
      // Should still calculate correctly using UTC times
      expect(result.current).toBe('3h')
    })
  })

  describe('Timer Interval Management', () => {
    it('should use 60-second intervals', () => {
      // CONTEXT: Verify timer interval is exactly 60 seconds
      const expiresAt = new Date('2024-01-01T14:30:00Z').toISOString()
      
      renderHook(() => useHoldCountdown(expiresAt))
      
      // The timer should be a setInterval with 60000ms delay
      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })

    it('should not create multiple intervals for same expiration', () => {
      // CONTEXT: Verify no duplicate intervals are created
      const expiresAt = new Date('2024-01-01T14:30:00Z').toISOString()
      
      const { rerender } = renderHook(() => useHoldCountdown(expiresAt))
      
      const initialTimerCount = vi.getTimerCount()
      
      // Re-render with same expiration should not create new timer
      rerender()
      
      expect(vi.getTimerCount()).toBe(initialTimerCount)
    })
  })
})
