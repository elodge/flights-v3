/**
 * @fileoverview API route for global unread chat count
 * 
 * @description Provides real-time unread message count for employees across
 * all accessible legs, with optional artist filtering. Used by client components
 * to update unread badges in real-time.
 * 
 * @route /api/chat/global-unread
 * @access Employee only (agent, admin roles)
 * @security Requires authenticated employee session
 * @database Reads from legs, projects, chat_messages, and chat_reads tables
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { getGlobalUnreadCountForEmployee } from '@/lib/chat/unreadCounts'

/**
 * GET /api/chat/global-unread
 * 
 * @description Returns the total unread chat message count for the current employee
 * across all accessible legs, optionally filtered by artist.
 * 
 * @param request - Next.js request object with search params
 * @returns Promise<NextResponse> - JSON response with total count
 * 
 * @security Requires authenticated employee session
 * @database Uses RPC to efficiently calculate unread counts
 * @business_rule Counts messages newer than last_read_at per leg
 * 
 * @example
 * ```typescript
 * // GET /api/chat/global-unread?artist=artist-123
 * // Returns: { total: 15 }
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // CONTEXT: Authenticate the current user
    const user = await getServerUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // CONTEXT: Only employees can access unread counts
    if (user.role === 'client') {
      return NextResponse.json(
        { error: 'Forbidden - clients cannot access global unread counts' },
        { status: 403 }
      )
    }
    
    // CONTEXT: Extract artist filter from search params
    const { searchParams } = new URL(request.url)
    const artistId = searchParams.get('artist')
    
    // CONTEXT: Get unread count with optional artist filtering
    const total = await getGlobalUnreadCountForEmployee({
      userId: user.id,
      artistId: artistId || null
    })
    
    return NextResponse.json({ total })
    
  } catch (error) {
    console.error('Error in global unread count API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
