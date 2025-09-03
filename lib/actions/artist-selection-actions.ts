/**
 * @fileoverview Server actions for employee artist selection
 * 
 * @description Server-side actions for managing artist filtering persistence
 * in the employee portal. Handles cookie operations that require server context.
 * 
 * @access Employee portal only
 * @storage Browser cookies with 90-day expiration
 */

'use server'

import { cookies } from 'next/headers'
import { EMPLOYEE_ARTIST_COOKIE, COOKIE_MAX_AGE } from '@/lib/employeeArtist'

/**
 * Gets the selected artist ID from cookies (server-side)
 * 
 * @description Reads the employee artist selection from server-side cookies.
 * Used in combination with URL parameter checking for complete state resolution.
 * 
 * @returns string | null - Artist UUID or null for "All Artists"
 * 
 * @example
 * ```typescript
 * // In a server component
 * const urlArtistId = getSelectedArtistIdServer(searchParams)
 * const cookieArtistId = await getSelectedArtistIdFromCookie()
 * const artistId = urlArtistId || cookieArtistId
 * ```
 */
export async function getSelectedArtistIdFromCookie(): Promise<string | null> {
  const cookieStore = cookies()
  const cookieArtistId = cookieStore.get(EMPLOYEE_ARTIST_COOKIE)?.value
  return cookieArtistId || null
}

/**
 * Sets the selected artist ID on server-side (for cookie persistence)
 * 
 * @description Updates the employee artist selection cookie. Used when URL
 * parameters change to ensure persistence across sessions.
 * 
 * @param artistId - Artist UUID to store, or null to clear selection
 * 
 * @business_rule Cookie expires after 90 days
 * @business_rule Null artistId removes the cookie entirely
 * @business_rule httpOnly=false allows client-side synchronization
 */
export async function setSelectedArtistIdServer(artistId: string | null): Promise<void> {
  const cookieStore = cookies()
  
  if (artistId) {
    cookieStore.set(EMPLOYEE_ARTIST_COOKIE, artistId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })
  } else {
    cookieStore.delete(EMPLOYEE_ARTIST_COOKIE)
  }
}
