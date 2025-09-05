/**
 * @fileoverview Notifications List Component
 * 
 * @description Displays and manages notification list with filtering and actions
 * @access Employee only (agent/admin)
 * @security Uses notification system with RLS policies
 * @database Reads from notification_events and notification_reads
 * @business_rule Notifications grouped by type and filtered by artist access
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Check, 
  Clock, 
  AlertTriangle, 
  Info, 
  MessageSquare, 
  CreditCard, 
  FileText, 
  User,
  ExternalLink
} from 'lucide-react';
import { getRecentNotifications, markNotificationsAsRead, type NotificationType } from '@/lib/notifications/client';

interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string | null;
  artist_id: string;
  project_id: string | null;
  leg_id: string | null;
  created_at: string;
  is_read: boolean;
}

interface NotificationsListProps {
  userId: string;
  artistId?: string;
  type?: NotificationType;
  severity?: 'info' | 'warning' | 'critical';
  limit?: number;
}

/**
 * Notifications list with filtering and actions
 * 
 * @description Displays notifications with grouping, filtering, and read/unread actions
 * @param userId - Current user ID
 * @param artistId - Optional artist ID for filtering
 * @param type - Optional notification type filter
 * @param severity - Optional severity filter
 * @param limit - Maximum number of notifications to show
 * @returns JSX.Element - Notifications list component
 * @security Uses user-specific notification access
 * @database Queries notification_events with filtering
 * @business_rule Notifications grouped by type, newest first
 * @example
 * ```tsx
 * <NotificationsList userId="user-123" artistId="artist-456" />
 * ```
 */
export function NotificationsList({ 
  userId, 
  artistId, 
  type, 
  severity, 
  limit = 50 
}: NotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CONTEXT: Fetch notifications with current filters
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getRecentNotifications({
        limit,
        artistId,
        type,
        severity,
      });
      
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // CONTEXT: Load notifications on mount and when filters change
  useEffect(() => {
    fetchNotifications();
  }, [userId, artistId, type, severity, limit]);

  // CONTEXT: Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationsAsRead([notificationId]);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // CONTEXT: Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadIds.length === 0) return;

    try {
      await markNotificationsAsRead(unreadIds);
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // CONTEXT: Handle notification click
  const handleNotificationClick = async (notification: NotificationItem) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to relevant page
    if (notification.leg_id && notification.project_id) {
      router.push(`/a/tour/${notification.project_id}/leg/${notification.leg_id}`);
    } else if (notification.project_id) {
      router.push(`/a/tour/${notification.project_id}`);
    }
  };

  // CONTEXT: Get icon for notification type
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'client_selection': return <User className="h-4 w-4" />;
      case 'chat_message': return <MessageSquare className="h-4 w-4" />;
      case 'hold_expiring': return <Clock className="h-4 w-4" />;
      case 'document_uploaded': return <FileText className="h-4 w-4" />;
      case 'budget_updated': return <CreditCard className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // CONTEXT: Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  // CONTEXT: Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // CONTEXT: Group notifications by type
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const type = notification.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(notification);
    return groups;
  }, {} as Record<NotificationType, NotificationItem[]>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchNotifications}
            className="mt-2"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No notifications found</p>
          <p className="text-sm text-muted-foreground">
            {artistId ? 'Try adjusting your filters' : 'You\'re all caught up!'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </h3>
          {notifications.some(n => !n.is_read) && (
            <Badge variant="secondary">
              {notifications.filter(n => !n.is_read).length} unread
            </Badge>
          )}
        </div>
        
        {notifications.some(n => !n.is_read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Grouped Notifications */}
      {Object.entries(groupedNotifications).map(([type, typeNotifications]) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-2">
            {getTypeIcon(type as NotificationType)}
            <h4 className="font-medium capitalize">
              {type.replace('_', ' ')} ({typeNotifications.length})
            </h4>
          </div>
          
          <div className="space-y-2">
            {typeNotifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center gap-2 mt-1">
                        {getTypeIcon(notification.type)}
                        <Badge 
                          variant={getSeverityColor(notification.severity)}
                          className="text-xs"
                        >
                          {notification.severity}
                        </Badge>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm mb-1">
                          {notification.title}
                        </h5>
                        
                        {notification.body && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatRelativeTime(notification.created_at)}</span>
                          {notification.project_id && (
                            <>
                              <span>•</span>
                              <span>Project {notification.project_id.slice(0, 8)}</span>
                            </>
                          )}
                          {notification.leg_id && (
                            <>
                              <span>•</span>
                              <span>Leg {notification.leg_id.slice(0, 8)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="h-6 px-2"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {Object.keys(groupedNotifications).indexOf(type) < Object.keys(groupedNotifications).length - 1 && (
            <Separator className="my-4" />
          )}
        </div>
      ))}
    </div>
  );
}
