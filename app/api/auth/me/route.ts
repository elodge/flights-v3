/**
 * @fileoverview Current user API endpoint
 * 
 * @description Returns the current authenticated user's profile and role information.
 * Used by client-side components to get user data and check permissions.
 * 
 * @route GET /api/auth/me
 * @access Authenticated users only
 * @returns User object with profile data or 401 if not authenticated
 */

import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'

/**
 * Gets the current authenticated user's information
 * 
 * @description API endpoint to retrieve user profile and role data.
 * Returns 401 if not authenticated, 500 on server errors.
 * 
 * @returns Promise<NextResponse> JSON response with user data or error
 * 
 * @example
 * ```typescript
 * // Client-side usage
 * const response = await fetch('/api/auth/me')
 * if (response.ok) {
 *   const { user } = await response.json()
 *   console.log(user.role) // 'client', 'agent', or 'admin'
 * }
 * ```
 */
export async function GET() {
  try {
    const user = await getServerUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}
