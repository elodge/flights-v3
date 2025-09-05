/**
 * @fileoverview Client Notification Banner Component
 * 
 * @description Dismissible banners for client notifications (hold expiring, budget updates)
 * @access Client users only
 * @security Uses session storage for dismissal state
 * @database Reads from notification_events for client-specific notifications
 * @business_rule Banners are per-session and don't persist server-side in MVP
 */

'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CreditCard, X, AlertTriangle } from 'lucide-react';
import { getRecentNotifications } from '@/lib/notifications/client';

interface NotificationBannerProps {
  userId: string;
  legId: string;
  projectId: string;
}

interface ClientNotification {
  id: string;
  type: 'hold_expiring' | 'budget_updated';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string | null;
  created_at: string;
}

/**
 * Client notification banners for important alerts
 * 
 * @description Shows dismissible banners for hold expiring and budget updates
 * @param userId - Current user ID
 * @param legId - Current leg ID for filtering notifications
 * @param projectId - Current project ID for filtering notifications
 * @returns JSX.Element - Notification banners component
 * @security Uses session storage for dismissal state
 * @database Queries notification_events for client notifications
 * @business_rule Banners are session-only and don't persist across sessions
 * @example
 * ```tsx
 * <NotificationBanner userId="user-123" legId="leg-456" projectId="project-789" />
 * ```
 */
export function NotificationBanner({ userId, legId, projectId }: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // CONTEXT: Load dismissed notification IDs from session storage
  useEffect(() => {
    const dismissed = sessionStorage.getItem('dismissed-notifications');
    if (dismissed) {
      try {
        setDismissedIds(new Set(JSON.parse(dismissed)));
      } catch (error) {
        console.error('Error parsing dismissed notifications:', error);
      }
    }
  }, []);

  // CONTEXT: Fetch relevant notifications for this leg
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        
        // Get recent notifications for this project/leg
        const recentNotifications = await getRecentNotifications({
          limit: 10,
          // Note: We'll filter by project/leg on the client side since the API doesn't support it yet
        });

        // Filter for client-relevant notifications for this leg
        const clientNotifications = recentNotifications
          .filter(n => 
            (n.type === 'hold_expiring' || n.type === 'budget_updated') &&
            (n.project_id === projectId || n.leg_id === legId)
          )
          .map(n => ({
            id: n.id,
            type: n.type as 'hold_expiring' | 'budget_updated',
            severity: n.severity as 'info' | 'warning' | 'critical',
            title: n.title,
            body: n.body,
            created_at: n.created_at
          }));

        setNotifications(clientNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [userId, legId, projectId]);

  // CONTEXT: Dismiss a notification
  const handleDismiss = (notificationId: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(notificationId);
    setDismissedIds(newDismissed);
    
    // Store in session storage
    sessionStorage.setItem('dismissed-notifications', JSON.stringify([...newDismissed]));
  };

  // CONTEXT: Get icon for notification type
  const getNotificationIcon = (type: string, severity: string) => {
    if (type === 'hold_expiring') {
      return severity === 'critical' ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
    }
    if (type === 'budget_updated') {
      return <CreditCard className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  // CONTEXT: Get alert variant based on severity
  const getAlertVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      default: return 'default';
    }
  };

  // CONTEXT: Format time remaining for hold expiring
  const formatTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  if (isLoading) {
    return null;
  }

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleNotifications.map((notification) => (
        <Alert key={notification.id} variant={getAlertVariant(notification.severity)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type, notification.severity)}
              <div className="flex-1">
                <AlertDescription className="font-medium">
                  {notification.title}
                </AlertDescription>
                {notification.body && (
                  <AlertDescription className="mt-1 text-sm">
                    {notification.body}
                  </AlertDescription>
                )}
                {notification.type === 'hold_expiring' && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Expires in: {formatTimeRemaining(notification.created_at)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(notification.id)}
              className="h-6 w-6 p-0 hover:bg-background/50"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Dismiss notification</span>
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
