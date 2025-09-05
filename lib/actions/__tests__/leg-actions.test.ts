/**
 * @fileoverview Unit tests for leg creation server actions
 * 
 * @description Tests the createLeg server action including validation,
 * authentication, authorization, and database operations.
 * 
 * @coverage createLeg server action functionality and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLeg } from '../leg-actions'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn()
}))

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn()
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('createLeg', () => {
  let mockGetServerUser: any
  let mockCreateServerClient: any
  let mockSupabase: any
  let mockRevalidatePath: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const authModule = await import('@/lib/auth')
    const supabaseModule = await import('@/lib/supabase-server')
    const cacheModule = await import('next/cache')
    
    mockGetServerUser = vi.mocked(authModule.getServerUser)
    mockCreateServerClient = vi.mocked(supabaseModule.createServerClient)
    mockRevalidatePath = vi.mocked(cacheModule.revalidatePath)
    
    // Create a simple mock that returns promises directly
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'new-leg-id' },
              error: null
            })
          })
        })
      }))
    }
    
    mockCreateServerClient.mockResolvedValue(mockSupabase)
  })

  it('should successfully create a leg with valid data', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY',
      origin: 'Los Angeles, CA',
      departure_date: '2024-03-15',
      arrival_date: '2024-03-15',
      label: 'E2E Test Leg'
    })
    
    expect(result).toEqual({
      success: true,
      legId: 'new-leg-id'
    })
    
    expect(mockRevalidatePath).toHaveBeenCalledWith('/a/tour/project-123')
  })

  it('should create a leg with only required destination field', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    const result = await createLeg('project-123', {
      destination: 'PHL'
    })
    
    expect(result).toEqual({
      success: true,
      legId: 'new-leg-id'
    })
  })

  it('should reject empty destination', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    const result = await createLeg('project-123', {
      destination: ''
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Destination must be at least 2 characters'
    })
  })

  it('should reject destination that is too long', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    const longDestination = 'A'.repeat(81)
    
    const result = await createLeg('project-123', {
      destination: longDestination
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Destination must be less than 80 characters'
    })
  })

  it('should validate date order - arrival before departure', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY',
      departure_date: '2024-03-16',
      arrival_date: '2024-03-15'
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Arrival date must be on or after departure date'
    })
  })

  it('should accept same departure and arrival date', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY',
      departure_date: '2024-03-15',
      arrival_date: '2024-03-15'
    })
    
    expect(result).toEqual({
      success: true,
      legId: 'new-leg-id'
    })
  })

  it('should reject unauthenticated users', async () => {
    mockGetServerUser.mockResolvedValue(null)
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY'
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Authentication required'
    })
  })

  it('should reject client users', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'client'
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY'
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Insufficient permissions'
    })
  })

  it('should handle database errors gracefully', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    // Mock database error by overriding the insert mock
    const mockInsert = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      })
    }
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }),
      insert: vi.fn().mockReturnValue(mockInsert)
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY'
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Failed to create leg'
    })
  })

  it('should handle leg order calculation errors', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    // Mock order calculation error
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Order calculation error' }
            })
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-leg-id' },
            error: null
          })
        })
      })
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY'
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Failed to determine leg order'
    })
  })

  it('should calculate correct leg order for new tour', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    // Mock empty existing legs
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-leg-id' },
            error: null
          })
        })
      })
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY'
    })
    
    expect(result).toEqual({
      success: true,
      legId: 'new-leg-id'
    })
    
    // Verify insert was called with leg_order: 1
    expect(mockSupabase.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        leg_order: 1
      })
    )
  })

  it('should calculate correct leg order for existing tour', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      role: 'agent'
    })
    
    // Mock existing legs with highest order 3
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ leg_order: 3 }],
              error: null
            })
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-leg-id' },
            error: null
          })
        })
      })
    })
    
    const result = await createLeg('project-123', {
      destination: 'New York, NY'
    })
    
    expect(result).toEqual({
      success: true,
      legId: 'new-leg-id'
    })
    
    // Verify insert was called with leg_order: 4
    expect(mockSupabase.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        leg_order: 4
      })
    )
  })
})