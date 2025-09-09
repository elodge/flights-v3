/**
 * @fileoverview Client-side notification helpers
 * 
 * @description Client-side functions for notification operations using API routes
 * @access Client-side only
 * @security Uses API routes for server-side operations
 * @database No direct database access, uses API endpoints
 * @business_rule Provides client-safe notification operations
 */

export type NotificationType = 'client_selection' | 'hold_expiring' | 'chat_message' | 'document_uploaded' | 'budget_updated';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationItem {
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
}

/**
 * Get unread notification count for current user
 * 
 * @description Fetches unread count via API route
 * @param artistId - Optional artist ID for filtering
 * @returns Promise with unread count
 * @security Uses authenticated API route
 * @database Queries via API endpoint
 * @business_rule Returns count filtered by artist if provided
 * @example
 * ```typescript
 * const count = await getUnreadCount('artist-123');
 * ```
 */
export async function getUnreadCount(artistId?: string): Promise<number> {
  try {
    const url = new URL('/api/notifications/unread-count', window.location.origin);
    if (artistId) {
      url.searchParams.set('artist', artistId);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('Failed to fetch unread count:', response.status);
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Get recent notifications for current user
 * 
 * @description Fetches recent notifications via API route
 * @param options - Filtering and pagination options
 * @returns Promise with notification array
 * @security Uses authenticated API route
 * @database Queries via API endpoint
 * @business_rule Returns notifications filtered by criteria
 * @example
 * ```typescript
 * const notifications = await getRecentNotifications({
 *   limit: 10,
 *   artistId: 'artist-123'
 * });
 * ```
 */
export async function getRecentNotifications(
  options: {
    limit?: number;
    artistId?: string;
    type?: NotificationType;
    severity?: NotificationSeverity;
  } = {}
): Promise<NotificationItem[]> {
  const url = new URL('/api/notifications/recent', window.location.origin);
  
  if (options.artistId) {
    url.searchParams.set('artist', options.artistId);
  }
  if (options.type) {
    url.searchParams.set('type', options.type);
  }
  if (options.severity) {
    url.searchParams.set('severity', options.severity);
  }
  if (options.limit) {
    url.searchParams.set('limit', options.limit.toString());
  }

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error('Failed to fetch recent notifications');
  }

  const data = await response.json();
  return data.notifications;
}

/**
 * Mark notifications as read for current user
 * 
 * @description Marks notifications as read via API route
 * @param eventIds - Array of notification event IDs to mark as read
 * @returns Promise that resolves when complete
 * @security Uses authenticated API route
 * @database Updates via API endpoint
 * @business_rule Users can only mark their own notifications as read
 * @example
 * ```typescript
 * await markNotificationsAsRead(['event-1', 'event-2']);
 * ```
 */
export async function markNotificationsAsRead(eventIds: string[]): Promise<void> {
  const response = await fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark notifications as read');
  }
}
