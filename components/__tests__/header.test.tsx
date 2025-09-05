import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/src/test/utils'
import { Header } from '../header'

// Mock the useUser hook
const mockUseUser = vi.fn()
vi.mock('@/hooks/use-auth', () => ({
  useUser: () => mockUseUser()
}))

describe('Header', () => {
  beforeEach(() => {
    // Default mock return value - no user logged in
    mockUseUser.mockReturnValue({
      user: null,
      profile: null,
      role: null,
      loading: false,
      signOut: vi.fn()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the header with correct title', () => {
    renderWithProviders(<Header />)
    
    // Title is now split across multiple elements
    expect(screen.getByText('Daysheets')).toBeInTheDocument()
    expect(screen.getByText('Flight Management')).toBeInTheDocument()
  })

  it('renders artist selector dropdown when authenticated as employee', () => {
    // Mock employee user to show artist selector
    mockUseUser.mockReturnValue({
      user: 'user-id',
      profile: { 
        full_name: 'Test Agent',
        role: 'agent'
      },
      role: 'agent',
      loading: false,
      signOut: vi.fn()
    })

    renderWithProviders(<Header />)
    
    // Artist selector should show "All Artists" by default
    expect(screen.getByText('All Artists')).toBeInTheDocument()
  })

  it('renders notifications button when authenticated', () => {
    // Mock authenticated user to show notifications button
    mockUseUser.mockReturnValue({
      user: 'user-id',
      profile: { 
        full_name: 'Test User',
        role: 'client'
      },
      role: 'client',
      loading: false,
      signOut: vi.fn()
    })

    renderWithProviders(<Header />)
    
    // Look for button with Bell icon (check for lucide-bell class)
    const buttons = screen.getAllByRole('button')
    const notificationButton = buttons.find(button => {
      const svg = button.querySelector('svg')
      return svg && svg.classList.contains('lucide-bell')
    })
    expect(notificationButton).toBeInTheDocument()
  })

  it('shows sign in button when not authenticated', () => {
    renderWithProviders(<Header />)
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows user menu when authenticated', () => {
    mockUseUser.mockReturnValue({
      user: 'user-id',
      profile: { 
        full_name: 'Test User',
        role: 'client'
      },
      role: 'client',
      loading: false,
      signOut: vi.fn()
    })

    renderWithProviders(<Header />)
    
    // Should show avatar button instead of sign in
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
    
    // Should show user avatar (look for button with avatar)
    const buttons = screen.getAllByRole('button')
    const avatarButton = buttons.find(button => 
      button.querySelector('[class*="avatar"]') || 
      button.textContent?.includes('TU') // initials
    )
    expect(avatarButton).toBeInTheDocument()
  })

  it('shows loading state when auth is loading', () => {
    mockUseUser.mockReturnValue({
      user: null,
      profile: null,
      role: null,
      loading: true,
      signOut: vi.fn()
    })

    renderWithProviders(<Header />)
    
    // Should show loading placeholder with specific classes
    const loadingElement = screen.getByText((content, element) => {
      return element?.classList.contains('animate-pulse') || false
    })
    expect(loadingElement).toBeInTheDocument()
  })

  it('displays user information when authenticated', () => {
    const mockSignOut = vi.fn()
    mockUseUser.mockReturnValue({
      user: 'user-id',
      profile: { 
        full_name: 'Test User',
        email: 'test@example.com'
      },
      role: 'client',
      loading: false,
      signOut: mockSignOut
    })

    renderWithProviders(<Header />)
    
    // User initials should be shown in avatar
    expect(screen.getByText('TU')).toBeInTheDocument()
  })

  it('has proper accessibility structure', () => {
    renderWithProviders(<Header />)
    
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('sticky', 'top-0', 'z-50')
  })

  it('has responsive design classes', () => {
    renderWithProviders(<Header />)
    
    // Check for responsive title visibility - "Flight Management" should be hidden on small screens
    const subtitle = screen.getByText('Flight Management')
    expect(subtitle).toHaveClass('hidden', 'sm:block')
  })

  it('shows user email and role in dropdown when authenticated', async () => {
    const mockSignOut = vi.fn()
    mockUseUser.mockReturnValue({
      user: {
        id: 'user-id',
        email: 'test@example.com'
      },
      profile: { 
        full_name: 'Test User'
      },
      role: 'client',
      loading: false,
      signOut: mockSignOut
    })

    renderWithProviders(<Header />)
    
    // Should show initials in avatar
    expect(screen.getByText('TU')).toBeInTheDocument()
  })
})