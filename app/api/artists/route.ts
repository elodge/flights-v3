/**
 * @fileoverview Artists API endpoint for employee portal
 * 
 * @description Provides list of artists for filtering employee dashboard
 * and booking queue. Restricted to employee access only.
 * 
 * @route GET /api/artists
 * @access Employee only (agent, admin roles)
 */

import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

/**
 * GET handler for artists list
 * 
 * @description Fetches all artists for employee portal filtering.
 * Returns artist ID and name for dropdown selection.
 * 
 * @returns Response with artists array or error
 * 
 * @access Employee only (agent, admin roles)
 * @database artists
 */
export async function GET() {
  try {
    // Authenticate user
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      )
    }
    
    if (user.role === 'client') {
      return NextResponse.json(
        { error: 'Unauthorized - employee access required' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Fetch all artists
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error fetching artists:', error)
      return NextResponse.json(
        { error: 'Failed to fetch artists' },
        { status: 500 }
      )
    }

    return NextResponse.json(artists || [])

  } catch (error) {
    console.error('Error in artists API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
