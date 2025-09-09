/**
 * @fileoverview Notification Bell Component for Employee Header
 * 
 * @description Displays notification count and dropdown for employees
 * @access Employee only (agent/admin)
 * @security Uses notification system with artist filtering
 * @database Reads from notification_events and notification_reads
 * @business_rule Shows unread count filtered by current artist selection
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getUnreadCount, getRecentNotifications, markNotificationsAsRead, type NotificationType } from '@/lib/notifications/client';
import { NotificationRealtimeClient } from '@/components/notifications/NotificationRealtimeClient';

interface NotificationBellProps {
  userId: string;
  artistId?: string;
}

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

/**
 * Notification bell with count badge and dropdown
 * 
 * @description Shows unread notification count and recent notifications in dropdown
 * @param userId - Current user ID
 * @param artistId - Optional artist ID for filtering
 * @returns JSX.Element - Notification bell component
 * @security Uses user-specific notification access
 * @database Queries notification_events and notification_reads
 * @business_rule Count updates in real-time, respects artist filtering
 * @example
 * ```tsx
 * <NotificationBell userId="user-123" artistId="artist-456" />
 * ```
 */
export function NotificationBell({ userId, artistId }: NotificationBellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // CONTEXT: Get current artist from URL params or props
  const currentArtistId = artistId || searchParams.get('artist');

  // CONTEXT: Fetch unread count and recent notifications
  const fetchNotifications = async () => {
    // CONTEXT: Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') return;
    
    try {
      setIsLoading(true);
      
      // Fetch unread count
      const count = await getUnreadCount(currentArtistId || undefined);
      setUnreadCount(count);
      
      // Fetch recent notifications
      const notifications = await getRecentNotifications({
        limit: 10,
        artistId: currentArtistId || undefined,
      });
      setRecentNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // CONTEXT: Load notifications on mount and when artist changes
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentArtistId]);

  // CONTEXT: Mark all visible notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadEventIds = recentNotifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadEventIds.length === 0) return;

    try {
      await markNotificationsAsRead(unreadEventIds);
      await fetchNotifications(); // Refresh the data
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // CONTEXT: Handle notification click and mark as read
  const handleNotificationClick = async (notification: NotificationItem) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await markNotificationsAsRead([notification.id]);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to relevant page
    if (notification.leg_id && notification.project_id) {
      router.push(`/a/tour/${notification.project_id}/leg/${notification.leg_id}`);
    } else if (notification.project_id) {
      router.push(`/a/tour/${notification.project_id}`);
    } else {
      router.push('/a/notifications');
    }

    setIsOpen(false);
  };

  // CONTEXT: Get severity color for badge
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

  return (
    <>
      {/* CONTEXT: Realtime notification updates */}
      <NotificationRealtimeClient
        userId={userId}
        artistId={currentArtistId || undefined}
        onNotificationReceived={(notification) => {
          // CONTEXT: Add new notification to the top of the list
          setRecentNotifications(prev => [notification, ...prev.slice(0, 9)]);
        }}
        onUnreadCountUpdate={(newCount) => {
          setUnreadCount(newCount);
        }}
      />
      
      <TooltipProvider>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications {currentArtistId ? '(filtered)' : ''}</p>
            </TooltipContent>
          </Tooltip>

        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between p-2">
            <h3 className="font-semibold">Notifications</h3>
            {recentNotifications.some(n => !n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-6 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          
          <DropdownMenuSeparator />
          
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="flex flex-col items-start p-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={getSeverityColor(notification.severity)}
                        className="text-xs"
                      >
                        {notification.type.replace('_', ' ')}
                      </Badge>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>
                  
                  <div className="font-medium text-sm mb-1">
                    {notification.title}
                  </div>
                  
                  {notification.body && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </div>
                  )}
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => {
              router.push('/a/notifications');
              setIsOpen(false);
            }}
            className="text-center"
          >
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
    </>
  );
}
