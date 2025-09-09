/**
 * @fileoverview Notification system server helpers
 * 
 * @description Server-side functions for creating and managing notifications
 * @access Employee only (agent/admin) for creating notifications
 * @security Uses RLS policies to control notification access
 * @database notification_events and notification_reads tables
 * @business_rule Notifications are created by system events and employee actions
 */

import { createServerClient } from '@/lib/supabase-server';

export type NotificationType = 'client_selection' | 'hold_expiring' | 'chat_message' | 'document_uploaded' | 'budget_updated';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface PushNotificationParams {
  type: NotificationType;
  severity?: NotificationSeverity;
  artistId: string;
  projectId?: string;
  legId?: string;
  title: string;
  body?: string;
  actorUserId?: string;
}

/**
 * Push a new notification event to the system
 * 
 * @description Creates a notification event that will be visible to relevant users
 * @param params - Notification parameters including type, severity, and content
 * @returns Promise with the created notification event ID
 * @security Only employees (agent/admin) can create notifications
 * @database Inserts into notification_events table
 * @business_rule Notifications are filtered by artist access for clients
 * @example
 * ```typescript
 * await pushNotification({
 *   type: 'client_selection',
 *   severity: 'info',
 *   artistId: 'artist-123',
 *   projectId: 'project-456',
 *   title: 'New selection from client',
 *   body: 'Tour X • Leg AMS→PHL'
 * });
 * ```
 */
export async function pushNotification(params: PushNotificationParams): Promise<string> {
  const supabase = await createServerClient();
  
  const { data, error } = await (supabase as any)
    .from('notification_events')
    .insert([{
      type: params.type,
      severity: params.severity || 'info',
      artist_id: params.artistId,
      project_id: params.projectId || null,
      leg_id: params.legId || null,
      actor_user_id: params.actorUserId || null,
      title: params.title,
      body: params.body || null,
    }])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data.id;
}

/**
 * Get unread notification count for a user
 * 
 * @description Counts notifications that the user hasn't read yet, optionally filtered by artist
 * @param userId - User ID to count unread notifications for
 * @param artistId - Optional artist ID to filter notifications
 * @returns Promise with the unread count
 * @security Uses RLS to ensure users only see notifications they have access to
 * @database Queries notification_events and notification_reads tables
 * @business_rule Clients only see notifications for their assigned artists
 * @example
 * ```typescript
 * const count = await getUnreadCount('user-123', 'artist-456');
 * ```
 */
export async function getUnreadCount(userId: string, artistId?: string): Promise<number> {
  const supabase = await createServerClient();
  
  // Build the query to count unread notifications
  let query = (supabase as any)
    .from('notification_events')
    .select('id', { count: 'exact', head: true })
    .not('id', 'in', 
      (supabase as any)
        .from('notification_reads')
        .select('event_id')
        .eq('user_id', userId)
    );

  // Filter by artist if provided
  if (artistId) {
    query = query.eq('artist_id', artistId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting unread count:', error);
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Mark notifications as read for a user
 * 
 * @description Records that a user has read specific notification events
 * @param userId - User ID marking notifications as read
 * @param eventIds - Array of notification event IDs to mark as read
 * @returns Promise that resolves when complete
 * @security Users can only mark their own notifications as read
 * @database Inserts into notification_reads table
 * @business_rule Read status is per-user and persistent
 * @example
 * ```typescript
 * await markNotificationsAsRead('user-123', ['event-1', 'event-2']);
 * ```
 */
export async function markNotificationsAsRead(userId: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;

  const supabase = await createServerClient();
  
  const { error } = await (supabase as any)
    .from('notification_reads')
    .upsert(
      eventIds.map(eventId => ({
        user_id: userId,
        event_id: eventId,
      })),
      { onConflict: 'user_id,event_id' }
    );

  if (error) {
    console.error('Error marking notifications as read:', error);
    throw new Error(`Failed to mark notifications as read: ${error.message}`);
  }
}

/**
 * Get recent notifications for a user
 * 
 * @description Retrieves recent notifications with optional filtering
 * @param userId - User ID to get notifications for
 * @param options - Optional filtering and pagination options
 * @returns Promise with notification events
 * @security Uses RLS to ensure proper access control
 * @database Queries notification_events with joins
 * @business_rule Notifications are ordered by creation date, newest first
 * @example
 * ```typescript
 * const notifications = await getRecentNotifications('user-123', {
 *   limit: 10,
 *   artistId: 'artist-456'
 * });
 * ```
 */
export async function getRecentNotifications(
  userId: string, 
  options: {
    limit?: number;
    artistId?: string;
    type?: NotificationType;
    severity?: NotificationSeverity;
  } = {}
): Promise<Array<{
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  artist_id: string;
  project_id: string | null;
  leg_id: string | null;
  actor_user_id: string | null;
  created_at: string;
  is_read: boolean;
}>> {
  const supabase = await createServerClient();
  
  let query = (supabase as any)
    .from('notification_events')
    .select(`
      id,
      type,
      severity,
      title,
      body,
      artist_id,
      project_id,
      leg_id,
      actor_user_id,
      created_at,
      notification_reads!left(user_id)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (options.artistId) {
    query = query.eq('artist_id', options.artistId);
  }
  
  if (options.type) {
    query = query.eq('type', options.type);
  }
  
  if (options.severity) {
    query = query.eq('severity', options.severity);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting recent notifications:', error);
    throw new Error(`Failed to get recent notifications: ${error.message}`);
  }

  // Transform the data to include read status
  return (data || []).map((notification: any) => ({
    id: notification.id,
    type: notification.type as NotificationType,
    severity: notification.severity as NotificationSeverity,
    title: notification.title,
    body: notification.body,
    artist_id: notification.artist_id,
    project_id: notification.project_id,
    leg_id: notification.leg_id,
    actor_user_id: notification.actor_user_id,
    created_at: notification.created_at,
    is_read: notification.notification_reads && notification.notification_reads.length > 0,
  }));
}
