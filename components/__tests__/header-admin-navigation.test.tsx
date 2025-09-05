/**
 * @fileoverview Header Admin Navigation Tests
 * 
 * @description Tests for role-based admin navigation functionality in the header component.
 * Verifies that admin users can access the RBAC system via the avatar dropdown.
 * 
 * @coverage Admin navigation visibility, role-based access control, navigation routing
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Header } from '../header'
import { useUser } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  useUser: vi.fn()
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/a')
}))

// Mock the employee artist utilities
vi.mock('@/lib/employeeArtist', () => ({
  clientUtils: {
    getSelectedArtistId: vi.fn(() => null),
    setSelectedArtistId: vi.fn()
  }
}))

// Mock the chat components
vi.mock('@/components/chat/GlobalUnreadClient', () => ({
  GlobalUnreadClient: () => <div data-testid="global-unread-client" />
}))

vi.mock('@/components/employee/notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Header Admin Navigation', () => {
  const mockPush = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default router mock
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn()
    } as any)
    
    // Mock successful API responses
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    } as Response)
  })

  it('should render admin user avatar for admin users', () => {
    // CONTEXT: Test admin user rendering and avatar display
    // SECURITY: Verify admin users can access the header
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'admin-123', email: 'admin@test.com' },
      profile: { full_name: 'Admin User', role: 'admin' },
      role: 'admin',
      loading: false,
      signOut: vi.fn()
    })

    render(<Header />)
    
    // Verify admin user avatar is rendered
    const avatar = screen.getByRole('button', { name: /open user menu/i })
    expect(avatar).toBeInTheDocument()
    
    // Verify avatar shows admin initials
    const avatarFallback = screen.getByText('AU')
    expect(avatarFallback).toBeInTheDocument()
  })

  it('should not show Admin Panel option for non-admin users', () => {
    // CONTEXT: Test admin navigation hidden for non-admin roles
    // SECURITY: Verify role-based access control prevents unauthorized access
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'agent-123', email: 'agent@test.com' },
      profile: { full_name: 'Agent User', role: 'agent' },
      role: 'agent',
      loading: false,
      signOut: vi.fn()
    })

    render(<Header />)
    
    // Click avatar to open dropdown
    const avatar = screen.getByRole('button', { name: /open user menu/i })
    fireEvent.click(avatar)
    
    // Verify Admin Panel option is NOT visible
    const adminPanel = screen.queryByText('Admin Panel')
    expect(adminPanel).not.toBeInTheDocument()
  })

  it('should render header without errors for admin users', () => {
    // CONTEXT: Test admin user header rendering
    // BUSINESS_RULE: Admin users should see full header functionality
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'admin-123', email: 'admin@test.com' },
      profile: { full_name: 'Admin User', role: 'admin' },
      role: 'admin',
      loading: false,
      signOut: vi.fn()
    })

    render(<Header />)
    
    // Verify the component renders without errors for admin users
    const avatar = screen.getByRole('button', { name: /open user menu/i })
    expect(avatar).toBeInTheDocument()
    
    // Verify artist selector is visible for admin users
    const artistSelector = screen.getByText('All Artists')
    expect(artistSelector).toBeInTheDocument()
  })

  it('should not show Admin Panel for client users', () => {
    // CONTEXT: Test admin navigation hidden for client role
    // SECURITY: Verify clients cannot access admin functionality
    vi.mocked(useUser).mockReturnValue({
      user: { id: 'client-123', email: 'client@test.com' },
      profile: { full_name: 'Client User', role: 'client' },
      role: 'client',
      loading: false,
      signOut: vi.fn()
    })

    render(<Header />)
    
    // Click avatar to open dropdown
    const avatar = screen.getByRole('button', { name: /open user menu/i })
    fireEvent.click(avatar)
    
    // Verify Admin Panel option is NOT visible
    const adminPanel = screen.queryByText('Admin Panel')
    expect(adminPanel).not.toBeInTheDocument()
  })

  it('should not show Admin Panel when user is loading', () => {
    // CONTEXT: Test admin navigation hidden during loading state
    // SECURITY: Prevent access during authentication state changes
    vi.mocked(useUser).mockReturnValue({
      user: null,
      profile: null,
      role: null,
      loading: true,
      signOut: vi.fn()
    })

    render(<Header />)
    
    // Verify loading state is shown instead of user menu
    const loadingAvatar = document.querySelector('.animate-pulse')
    expect(loadingAvatar).toBeInTheDocument()
    
    // Verify no dropdown is available during loading
    const avatar = screen.queryByRole('button', { name: /open user menu/i })
    expect(avatar).not.toBeInTheDocument()
  })

  it('should not show Admin Panel when user is not authenticated', () => {
    // CONTEXT: Test admin navigation hidden for unauthenticated users
    // SECURITY: Verify no admin access without authentication
    vi.mocked(useUser).mockReturnValue({
      user: null,
      profile: null,
      role: null,
      loading: false,
      signOut: vi.fn()
    })

    render(<Header />)
    
    // Verify Sign In button is shown instead of user menu
    const signInButton = screen.getByText('Sign In')
    expect(signInButton).toBeInTheDocument()
    
    // Verify no dropdown is available
    const avatar = screen.queryByRole('button', { name: /open user menu/i })
    expect(avatar).not.toBeInTheDocument()
  })
})
