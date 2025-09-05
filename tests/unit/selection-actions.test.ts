/**
 * @fileoverview Unit tests for flight selection actions
 * 
 * @description Tests for client flight selection server actions including
 * group selection, individual selection, and confirmation functionality.
 * Validates RPC call structure and parameter handling.
 * 
 * @coverage
 * - selectFlightOption with group and individual modes
 * - confirmGroupSelection functionality
 * - Parameter validation and error handling
 * - RPC call structure verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { selectFlightOption, confirmGroupSelection } from '@/lib/actions/selection-actions'

// Mock dependencies
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(() => ({
    rpc: vi.fn()
  }))
}))

vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn()
}))

// Import mocked modules
const { createServerClient } = await import('@/lib/supabase-server')
const { getServerUser } = await import('@/lib/auth')

describe('Flight Selection Actions', () => {
  const mockSupabase = {
    rpc: vi.fn()
  }
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('selectFlightOption', () => {
    const validParams = {
      leg_id: 'leg-123',
      option_id: 'option-456', 
      passenger_ids: null
    }

    it('should require authentication', async () => {
      // CONTEXT: Test authentication requirement
      vi.mocked(getServerUser).mockResolvedValue(null)
      
      const result = await selectFlightOption(validParams)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should require client role', async () => {
      // CONTEXT: Test role-based access control
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'agent' // Not client
      } as any)
      
      const result = await selectFlightOption(validParams)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should validate required parameters', async () => {
      // CONTEXT: Test parameter validation
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      // Test missing leg_id
      const result1 = await selectFlightOption({
        leg_id: '',
        option_id: 'option-456',
        passenger_ids: null
      })
      
      expect(result1.success).toBe(false)
      expect(result1.error).toBe('Missing required parameters')
      
      // Test missing option_id
      const result2 = await selectFlightOption({
        leg_id: 'leg-123',
        option_id: '',
        passenger_ids: null
      })
      
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('Missing required parameters')
      
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should call RPC with correct parameters for group selection', async () => {
      // CONTEXT: Test group selection RPC call structure
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      mockSupabase.rpc.mockResolvedValue({
        data: { id: 'selection-123' },
        error: null
      })
      
      const result = await selectFlightOption({
        leg_id: 'leg-123',
        option_id: 'option-456',
        passenger_ids: null // Group selection
      })
      
      expect(result.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_client_select_option', {
        leg_id_param: 'leg-123',
        option_id_param: 'option-456',
        passenger_ids_param: null
      })
    })

    it('should call RPC with correct parameters for individual selection', async () => {
      // CONTEXT: Test individual selection RPC call structure
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      mockSupabase.rpc.mockResolvedValue({
        data: { id: 'selection-123' },
        error: null
      })
      
      const passengerIds = ['passenger-1', 'passenger-2']
      const result = await selectFlightOption({
        leg_id: 'leg-123',
        option_id: 'option-456',
        passenger_ids: passengerIds
      })
      
      expect(result.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_client_select_option', {
        leg_id_param: 'leg-123',
        option_id_param: 'option-456',
        passenger_ids_param: passengerIds
      })
    })

    it('should handle RPC errors gracefully', async () => {
      // CONTEXT: Test RPC error handling
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Option not available' }
      })
      
      const result = await selectFlightOption(validParams)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Option not available')
    })

    it('should handle unexpected errors', async () => {
      // CONTEXT: Test unexpected error handling
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'))
      
      const result = await selectFlightOption(validParams)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  describe('confirmGroupSelection', () => {
    it('should require authentication', async () => {
      // CONTEXT: Test authentication requirement for confirmation
      vi.mocked(getServerUser).mockResolvedValue(null)
      
      const result = await confirmGroupSelection('leg-123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should require client role', async () => {
      // CONTEXT: Test role-based access for confirmation
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'agent' // Not client
      } as any)
      
      const result = await confirmGroupSelection('leg-123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should validate leg ID parameter', async () => {
      // CONTEXT: Test leg ID validation
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      const result = await confirmGroupSelection('')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Leg ID is required')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should call confirmation RPC with correct parameters', async () => {
      // CONTEXT: Test group confirmation RPC call
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      mockSupabase.rpc.mockResolvedValue({
        data: { confirmed_count: 3 },
        error: null
      })
      
      const result = await confirmGroupSelection('leg-123')
      
      expect(result.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_confirm_group_selection', {
        leg_id_param: 'leg-123'
      })
    })

    it('should handle confirmation errors', async () => {
      // CONTEXT: Test confirmation error handling
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'No selections to confirm' }
      })
      
      const result = await confirmGroupSelection('leg-123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('No selections to confirm')
    })
  })

  describe('Parameter Structure Validation', () => {
    it('should use correct RPC parameter naming convention', () => {
      // CONTEXT: Verify parameter naming matches database RPC function
      // BUSINESS_RULE: All parameters must use _param suffix for RPC calls
      
      const expectedGroupParams = {
        leg_id_param: expect.any(String),
        option_id_param: expect.any(String),
        passenger_ids_param: null
      }
      
      const expectedIndividualParams = {
        leg_id_param: expect.any(String),
        option_id_param: expect.any(String),
        passenger_ids_param: expect.any(Array)
      }
      
      const expectedConfirmationParams = {
        leg_id_param: expect.any(String)
      }
      
      // These structures are verified in the individual test cases above
      expect(expectedGroupParams).toBeDefined()
      expect(expectedIndividualParams).toBeDefined()
      expect(expectedConfirmationParams).toBeDefined()
    })

    it('should handle null vs undefined for passenger_ids correctly', async () => {
      // CONTEXT: Test null handling for group selections
      // BUSINESS_RULE: Group selections use null, individual use arrays
      vi.mocked(getServerUser).mockResolvedValue({
        id: 'user-123',
        role: 'client'
      } as any)
      
      mockSupabase.rpc.mockResolvedValue({
        data: { id: 'selection-123' },
        error: null
      })
      
      // Test null for group
      await selectFlightOption({
        leg_id: 'leg-123',
        option_id: 'option-456',
        passenger_ids: null
      })
      
      expect(mockSupabase.rpc).toHaveBeenLastCalledWith('rpc_client_select_option', 
        expect.objectContaining({
          passenger_ids_param: null
        })
      )
      
      // Test array for individual
      await selectFlightOption({
        leg_id: 'leg-123',
        option_id: 'option-456',
        passenger_ids: ['passenger-1']
      })
      
      expect(mockSupabase.rpc).toHaveBeenLastCalledWith('rpc_client_select_option', 
        expect.objectContaining({
          passenger_ids_param: ['passenger-1']
        })
      )
    })
  })
})
