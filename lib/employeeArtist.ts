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
 * Safely converts Next.js searchParams to URLSearchParams
 * 
 * @description Next.js searchParams can contain string[], undefined, or Symbol values
 * that cause errors when converted to URLSearchParams. This helper safely converts
 * them by taking the first string value from arrays and ignoring non-string values.
 * 
 * @param searchParams - Next.js searchParams object
 * @returns URLSearchParams - Safe URLSearchParams object
 */
export function searchParamsToURLSearchParams(
  searchParams: { [key: string]: string | string[] | undefined }
): URLSearchParams {
  const urlParams = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      urlParams.set(key, value)
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      urlParams.set(key, value[0])
    }
    // Ignore undefined values and non-string types
  })
  return urlParams
}

/**
 * Gets the selected artist ID from URL params (server-side)
 * 
 * @description Determines the currently selected artist for filtering employee portal
 * data. Since this utility file can be imported by client components, it only
 * checks URL parameters. Cookie checking should be done in server components.
 * 
 * @param searchParams - URL search parameters from the request OR Next.js searchParams
 * @returns string | null - Artist UUID or null for "All Artists"
 * 
 * @algorithm
 * 1. Check URL parameter 'artist' (highest precedence)
 * 2. Return null for "All Artists" if not found
 * 
 * @example
 * ```typescript
 * // In a server component or page
 * const artistId = getSelectedArtistIdFromSearchParams(searchParams)
 * if (artistId) {
 *   // Filter data by artist
 * } else {
 *   // Show all artists' data or check cookie separately
 * }
 * ```
 */
export function getSelectedArtistIdFromSearchParams(
  searchParams: { [key: string]: string | string[] | undefined }
): string | null {
  // Convert safely to URLSearchParams first
  const urlParams = searchParamsToURLSearchParams(searchParams)
  return getSelectedArtistIdServer(urlParams)
}

/**
 * Gets the selected artist ID from URLSearchParams (server-side)
 * 
 * @description Lower-level function that works with URLSearchParams directly.
 * Use getSelectedArtistIdFromSearchParams for Next.js searchParams objects.
 * 
 * @param searchParams - URLSearchParams object
 * @returns string | null - Artist UUID or null for "All Artists"
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
   * Next.js router. Maintains consistent state across client and server.
   * 
   * @param artistId - Artist UUID to select, or null for "All Artists"
   * @param router - Next.js router instance for navigation
   * 
   * @algorithm
   * 1. Update cookie with new artist ID (or remove if null)
   * 2. Update URL search parameters using Next.js router
   * 3. No page refresh needed - Next.js handles server-side data updates
   */
  setSelectedArtistId(artistId: string | null, router?: any): void {
    // Update cookie
    if (artistId) {
      const expires = new Date()
      expires.setTime(expires.getTime() + COOKIE_MAX_AGE * 1000)
      document.cookie = `${EMPLOYEE_ARTIST_COOKIE}=${artistId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    } else {
      document.cookie = `${EMPLOYEE_ARTIST_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    }

    // Update URL without reload using Next.js router
    if (router) {
      const url = new URL(window.location.href)
      if (artistId) {
        url.searchParams.set('artist', artistId)
      } else {
        url.searchParams.delete('artist')
      }
      
      // Use router.replace for smooth navigation without reload
      router.replace(`${url.pathname}${url.search}`, { scroll: false })
    }
  }
}
