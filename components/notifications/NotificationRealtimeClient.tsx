/**
 * @fileoverview Realtime Notification Client Component
 * 
 * @description Provides realtime updates for notification system
 * @access Employee users only
 * @security Uses Supabase Realtime with RLS policies
 * @database Subscribes to notification_events table changes
 * @business_rule Real-time updates respect artist filtering
 */

'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationRealtimeClientProps {
  userId: string;
  artistId?: string;
  onNotificationReceived?: (notification: any) => void;
  onUnreadCountUpdate?: (count: number) => void;
}

/**
 * Realtime notification subscription client
 * 
 * @description Subscribes to notification_events changes and provides callbacks
 * @param userId - Current user ID for filtering notifications
 * @param artistId - Optional artist ID for filtering
 * @param onNotificationReceived - Callback when new notification is received
 * @param onUnreadCountUpdate - Callback when unread count changes
 * @returns JSX.Element - Invisible component that manages realtime subscription
 * @security Uses RLS to ensure users only receive relevant notifications
 * @database Subscribes to notification_events table
 * @business_rule Respects artist filtering and user permissions
 * @example
 * ```tsx
 * <NotificationRealtimeClient
 *   userId="user-123"
 *   artistId="artist-456"
 *   onNotificationReceived={(notification) => console.log('New notification:', notification)}
 *   onUnreadCountUpdate={(count) => setUnreadCount(count)}
 * />
 * ```
 */
export function NotificationRealtimeClient({
  userId,
  artistId,
  onNotificationReceived,
  onUnreadCountUpdate
}: NotificationRealtimeClientProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // CONTEXT: Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') return;

    // CONTEXT: Create realtime subscription for notification events
    // SECURITY: RLS policies ensure users only see notifications they have access to
    const channel = supabase
      .channel('notification_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_events'
        },
        (payload) => {
          const notification = payload.new;
          
          // CONTEXT: Filter by artist if specified
          // BUSINESS_RULE: Only show notifications for the current artist filter
          if (artistId && notification.artist_id !== artistId) {
            return;
          }

          // CONTEXT: Call notification received callback
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }

          // CONTEXT: Increment unread count
          // ALGORITHM: Increment count by 1 for new notifications
          if (onUnreadCountUpdate) {
            onUnreadCountUpdate((prevCount: number) => prevCount + 1);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // CONTEXT: Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, artistId, onNotificationReceived, onUnreadCountUpdate]);

  // CONTEXT: Update subscription when artist filter changes
  useEffect(() => {
    // CONTEXT: Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') return;
    
    if (channelRef.current) {
      // Re-subscribe with new artist filter
      supabase.removeChannel(channelRef.current);
      
      const channel = supabase
        .channel('notification_events')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notification_events'
          },
          (payload) => {
            const notification = payload.new;
            
            if (artistId && notification.artist_id !== artistId) {
              return;
            }

            if (onNotificationReceived) {
              onNotificationReceived(notification);
            }

            if (onUnreadCountUpdate) {
              onUnreadCountUpdate((prevCount: number) => prevCount + 1);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    }
  }, [artistId, onNotificationReceived, onUnreadCountUpdate]);

  // CONTEXT: This component doesn't render anything visible
  return null;
}
