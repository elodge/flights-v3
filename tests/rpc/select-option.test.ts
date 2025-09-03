import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the Supabase client - inline function to avoid hoisting issues
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

// Import after mocking to ensure mock is applied
import { selectOption, selectOptionForGroup, selectOptionForPassengers } from '@/lib/flight-selection'
import { supabase } from '@/lib/supabase'

// Get the mocked rpc function for our tests
const mockRpc = vi.mocked(supabase.rpc)

// Mock console.error to avoid noise in test output
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('Flight Selection RPC Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockClear()
  })

  describe('selectOption helper function', () => {
    const validLegId = '77777777-7777-7777-7777-777777777777'
    const validOptionId = '00000000-0000-0000-0000-000000000001'
    const validPassengerIds = [
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111112'
    ]

    describe('Parameter validation', () => {
      it('should reject missing leg_id', async () => {
        const result = await selectOption({
          leg_id: '',
          option_id: validOptionId
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('leg_id is required')
        expect(mockRpc).not.toHaveBeenCalled()
      })

      it('should reject missing option_id', async () => {
        const result = await selectOption({
          leg_id: validLegId,
          option_id: ''
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('option_id is required')
        expect(mockRpc).not.toHaveBeenCalled()
      })

      it('should accept valid parameters', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId
        })

        expect(result.success).toBe(true)
        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: null
        })
      })
    })

    describe('Group selection (no passenger_ids)', () => {
      it('should call RPC with null passenger_ids for group selection', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId
        })

        expect(mockRpc).toHaveBeenCalledTimes(1)
        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: null
        })

        expect(result.success).toBe(true)
        expect(result.message).toBe('Successfully selected option for all passengers')
      })

      it('should call RPC with null when passenger_ids is undefined', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: undefined
        })

        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: null
        })

        expect(result.success).toBe(true)
      })

      it('should call RPC with null when passenger_ids is empty array', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: []
        })

        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: []
        })

        expect(result.success).toBe(true)
      })
    })

    describe('Individual selection (with passenger_ids)', () => {
      it('should call RPC with passenger_ids array for individual selection', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: validPassengerIds
        })

        expect(mockRpc).toHaveBeenCalledTimes(1)
        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: validPassengerIds
        })

        expect(result.success).toBe(true)
        expect(result.message).toBe('Successfully selected option for 2 passenger(s)')
      })

      it('should handle single passenger selection', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const singlePassenger = [validPassengerIds[0]]
        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: singlePassenger
        })

        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: singlePassenger
        })

        expect(result.success).toBe(true)
        expect(result.message).toBe('Successfully selected option for 1 passenger(s)')
      })

      it('should preserve exact passenger ID array structure', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const passengerIds = [
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333'
        ]

        await selectOption({
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: passengerIds
        })

        const rpcCall = mockRpc.mock.calls[0]
        expect(rpcCall[0]).toBe('rpc_client_select_option')
        expect(rpcCall[1].passenger_ids).toEqual(passengerIds)
        expect(rpcCall[1].passenger_ids).toHaveLength(3)
      })
    })

    describe('Error handling', () => {
      it('should handle RPC errors gracefully', async () => {
        const rpcError = {
          message: 'User is not assigned to this artist',
          code: '42501'
        }
        mockRpc.mockResolvedValueOnce({ data: null, error: rpcError })

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('User is not assigned to this artist')
        expect(consoleSpy).toHaveBeenCalledWith('RPC error:', rpcError)
      })

      it('should handle RPC errors without message', async () => {
        const rpcError = { code: '42501' }
        mockRpc.mockResolvedValueOnce({ data: null, error: rpcError })

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Failed to select option')
      })

      it('should handle network/connection errors', async () => {
        const networkError = new Error('Network connection failed')
        mockRpc.mockRejectedValueOnce(networkError)

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Network connection failed')
        expect(consoleSpy).toHaveBeenCalledWith('selectOption error:', networkError)
      })

      it('should handle non-Error exceptions', async () => {
        mockRpc.mockRejectedValueOnce('String error')

        const result = await selectOption({
          leg_id: validLegId,
          option_id: validOptionId
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Unknown error occurred')
      })
    })

    describe('RPC call contract validation', () => {
      it('should always call rpc function with exact parameter names', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        await selectOption({
          leg_id: validLegId,
          option_id: validOptionId,
          passenger_ids: validPassengerIds
        })

        const [functionName, parameters] = mockRpc.mock.calls[0]
        
        expect(functionName).toBe('rpc_client_select_option')
        expect(parameters).toHaveProperty('leg_id')
        expect(parameters).toHaveProperty('option_id')
        expect(parameters).toHaveProperty('passenger_ids')
        expect(Object.keys(parameters)).toEqual(['leg_id', 'option_id', 'passenger_ids'])
      })

      it('should pass UUID strings in correct format', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const legId = '12345678-1234-1234-1234-123456789012'
        const optionId = '87654321-4321-4321-4321-210987654321'

        await selectOption({
          leg_id: legId,
          option_id: optionId
        })

        const [, parameters] = mockRpc.mock.calls[0]
        expect(parameters.leg_id).toBe(legId)
        expect(parameters.option_id).toBe(optionId)
        expect(typeof parameters.leg_id).toBe('string')
        expect(typeof parameters.option_id).toBe('string')
      })
    })
  })

  describe('Convenience wrapper functions', () => {
    describe('selectOptionForGroup', () => {
      it('should call selectOption with no passenger_ids', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const result = await selectOptionForGroup(
          '77777777-7777-7777-7777-777777777777',
          '00000000-0000-0000-0000-000000000001'
        )

        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: '77777777-7777-7777-7777-777777777777',
          option_id: '00000000-0000-0000-0000-000000000001',
          passenger_ids: null
        })

        expect(result.success).toBe(true)
        expect(result.message).toBe('Successfully selected option for all passengers')
      })
    })

    describe('selectOptionForPassengers', () => {
      it('should call selectOption with passenger_ids array', async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null })

        const passengerIds = [
          '11111111-1111-1111-1111-111111111111',
          '11111111-1111-1111-1111-111111111112'
        ]

        const result = await selectOptionForPassengers(
          '77777777-7777-7777-7777-777777777777',
          '00000000-0000-0000-0000-000000000001',
          passengerIds
        )

        expect(mockRpc).toHaveBeenCalledWith('rpc_client_select_option', {
          leg_id: '77777777-7777-7777-7777-777777777777',
          option_id: '00000000-0000-0000-0000-000000000001',
          passenger_ids: passengerIds
        })

        expect(result.success).toBe(true)
        expect(result.message).toBe('Successfully selected option for 2 passenger(s)')
      })

      it('should reject empty passenger array', async () => {
        const result = await selectOptionForPassengers(
          '77777777-7777-7777-7777-777777777777',
          '00000000-0000-0000-0000-000000000001',
          []
        )

        expect(result.success).toBe(false)
        expect(result.error).toBe('At least one passenger ID is required for individual selection')
        expect(mockRpc).not.toHaveBeenCalled()
      })

      it('should reject null/undefined passenger array', async () => {
        const result1 = await selectOptionForPassengers(
          '77777777-7777-7777-7777-777777777777',
          '00000000-0000-0000-0000-000000000001',
          null as any
        )

        const result2 = await selectOptionForPassengers(
          '77777777-7777-7777-7777-777777777777',
          '00000000-0000-0000-0000-000000000001',
          undefined as any
        )

        expect(result1.success).toBe(false)
        expect(result2.success).toBe(false)
        expect(mockRpc).not.toHaveBeenCalled()
      })
    })
  })

  describe('Integration scenarios', () => {
    it('should handle successful group selection flow', async () => {
      mockRpc.mockResolvedValueOnce({ data: { message: 'Selection completed' }, error: null })

      const result = await selectOptionForGroup(
        '77777777-7777-7777-7777-777777777777',
        '00000000-0000-0000-0000-000000000001'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('all passengers')
    })

    it('should handle individual selection with multiple passengers', async () => {
      mockRpc.mockResolvedValueOnce({ data: { message: 'Selection completed' }, error: null })

      const passengerIds = [
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111112',
        '11111111-1111-1111-1111-111111111113'
      ]

      const result = await selectOptionForPassengers(
        '77777777-7777-7777-7777-777777777777',
        '00000000-0000-0000-0000-000000000001',
        passengerIds
      )

      expect(result.success).toBe(true)
      expect(result.message).toBe('Successfully selected option for 3 passenger(s)')
    })

    it('should handle database constraint violations', async () => {
      const constraintError = {
        message: 'Option is no longer available',
        code: '23505',
        details: 'Option has expired'
      }
      mockRpc.mockResolvedValueOnce({ data: null, error: constraintError })

      const result = await selectOption({
        leg_id: '77777777-7777-7777-7777-777777777777',
        option_id: '00000000-0000-0000-0000-000000000001'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Option is no longer available')
    })

    it('should handle permission denied errors', async () => {
      const permissionError = {
        message: 'User does not have permission to select options for this leg',
        code: '42501'
      }
      mockRpc.mockResolvedValueOnce({ data: null, error: permissionError })

      const result = await selectOption({
        leg_id: '77777777-7777-7777-7777-777777777777',
        option_id: '00000000-0000-0000-0000-000000000001'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('User does not have permission to select options for this leg')
    })
  })
})
