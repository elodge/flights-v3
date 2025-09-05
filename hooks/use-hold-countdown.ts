/**
 * @fileoverview Hold countdown hook for real-time hold expiration display
 * 
 * @description Custom React hook that provides live countdown display for flight
 * option holds. Updates every minute and formats remaining time as human-readable
 * strings like "2h 14m" or "Expired".
 * 
 * @access Client-side only
 * @security No security implications - read-only time calculation
 */

'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook for displaying hold countdown with live updates
 * 
 * @description Calculates and formats remaining time until hold expiration.
 * Updates every minute to provide real-time countdown display. Returns
 * human-readable time strings or "Expired" when time has passed.
 * 
 * @param expiresAt - ISO timestamp string of when the hold expires, or undefined
 * @returns string - Formatted time remaining ("2h 14m") or "Expired" or null
 * 
 * @business_rule Updates every 60 seconds for live countdown
 * @business_rule Shows "Expired" for past dates
 * @business_rule Returns null if no expiration date provided
 * 
 * @example
 * ```tsx
 * function HoldDisplay({ holdExpiresAt }: { holdExpiresAt: string }) {
 *   const countdown = useHoldCountdown(holdExpiresAt)
 *   
 *   return (
 *     <Badge className="flex items-center gap-1">
 *       <Clock className="h-3 w-3" />
 *       {countdown}
 *     </Badge>
 *   )
 * }
 * ```
 */
export function useHoldCountdown(expiresAt?: string): string | null {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  
  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining(null)
      return
    }
    
    /**
     * Calculates and formats time remaining until expiration
     * 
     * @description Computes difference between expiration time and current time,
     * then formats as human-readable string with hours and minutes.
     * 
     * @returns string - Formatted time like "2h 14m" or "Expired"
     * 
     * @algorithm
     * 1. Calculate milliseconds difference
     * 2. Convert to total minutes
     * 3. Extract hours and remaining minutes
     * 4. Format as "Xh Ym" or "Xm" for less than 1 hour
     */
    const calculateTimeRemaining = (): string => {
      const now = new Date()
      const expires = new Date(expiresAt)
      
      // CONTEXT: Handle invalid dates
      if (isNaN(expires.getTime())) {
        return 'Expired'
      }
      
      const diffMs = expires.getTime() - now.getTime()
      
      // BUSINESS_RULE: Show "Expired" for past dates or very short durations
      if (diffMs <= 0) {
        return 'Expired'
      }
      
      // ALGORITHM: Convert milliseconds to human-readable format
      const totalMinutes = Math.floor(diffMs / (1000 * 60))
      
      // BUSINESS_RULE: Show "Expired" for less than 1 minute remaining
      if (totalMinutes <= 0) {
        return 'Expired'
      }
      
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      
      // CONTEXT: Format based on time remaining
      if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      } else {
        return `${minutes}m`
      }
    }
    
    // CONTEXT: Set initial value and start interval for live updates
    setTimeRemaining(calculateTimeRemaining())
    
    // BUSINESS_RULE: Update every minute (60 seconds) for real-time display
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 60 * 1000)
    
    // CLEANUP: Clear interval when component unmounts or expiresAt changes
    return () => clearInterval(interval)
  }, [expiresAt])
  
  return timeRemaining
}
