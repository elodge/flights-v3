/**
 * @fileoverview Real-time global unread chat count client component
 * 
 * @description Provides real-time updates for the global unread chat message count
 * in the employee header. Subscribes to chat_messages and chat_reads changes and
 * debounces API calls to refresh the count.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses authenticated Supabase client for real-time subscriptions
 * @database Subscribes to chat_messages and chat_reads table changes
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface GlobalUnreadClientProps {
  /** Initial unread count from server */
  initialCount: number
  /** Currently selected artist ID (null for all artists) */
  artistId: string | null
  /** Current user ID */
  userId: string
  /** Callback to update the parent component's count */
  onCountUpdate: (count: number) => void
}

/**
 * Global unread chat count client component
 * 
 * @description Manages real-time subscriptions for chat message and read status changes.
 * Debounces API calls to prevent excessive requests and updates the parent component
 * with fresh unread counts.
 * 
 * @param props - Component props
 * @returns JSX.Element - Empty component (updates parent via callback)
 * 
 * @security Uses authenticated Supabase client
 * @database Subscribes to chat_messages and chat_reads changes
 * @business_rule Debounces API calls to prevent excessive requests
 * 
 * @example
 * ```tsx
 * <GlobalUnreadClient
 *   initialCount={5}
 *   artistId="artist-123"
 *   userId="user-456"
 *   onCountUpdate={setUnreadCount}
 * />
 * ```
 */
export function GlobalUnreadClient({
  initialCount,
  artistId,
  userId,
  onCountUpdate
}: GlobalUnreadClientProps) {
  const [currentCount, setCurrentCount] = useState(initialCount)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)

  /**
   * Fetches fresh unread count from the API
   * 
   * @description Makes a debounced API call to get the latest unread count
   * and updates both local state and parent component.
   * 
   * @security Uses authenticated API endpoint
   * @business_rule Debounces calls to prevent excessive API requests
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const url = new URL('/api/chat/global-unread', window.location.origin)
      if (artistId) {
        url.searchParams.set('artist', artistId)
      }
      
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        const newCount = data.total || 0
        
        setCurrentCount(newCount)
        onCountUpdate(newCount)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [artistId, onCountUpdate])

  /**
   * Debounced version of fetchUnreadCount
   * 
   * @description Prevents excessive API calls by debouncing requests
   * with a 500ms delay.
   */
  const debouncedFetchUnreadCount = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchUnreadCount()
    }, 500)
  }, [fetchUnreadCount])

  // CONTEXT: Set up real-time subscriptions for chat changes
  useEffect(() => {
    if (!userId) return

    // CONTEXT: Subscribe to new chat messages
    const messagesChannel = supabase
      .channel(`global_unread_messages_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          // CONTEXT: New message added - refresh count
          debouncedFetchUnreadCount()
        }
      )
      .subscribe()

    // CONTEXT: Subscribe to chat read status changes
    const readsChannel = supabase
      .channel(`global_unread_reads_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'chat_reads',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // CONTEXT: Read status changed - refresh count
          debouncedFetchUnreadCount()
        }
      )
      .subscribe()

    channelRef.current = { messagesChannel, readsChannel }

    return () => {
      // CONTEXT: Clean up subscriptions
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.messagesChannel)
        supabase.removeChannel(channelRef.current.readsChannel)
      }
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [userId, debouncedFetchUnreadCount])

  // CONTEXT: Update count when artist selection changes
  useEffect(() => {
    fetchUnreadCount()
  }, [artistId, fetchUnreadCount])

  // CONTEXT: Update parent when local count changes
  useEffect(() => {
    onCountUpdate(currentCount)
  }, [currentCount, onCountUpdate])

  // CONTEXT: This component doesn't render anything - it just manages subscriptions
  return null
}
