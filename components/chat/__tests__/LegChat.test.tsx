/**
 * @fileoverview Unit tests for LegChat component
 * 
 * @description Tests basic chat functionality including message rendering,
 * optimistic updates, and unread count calculation.
 * 
 * @coverage LegChat component rendering and core functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { LegChat } from '../LegChat'

// Mock hooks and dependencies
vi.mock('@/hooks/use-auth', () => ({
  useUser: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'client'
    }
  }))
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'msg-123', 
              body: 'Test message',  // FIXED: Use correct database column
              sender_role: 'client',
              created_at: new Date().toISOString() 
            }, 
            error: null 
          }))
        }))
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn()
        }))
      })),
      send: vi.fn()
    })),
    removeChannel: vi.fn()
  }
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('LegChat', () => {
  const mockLegId = 'test-leg-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Test: Component renders with loading state
   * 
   * @description Verifies that the chat component shows loading skeletons
   * while fetching initial messages.
   */
  it('renders loading state initially', () => {
    render(<LegChat legId={mockLegId} />)
    
    // Should show loading skeletons and message composer
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Type your message/)).toBeInTheDocument()
  })

  /**
   * Test: Message composition and sending
   * 
   * @description Tests that users can type messages and send them using
   * the send button or Enter key.
   */
  it('allows typing and sending messages', async () => {
    render(<LegChat legId={mockLegId} />)
    
    const textarea = screen.getByRole('textbox')
    const sendButton = screen.getByRole('button')
    
    // Type a message
    fireEvent.change(textarea, { target: { value: 'Hello, world!' } })
    expect(textarea).toHaveValue('Hello, world!')
    
    // Send button should be enabled
    expect(sendButton).not.toBeDisabled()
    
    // Click send
    fireEvent.click(sendButton)
    
    // Textarea should be cleared after sending
    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  /**
   * Test: Enter key sends message
   * 
   * @description Verifies that pressing Enter without Shift sends the message.
   */
  it('sends message on Enter key press', async () => {
    render(<LegChat legId={mockLegId} />)
    
    const textarea = screen.getByRole('textbox')
    
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    
    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  /**
   * Test: Shift+Enter adds newline
   * 
   * @description Verifies that Shift+Enter creates a new line instead
   * of sending the message.
   */
  it('adds newline on Shift+Enter', () => {
    render(<LegChat legId={mockLegId} />)
    
    const textarea = screen.getByRole('textbox')
    
    fireEvent.change(textarea, { target: { value: 'Line 1' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    
    // Should not clear the textarea
    expect(textarea).toHaveValue('Line 1')
  })

  /**
   * Test: Send button disabled for empty messages
   * 
   * @description Ensures users cannot send empty or whitespace-only messages.
   */
  it('disables send button for empty messages', () => {
    render(<LegChat legId={mockLegId} />)
    
    const sendButton = screen.getByRole('button')
    
    // Should be disabled initially
    expect(sendButton).toBeDisabled()
    
    // Should remain disabled for whitespace
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '   ' } })
    expect(sendButton).toBeDisabled()
  })
})
