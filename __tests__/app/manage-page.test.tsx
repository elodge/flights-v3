/**
 * @fileoverview Test suite for compact leg management page
 * 
 * @description Tests the server-side page component for compact leg management,
 * covering data fetching, authentication, error handling, and page rendering.
 * 
 * @coverage Compact leg management page functionality
 * @security Tests authentication and authorization flows
 * @database Tests data fetching and option_passengers integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import CompactLegPage from '@/app/(employee)/a/tour/[id]/leg/[legId]/manage/page'

// Mock external dependencies
vi.mock('next/navigation', () => ({
  notFound: vi.fn()
}))

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn()
}))

vi.mock('@/components/employee/compact-leg-manager', () => ({
  CompactLegManager: ({ leg, projectId, legId }: any) => (
    <div data-testid="compact-leg-manager">
      <div data-testid="leg-id">{leg?.id || 'no-leg'}</div>
      <div data-testid="project-id">{projectId}</div>
      <div data-testid="leg-param">{legId}</div>
    </div>
  )
}))

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      })),
      in: vi.fn()
    }))
  }))
}

const mockLegData = {
  id: 'test-leg-id',
  project_id: 'test-project-id',
  name: 'Test Leg',
  projects: {
    id: 'test-project-id',
    name: 'Test Project',
    type: 'tour',
    artist_id: 'test-artist-id',
    artists: {
      id: 'test-artist-id',
      name: 'Test Artist'
    }
  },
  leg_passengers: [],
  options: []
}

describe('CompactLegPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockResolvedValue(mockSupabaseClient as any)
  })

  /**
   * @description Tests successful page rendering with valid data
   * @security Verifies authenticated user access
   * @database Tests leg data fetching with option_passengers
   */
  it('should render compact leg manager with valid leg data', async () => {
    // CONTEXT: Mock authenticated user
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'test-user-id',
      role: 'admin'
    } as any)

    // CONTEXT: Mock successful leg data fetch
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: mockLegData, error: null })
      }))
    }))
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

    // CONTEXT: Mock option_passengers data
    const mockOptionPassengersSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null
    })
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'option_passengers') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => mockOptionPassengersSelect)
          }))
        }
      }
      return { select: mockSelect }
    })

    const params = Promise.resolve({
      id: 'test-project-id',
      legId: 'test-leg-id'
    })

    const result = await CompactLegPage({ params })

    expect(result).toBeDefined()
    expect(getServerUser).toHaveBeenCalled()
    expect(createServerClient).toHaveBeenCalled()
    expect(notFound).not.toHaveBeenCalled()
  })

  /**
   * @description Tests access denial for unauthenticated users
   * @security Verifies authentication requirement
   */
  it('should return 404 for unauthenticated users', async () => {
    vi.mocked(getServerUser).mockResolvedValue(null)

    const params = Promise.resolve({
      id: 'test-project-id',
      legId: 'test-leg-id'
    })

    await CompactLegPage({ params })

    expect(notFound).toHaveBeenCalled()
  })

  /**
   * @description Tests access denial for client users
   * @security Verifies role-based access control
   */
  it('should return 404 for client users', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'test-user-id',
      role: 'client'
    } as any)

    const params = Promise.resolve({
      id: 'test-project-id',
      legId: 'test-leg-id'
    })

    await CompactLegPage({ params })

    expect(notFound).toHaveBeenCalled()
  })

  /**
   * @description Tests handling of non-existent legs
   * @database Tests leg lookup with invalid IDs
   */
  it('should return 404 for non-existent legs', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'test-user-id',
      role: 'admin'
    } as any)

    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      }))
    }))
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

    const params = Promise.resolve({
      id: 'invalid-project-id',
      legId: 'invalid-leg-id'
    })

    await CompactLegPage({ params })

    expect(notFound).toHaveBeenCalled()
  })

  /**
   * @description Tests option_passengers data integration
   * @database Verifies option_passengers junction table queries
   * @business_rule Tests passenger-option association merging
   */
  it('should merge option_passengers data correctly', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'test-user-id',
      role: 'admin'
    } as any)

    const legWithOptions = {
      ...mockLegData,
      options: [
        { id: 'option-1', name: 'Test Option 1' },
        { id: 'option-2', name: 'Test Option 2' }
      ]
    }

    const optionPassengersData = [
      { id: 'op-1', option_id: 'option-1', passenger_id: 'passenger-1' },
      { id: 'op-2', option_id: 'option-2', passenger_id: 'passenger-2' }
    ]

    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: legWithOptions, error: null })
      }))
    }))

    const mockOptionPassengersSelect = vi.fn().mockResolvedValue({
      data: optionPassengersData,
      error: null
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'option_passengers') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => mockOptionPassengersSelect)
          }))
        }
      }
      return { select: mockSelect }
    })

    const params = Promise.resolve({
      id: 'test-project-id',
      legId: 'test-leg-id'
    })

    const result = await CompactLegPage({ params })

    expect(result).toBeDefined()
    expect(mockOptionPassengersSelect).toHaveBeenCalled()
  })
})

