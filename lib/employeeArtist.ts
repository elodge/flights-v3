/**
 * @fileoverview Employee artist selection utilities
 * 
 * @description Helper functions for managing artist filtering in the employee portal.
 * Handles URL parameters, cookie persistence, and state synchronization for artist
 * selection across dashboard and booking queue pages.
 * 
 * @access Employee portal only
 * @persistence 90-day cookie storage
 */

import type { ReadonlyURLSearchParams } from 'next/navigation'

/**
 * Cookie name for storing selected artist ID
 */
export const EMPLOYEE_ARTIST_COOKIE = 'employee_artist_id'

/**
 * Cookie expiration time (90 days)
 */
export const COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // 90 days in seconds

/**
 * Gets the selected artist ID from URL params (server-side)
 * 
 * @description Determines the currently selected artist for filtering employee portal
 * data. Since this utility file can be imported by client components, it only
 * checks URL parameters. Cookie checking should be done in server components.
 * 
 * @param searchParams - URL search parameters from the request
 * @returns string | null - Artist UUID or null for "All Artists"
 * 
 * @algorithm
 * 1. Check URL parameter 'artist' (highest precedence)
 * 2. Return null for "All Artists" if not found
 * 
 * @example
 * ```typescript
 * // In a server component or page
 * const artistId = getSelectedArtistIdServer(searchParams)
 * if (artistId) {
 *   // Filter data by artist
 * } else {
 *   // Show all artists' data or check cookie separately
 * }
 * ```
 */
export function getSelectedArtistIdServer(
  searchParams: ReadonlyURLSearchParams | URLSearchParams
): string | null {
  // Priority 1: URL parameter
  const urlArtistId = searchParams.get('artist')
  if (urlArtistId) {
    return urlArtistId
  }

  // Return null - server components should check cookies separately
  return null
}



/**
 * Client-side utilities for artist selection management
 */
export const clientUtils = {
  /**
   * Gets the selected artist ID from cookies (client-side)
   * 
   * @description Reads the employee artist selection from browser cookies.
   * Used by client components when server-side data isn't available.
   * 
   * @returns string | null - Artist UUID or null for "All Artists"
   */
  getSelectedArtistId(): string | null {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    const artistCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${EMPLOYEE_ARTIST_COOKIE}=`)
    )
    
    if (artistCookie) {
      return artistCookie.split('=')[1].trim()
    }
    
    return null
  },

  /**
   * Sets the selected artist ID and updates URL (client-side)
   * 
   * @description Updates both cookie and URL without page reload using
   * History API. Maintains consistent state across client and server.
   * 
   * @param artistId - Artist UUID to select, or null for "All Artists"
   * 
   * @algorithm
   * 1. Update cookie with new artist ID (or remove if null)
   * 2. Update URL search parameters using replaceState
   * 3. Trigger page refresh to update server-side data
   */
  setSelectedArtistId(artistId: string | null): void {
    // Update cookie
    if (artistId) {
      const expires = new Date()
      expires.setTime(expires.getTime() + COOKIE_MAX_AGE * 1000)
      document.cookie = `${EMPLOYEE_ARTIST_COOKIE}=${artistId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    } else {
      document.cookie = `${EMPLOYEE_ARTIST_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    }

    // Update URL without reload
    const url = new URL(window.location.href)
    if (artistId) {
      url.searchParams.set('artist', artistId)
    } else {
      url.searchParams.delete('artist')
    }
    
    window.history.replaceState({}, '', url.toString())
    
    // Trigger page refresh to update server-side data
    window.location.reload()
  }
}
