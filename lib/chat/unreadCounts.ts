/**
 * @fileoverview Server-side chat unread count utilities for employee portal
 * 
 * @description Provides server functions to calculate unread chat message counts
 * across all legs accessible to employees, with optional artist filtering.
 * Supports real-time updates and efficient single-query calculations.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses admin client to bypass RLS for comprehensive counts
 * @database Reads from legs, projects, chat_messages, and chat_reads tables
 */

import { createAdminClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

/**
 * Gets the currently selected artist ID for an employee
 * 
 * @description Determines the artist filter based on URL search params and cookies.
 * Uses the same precedence as other employee filtering: URL param → cookie → null.
 * 
 * @param searchParams - URL search parameters object
 * @param cookies - Next.js cookies object
 * @returns string | null - Artist ID or null for "All Artists"
 * 
 * @security Safe to call - only reads URL params and cookies
 * @business_rule Same precedence as other employee artist filtering
 * 
 * @example
 * ```typescript
 * const artistId = getEmployeeSelectedArtistId(searchParams, cookies())
 * // Returns 'artist-123' or null for all artists
 * ```
 */
export function getEmployeeSelectedArtistId(
  searchParams: URLSearchParams,
  cookies: any
): string | null {
  // CONTEXT: Check URL parameter first (highest precedence)
  const urlArtistId = searchParams.get('artist')
  if (urlArtistId) {
    return urlArtistId
  }
  
  // CONTEXT: Fall back to cookie (persistent selection)
  const cookieArtistId = cookies.get('employee_artist_id')?.value
  if (cookieArtistId) {
    return cookieArtistId
  }
  
  // CONTEXT: No selection means "All Artists"
  return null
}

/**
 * Calculates total unread chat messages for an employee across accessible legs
 * 
 * @description Performs a single optimized query to count unread messages across
 * all legs the employee can access, optionally filtered by artist. Uses efficient
 * SQL with coalesce and subqueries to handle missing chat_reads records.
 * 
 * @param params - Configuration object
 * @param params.userId - Employee user ID
 * @param params.artistId - Optional artist ID filter (null for all artists)
 * @returns Promise<number> - Total unread message count
 * 
 * @throws {Error} Database connection or query errors
 * @security Uses admin client to bypass RLS - employees should see all counts
 * @database Complex query across legs, projects, chat_messages, and chat_reads
 * @business_rule Counts messages newer than last_read_at, defaults to 'epoch' if no read record
 * 
 * @example
 * ```typescript
 * const total = await getGlobalUnreadCountForEmployee({
 *   userId: 'user-123',
 *   artistId: 'artist-456' // or null for all artists
 * })
 * // Returns 15 (total unread messages)
 * ```
 */
export async function getGlobalUnreadCountForEmployee({
  userId,
  artistId
}: {
  userId: string
  artistId: string | null
}): Promise<number> {
  try {
    const supabase = createAdminClient()
    
    // CONTEXT: Single optimized query to count unread messages per leg
    // BUSINESS_RULE: Count messages newer than last_read_at, default to 'epoch' if no read record
    // DATABASE: Uses coalesce to handle missing chat_reads records efficiently
    const { data, error } = await supabase.rpc('get_employee_unread_count', {
      p_user_id: userId,
      p_artist_id: artistId
    })
    
    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
    
    // CONTEXT: RPC returns single row with total_unread column
    return data?.[0]?.total_unread || 0
    
  } catch (error) {
    console.error('Error in getGlobalUnreadCountForEmployee:', error)
    return 0
  }
}

/**
 * Alternative implementation using direct SQL query (fallback)
 * 
 * @description Direct Supabase query implementation if RPC is not available.
 * Performs the same logic as the RPC but with explicit SQL construction.
 * 
 * @param params - Configuration object
 * @param params.userId - Employee user ID  
 * @param params.artistId - Optional artist ID filter
 * @returns Promise<number> - Total unread message count
 * 
 * @security Uses admin client to bypass RLS
 * @database Complex query with joins and subqueries
 * @business_rule Same counting logic as RPC version
 */
export async function getGlobalUnreadCountForEmployeeDirect({
  userId,
  artistId
}: {
  userId: string
  artistId: string | null
}): Promise<number> {
  try {
    const supabase = createAdminClient()
    
    // CONTEXT: Build query with optional artist filter
    let query = supabase
      .from('legs')
      .select(`
        id,
        projects!inner(
          artist_id
        )
      `)
    
    // CONTEXT: Apply artist filter if specified
    if (artistId) {
      query = query.eq('projects.artist_id', artistId)
    }
    
    const { data: legs, error: legsError } = await query
    
    if (legsError) {
      console.error('Error fetching legs:', legsError)
      return 0
    }
    
    if (!legs || legs.length === 0) {
      return 0
    }
    
    const legIds = legs.map(leg => leg.id)
    
    // CONTEXT: Get last read timestamps for all legs
    const { data: readRecords, error: readError } = await supabase
      .from('chat_reads')
      .select('leg_id, last_read_at')
      .eq('user_id', userId)
      .in('leg_id', legIds)
    
    if (readError) {
      console.error('Error fetching read records:', readError)
      return 0
    }
    
    // CONTEXT: Create map of leg_id to last_read_at
    const lastReadMap = new Map<string, string>()
    readRecords?.forEach(record => {
      lastReadMap.set(record.leg_id, record.last_read_at)
    })
    
    // CONTEXT: Count unread messages for each leg
    let totalUnread = 0
    
    for (const legId of legIds) {
      const lastReadAt = lastReadMap.get(legId) || '1970-01-01T00:00:00Z'
      
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('leg_id', legId)
        .gt('created_at', lastReadAt)
      
      if (countError) {
        console.error(`Error counting messages for leg ${legId}:`, countError)
        continue
      }
      
      totalUnread += count || 0
    }
    
    return totalUnread
    
  } catch (error) {
    console.error('Error in getGlobalUnreadCountForEmployeeDirect:', error)
    return 0
  }
}
