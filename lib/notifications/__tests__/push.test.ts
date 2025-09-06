/**
 * @fileoverview Unit tests for notification push helpers
 * 
 * @description Tests for notification creation, counting, and management functions
 * @coverage Tests pushNotification, getUnreadCount, markNotificationsAsRead, getRecentNotifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushNotification, getUnreadCount, markNotificationsAsRead, getRecentNotifications } from '../push';

// Mock the supabase server client with proper chaining
const createMockQuery = (finalResult = { data: [], error: null }) => {
  const mockQuery = {
    eq: vi.fn(() => mockQuery),
    not: vi.fn(() => mockQuery),
    in: vi.fn(() => mockQuery),
    limit: vi.fn(() => finalResult)
  }
  // Make the final call return the result
  mockQuery.eq.mockReturnValueOnce(finalResult);
  mockQuery.not.mockReturnValueOnce(finalResult);
  mockQuery.in.mockReturnValueOnce(finalResult);
  return mockQuery
}

// Create a mock that can handle nested queries
const createMockFrom = () => {
  const mockFrom = vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'test-notification-id' },
          error: null
        }))
      }))
    })),
    select: vi.fn(() => {
      // For the nested query in .not(), return a simple query
      if (mockFrom.mock.calls.length > 1) {
        return {
          eq: vi.fn(() => ({ data: [], error: null }))
        }
      }
      // For the main query, return the full chain
      return createMockQuery({ count: 5, error: null })
    }),
    upsert: vi.fn(() => ({
      data: null,
      error: null
    }))
  }))
  return mockFrom
}

const mockSupabaseClient = {
  from: createMockFrom()
};

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}));

describe('Notification Push Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pushNotification', () => {
    it('should create a notification with required fields', async () => {
      const params = {
        type: 'client_selection' as const,
        severity: 'info' as const,
        artistId: 'artist-123',
        title: 'Test notification',
        body: 'Test body'
      };

      const result = await pushNotification(params);
      
      expect(result).toBe('test-notification-id');
    });

    it('should create a notification with optional fields', async () => {
      const params = {
        type: 'chat_message' as const,
        severity: 'warning' as const,
        artistId: 'artist-456',
        projectId: 'project-789',
        legId: 'leg-101',
        title: 'Chat message',
        body: 'New message from client',
        actorUserId: 'user-202'
      };

      const result = await pushNotification(params);
      
      expect(result).toBe('test-notification-id');
    });

    it('should default severity to info when not provided', async () => {
      const params = {
        type: 'hold_expiring' as const,
        artistId: 'artist-123',
        title: 'Hold expiring'
      };

      const result = await pushNotification(params);
      
      expect(result).toBe('test-notification-id');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const count = await getUnreadCount('user-123');
      
      expect(count).toBe(5);
    });

    it('should return unread count filtered by artist', async () => {
      const count = await getUnreadCount('user-123', 'artist-456');
      
      expect(count).toBe(5);
    });

    it('should return 0 when no unread notifications', async () => {
      // Mock empty result by updating the mock client
      const mockFrom = mockSupabaseClient.from as any;
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: [],
                count: 0,
                error: null
              }))
            }))
          }))
        }))
      });

      const count = await getUnreadCount('user-123');
      
      expect(count).toBe(0);
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark notifications as read', async () => {
      const result = await markNotificationsAsRead('user-123', ['event-1', 'event-2']);
      
      expect(result).toBeUndefined(); // Function returns void
    });

    it('should handle empty event IDs array', async () => {
      const result = await markNotificationsAsRead('user-123', []);
      
      expect(result).toBeUndefined();
    });
  });

  describe('getRecentNotifications', () => {
    it('should return recent notifications with read status', async () => {
      // Mock notification data
      const mockFrom = mockSupabaseClient.from as any;
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                data: [
                  {
                    id: 'notif-1',
                    type: 'client_selection',
                    severity: 'info',
                    title: 'New selection',
                    body: 'Client made selection',
                    artist_id: 'artist-123',
                    project_id: 'project-456',
                    leg_id: 'leg-789',
                    actor_user_id: 'user-101',
                    created_at: '2024-01-01T00:00:00Z',
                    notification_reads: []
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const notifications = await getRecentNotifications('user-123', { limit: 10 });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        id: 'notif-1',
        type: 'client_selection',
        severity: 'info',
        title: 'New selection',
        body: 'Client made selection',
        artist_id: 'artist-123',
        project_id: 'project-456',
        leg_id: 'leg-789',
        actor_user_id: 'user-101',
        created_at: '2024-01-01T00:00:00Z',
        is_read: false
      });
    });

    it('should mark notifications as read when notification_reads exists', async () => {
      // Mock notification with read status
      const mockFrom = mockSupabaseClient.from as any;
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: 'notif-1',
                type: 'client_selection',
                severity: 'info',
                title: 'New selection',
                body: 'Client made selection',
                artist_id: 'artist-123',
                project_id: 'project-456',
                leg_id: 'leg-789',
                actor_user_id: 'user-101',
                created_at: '2024-01-01T00:00:00Z',
                notification_reads: [{ user_id: 'user-123' }]
              }
            ],
            error: null
          }))
        }))
      });

      const notifications = await getRecentNotifications('user-123');
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].is_read).toBe(true);
    });
  });
});
