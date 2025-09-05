/**
 * @fileoverview Integration tests for NotificationBell component
 * 
 * @description Tests notification bell functionality including count display and dropdown
 * @coverage Tests notification fetching, count display, dropdown interactions, and navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from '../notification-bell';

// Mock the notification helpers
vi.mock('@/lib/notifications/push', () => ({
  getUnreadCount: vi.fn(),
  getRecentNotifications: vi.fn(),
  markNotificationsAsRead: vi.fn()
}));

// Mock Next.js router
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null)
  })
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  Check: () => <div data-testid="check-icon">Check</div>
}));

describe('NotificationBell', () => {
  const mockGetUnreadCount = vi.mocked(await import('@/lib/notifications/push')).getUnreadCount;
  const mockGetRecentNotifications = vi.mocked(await import('@/lib/notifications/push')).getRecentNotifications;
  const mockMarkNotificationsAsRead = vi.mocked(await import('@/lib/notifications/push')).markNotificationsAsRead;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUnreadCount.mockResolvedValue(3);
    mockGetRecentNotifications.mockResolvedValue([
      {
        id: 'notif-1',
        type: 'client_selection',
        severity: 'info',
        title: 'New selection from client',
        body: 'Client made a flight selection',
        artist_id: 'artist-123',
        project_id: 'project-456',
        leg_id: 'leg-789',
        actor_user_id: 'user-101',
        created_at: '2024-01-01T00:00:00Z',
        is_read: false
      },
      {
        id: 'notif-2',
        type: 'chat_message',
        severity: 'info',
        title: 'New client message',
        body: 'Client sent a message',
        artist_id: 'artist-123',
        project_id: 'project-456',
        leg_id: 'leg-789',
        actor_user_id: 'user-101',
        created_at: '2024-01-01T01:00:00Z',
        is_read: true
      }
    ]);
  });

  it('should render notification bell with unread count', async () => {
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('should show no badge when unread count is 0', async () => {
    mockGetUnreadCount.mockResolvedValue(0);
    
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  it('should show 99+ for counts over 99', async () => {
    mockGetUnreadCount.mockResolvedValue(150);
    
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('should open dropdown when clicked', async () => {
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('New selection from client')).toBeInTheDocument();
      expect(screen.getByText('New client message')).toBeInTheDocument();
    });
  });

  it('should show mark all as read button when there are unread notifications', async () => {
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });
  });

  it('should not show mark all as read button when all notifications are read', async () => {
    mockGetRecentNotifications.mockResolvedValue([
      {
        id: 'notif-1',
        type: 'client_selection',
        severity: 'info',
        title: 'New selection from client',
        body: 'Client made a flight selection',
        artist_id: 'artist-123',
        project_id: 'project-456',
        leg_id: 'leg-789',
        actor_user_id: 'user-101',
        created_at: '2024-01-01T00:00:00Z',
        is_read: true
      }
    ]);

    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });
  });

  it('should mark all notifications as read when button is clicked', async () => {
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    const markAllButton = screen.getByText('Mark all read');
    fireEvent.click(markAllButton);

    await waitFor(() => {
      expect(mockMarkNotificationsAsRead).toHaveBeenCalledWith('user-123', ['notif-1']);
    });
  });

  it('should navigate to leg page when notification is clicked', async () => {
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('New selection from client')).toBeInTheDocument();
    });

    const notificationItem = screen.getByText('New selection from client');
    fireEvent.click(notificationItem);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/a/tour/project-456/leg/leg-789');
    });
  });

  it('should navigate to notifications page when view all is clicked', async () => {
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('View all notifications')).toBeInTheDocument();
    });

    const viewAllButton = screen.getByText('View all notifications');
    fireEvent.click(viewAllButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/a/notifications');
    });
  });

  it('should filter notifications by artist when artistId is provided', async () => {
    render(<NotificationBell userId="user-123" artistId="artist-456" />);

    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalledWith('user-123', 'artist-456');
      expect(mockGetRecentNotifications).toHaveBeenCalledWith('user-123', {
        limit: 10,
        artistId: 'artist-456'
      });
    });
  });

  it('should show loading state initially', () => {
    mockGetUnreadCount.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<NotificationBell userId="user-123" />);

    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    // Should not show count badge while loading
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('should show empty state when no notifications', async () => {
    mockGetRecentNotifications.mockResolvedValue([]);
    
    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });
});
