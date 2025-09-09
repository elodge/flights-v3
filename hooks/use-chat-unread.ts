/**
 * @fileoverview Hook for tracking unread chat message counts
 * 
 * @description Client-side hook that provides real-time unread message counts
 * for leg chats. Updates automatically when new messages arrive or when
 * chat is marked as read.
 * 
 * @access Both client and employee portals
 * @security Uses RLS-protected queries for message access
 * @database Queries chat_messages and chat_reads for unread calculation
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/use-auth'

/**
 * Hook for tracking unread chat message counts
 * 
 * @description Calculates and tracks unread message count for a specific leg.
 * Automatically updates when new messages arrive or when read status changes.
 * 
 * @param legId - UUID of the leg to track unread count for
 * @returns Object containing unread count and loading state
 * 
 * @security RLS ensures users only see counts for accessible legs
 * @database Compares chat_messages.created_at with chat_reads.last_read_at
 * @business_rule Count is messages created after user's last read timestamp
 * 
 * @example
 * ```tsx
 * const { unreadCount, isLoading } = useChatUnread('leg-uuid')
 * if (unreadCount > 0) {
 *   return <Badge>{unreadCount}</Badge>
 * }
 * ```
 */
export function useChatUnread(legId: string) {
  const { user } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || !legId) {
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    /**
     * Calculates current unread message count
     * 
     * @description Queries messages newer than user's last read timestamp.
     * Handles case where user has never read any messages.
     * 
     * @security RLS protection on both chat_messages and chat_reads
     */
    const calculateUnreadCount = async () => {
      try {
        setIsLoading(true)

        // CONTEXT: Get user's last read timestamp for this leg
        const { data: readData } = await (supabase as any)
          .from('chat_reads')
          .select('last_read_at')
          .eq('user_id', user.id)
          .eq('leg_id', legId)
          .single()

        const lastReadAt = readData?.last_read_at

        // CONTEXT: Count messages created after last read timestamp
        // BUSINESS_RULE: If no read record exists, all messages are unread
        let query = supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('leg_id', legId)

        if (lastReadAt) {
          query = query.gt('created_at', lastReadAt)
        }

        const { count, error } = await query

        if (error) {
          console.error('Error calculating unread count:', error)
          setUnreadCount(0)
          return
        }

        setUnreadCount(count || 0)

      } catch (error) {
        console.error('Error in calculateUnreadCount:', error)
        setUnreadCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial calculation
    calculateUnreadCount()

    // CONTEXT: Subscribe to new messages to update count in real-time
    const channel = supabase
      .channel(`unread_leg_${legId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `leg_id=eq.${legId}`
        },
        (payload) => {
          // CONTEXT: Don't count our own messages as unread
          if (payload.new.user_id !== user.id) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // CONTEXT: Recalculate when read status updates
          calculateUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // CONTEXT: Recalculate when read record is created
          calculateUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  }, [legId, user])

  return { unreadCount, isLoading }
}

/**
 * Marks a leg chat as read
 * 
 * @description Utility function to mark a chat as read and update unread counts.
 * Can be called independently from the chat component.
 * 
 * @param legId - UUID of the leg to mark as read
 * @returns Promise that resolves when read status is updated
 * 
 * @security Uses authenticated user from Supabase client
 * @database Upserts chat_reads record with current timestamp
 * 
 * @example
 * ```tsx
 * await markChatAsRead('leg-uuid')
 * ```
 */
export async function markChatAsRead(legId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  try {
    const { error } = await (supabase as any)
      .from('chat_reads')
      .upsert({
        user_id: user.id,
        leg_id: legId,
        last_read_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error marking chat as read:', error)
    }
  } catch (error) {
    console.error('Error in markChatAsRead:', error)
  }
}
