import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { assignPassengersToLeg, createFlightOption, createHold } from '@/lib/actions/employee-actions'

// Mock external dependencies
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { createServerClient } = await import('@/lib/supabase-server')
const { getServerUser } = await import('@/lib/auth')
const { revalidatePath } = await import('next/cache')

// Mock query builder methods that return themselves for chaining
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue(mockQueryBuilder),
}

describe('Server Actions - Leg Management', () => {
  beforeEach(() => {
    // Setup default mocks
    vi.mocked(createServerClient).mockResolvedValue(mockSupabaseClient as any)
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'user-123',
      email: 'agent@test.com',
      role: 'agent',
    } as any)
    
    // Setup flexible query builder chain
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder)
    mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder) 
    
    // Create a delete-specific builder that has eq and in methods
    const deleteBuilder = {
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
        catch: vi.fn(),
        finally: vi.fn()
      }),
      in: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
      catch: vi.fn(),
      finally: vi.fn()
    }
    
    mockQueryBuilder.delete.mockReturnValue(deleteBuilder)
    
    // Make .eq() and .in() both chainable AND awaitable
    const chainablePromise = {
      eq: vi.fn().mockReturnValue({
        then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
        catch: vi.fn(),
        finally: vi.fn()
      }),
      in: vi.fn().mockReturnValue({
        then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
        catch: vi.fn(),
        finally: vi.fn()
      }),
      then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
      catch: vi.fn(),
      finally: vi.fn()
    }
    
    mockQueryBuilder.eq.mockReturnValue(chainablePromise)
    mockQueryBuilder.in.mockReturnValue(chainablePromise)
    mockQueryBuilder.single.mockResolvedValue({ data: null, error: null })
    
    // Ensure the from method returns the query builder
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('assignPassengersToLeg', () => {
    const mockFormData = new FormData()

    beforeEach(() => {
      mockFormData.set('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      mockFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440001')
      mockFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440002')
    })

    it('should successfully assign passengers to leg', async () => {
      // Mock successful database operations
      mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { project_id: 'project-123' }, 
        error: null 
      })

      const result = await assignPassengersToLeg(mockFormData)

      // Assert result
      expect(result).toEqual({ success: true })

      // Assert delete operation - removes existing assignments
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('leg_passengers')
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('tour_personnel_id', ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'])

      // Assert insert operation - adds new assignments
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        {
          leg_id: '550e8400-e29b-41d4-a716-446655440000',
          tour_personnel_id: '550e8400-e29b-41d4-a716-446655440001',
          treat_as_individual: false,
        },
        {
          leg_id: '550e8400-e29b-41d4-a716-446655440000',
          tour_personnel_id: '550e8400-e29b-41d4-a716-446655440002',
          treat_as_individual: false,
        }
      ])

      // Assert revalidation query
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('project_id')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000')

      // Assert path revalidation
      expect(revalidatePath).toHaveBeenCalledWith('/a/project/project-123/leg/550e8400-e29b-41d4-a716-446655440000')
    })

    it('should return error for unauthorized user', async () => {
      vi.mocked(getServerUser).mockResolvedValueOnce({
        id: 'user-123',
        email: 'client@test.com',
        role: 'client',
      } as any)

      const result = await assignPassengersToLeg(mockFormData)

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should return error when no user', async () => {
      vi.mocked(getServerUser).mockResolvedValueOnce(null)

      const result = await assignPassengersToLeg(mockFormData)

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockQueryBuilder.delete.mockRejectedValueOnce(dbError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await assignPassengersToLeg(mockFormData)

      expect(result).toEqual({ error: 'Failed to assign passengers' })
      expect(consoleSpy).toHaveBeenCalledWith('Error assigning passengers:', dbError)

      consoleSpy.mockRestore()
    })

    it('should handle insert error gracefully', async () => {
      const insertError = new Error('Insert failed')
      mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: insertError })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await assignPassengersToLeg(mockFormData)

      expect(result).toEqual({ error: 'Failed to assign passengers' })
      expect(consoleSpy).toHaveBeenCalledWith('Error assigning passengers:', insertError)

      consoleSpy.mockRestore()
    })

    it('should validate input data schema', async () => {
      const invalidFormData = new FormData()
      invalidFormData.set('leg_id', 'invalid-uuid')
      invalidFormData.append('passenger_ids', 'also-invalid')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await assignPassengersToLeg(invalidFormData)

      expect(result).toEqual({ error: 'Failed to assign passengers' })
      expect(consoleSpy).toHaveBeenCalled()
      
      // Verify it's a validation error
      const call = consoleSpy.mock.calls[0]
      expect(call[1].name).toBe('ZodError')

      consoleSpy.mockRestore()
    })
  })

  describe('createFlightOption', () => {
    const mockFormData = new FormData()

    beforeEach(() => {
      mockFormData.set('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      mockFormData.set('name', 'UA 123 LAX→JFK')
      mockFormData.set('description', 'Direct flight')
      mockFormData.set('total_cost', '45000') // $450 in cents
      mockFormData.set('currency', 'USD')
      mockFormData.set('is_recommended', 'true')
      mockFormData.set('components', JSON.stringify([
        { description: 'UA 123 LAX→JFK 15MAR 0800/1630', component_order: 1 }
      ]))
    })

    it('should successfully create flight option with components', async () => {
      const mockOption = { id: 'option-123', name: 'UA 123 LAX→JFK' }
      
      // Mock successful option creation
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: mockOption, 
        error: null 
      })
      
      // Mock successful components creation
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      
      // Mock leg query for revalidation
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { project_id: 'project-123' }, 
        error: null 
      })

      const result = await createFlightOption(mockFormData)

      // Assert result
      expect(result).toEqual({ success: true, option: mockOption })

      // Assert option creation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('options')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        leg_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'UA 123 LAX→JFK',
        description: 'Direct flight',
        total_cost: 45000,
        currency: 'USD',
        is_recommended: true,
        is_available: true,
      })

      // Assert components creation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('option_components')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([{
        option_id: 'option-123',
        description: 'UA 123 LAX→JFK 15MAR 0800/1630',
        component_order: 1,
      }])

      // Assert revalidation
      expect(revalidatePath).toHaveBeenCalledWith('/a/project/project-123/leg/550e8400-e29b-41d4-a716-446655440000')
    })

    it('should create option without components when none provided', async () => {
      // Remove components from form data
      mockFormData.set('components', JSON.stringify([]))
      
      const mockOption = { id: 'option-123', name: 'UA 123 LAX→JFK' }
      
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: mockOption, 
        error: null 
      })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { project_id: 'project-123' }, 
        error: null 
      })

      const result = await createFlightOption(mockFormData)

      expect(result).toEqual({ success: true, option: mockOption })

      // Should only call insert once (for options, not option_components)
      expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(1)
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        leg_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'UA 123 LAX→JFK',
        description: 'Direct flight',
        total_cost: 45000,
        currency: 'USD',
        is_recommended: true,
        is_available: true,
      })
    })

    it('should handle optional fields correctly', async () => {
      // Create minimal form data
      const minimalFormData = new FormData()
      minimalFormData.set('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      minimalFormData.set('name', 'Basic Flight')
      minimalFormData.set('components', JSON.stringify([]))
      
      const mockOption = { id: 'option-123', name: 'Basic Flight' }
      
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: mockOption, 
        error: null 
      })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { project_id: 'project-123' }, 
        error: null 
      })

      const result = await createFlightOption(minimalFormData)

      expect(result).toEqual({ success: true, option: mockOption })

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        leg_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Basic Flight',
        description: undefined,
        total_cost: undefined,
        currency: undefined,
        is_recommended: false,
        is_available: true,
      })
    })

    it('should return error for unauthorized user', async () => {
      vi.mocked(getServerUser).mockResolvedValueOnce({
        id: 'user-123',
        email: 'client@test.com',
        role: 'client',
      } as any)

      const result = await createFlightOption(mockFormData)

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should handle option creation error', async () => {
      const dbError = new Error('Option creation failed')
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: null, 
        error: dbError 
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await createFlightOption(mockFormData)

      expect(result).toEqual({ error: 'Failed to create flight option' })
      expect(consoleSpy).toHaveBeenCalledWith('Error creating flight option:', dbError)

      consoleSpy.mockRestore()
    })

    it('should handle components creation error', async () => {
      const mockOption = { id: 'option-123', name: 'UA 123 LAX→JFK' }
      
      // Option creation succeeds
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: mockOption, 
        error: null 
      })
      
      // Components creation fails
      const componentsError = new Error('Components creation failed')
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: componentsError })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await createFlightOption(mockFormData)

      expect(result).toEqual({ error: 'Failed to create flight option' })
      expect(consoleSpy).toHaveBeenCalledWith('Error creating flight option:', componentsError)

      consoleSpy.mockRestore()
    })
  })

  describe('createHold', () => {
    const mockFormData = new FormData()

    beforeEach(() => {
      mockFormData.set('option_id', '550e8400-e29b-41d4-a716-446655440003')
      mockFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440001')
      mockFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440002')
    })

    it('should successfully create holds for multiple passengers', async () => {
      // Mock successful holds creation
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      
      // Mock option query for revalidation
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { 
          leg_id: 'leg-123',
          legs: { project_id: 'project-123' }
        }, 
        error: null 
      })

      const result = await createHold(mockFormData)

      // Assert result
      expect(result).toEqual({ success: true })

      // Assert holds creation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('holds')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          option_id: '550e8400-e29b-41d4-a716-446655440003',
          tour_personnel_id: '550e8400-e29b-41d4-a716-446655440001',
          expires_at: expect.any(String),
        }),
        expect.objectContaining({
          option_id: '550e8400-e29b-41d4-a716-446655440003',
          tour_personnel_id: '550e8400-e29b-41d4-a716-446655440002',
          expires_at: expect.any(String),
        })
      ])

      // Assert revalidation query
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('options')
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(`
        leg_id,
        legs!inner (
          project_id
        )
      `)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440003')

      // Assert path revalidation
      expect(revalidatePath).toHaveBeenCalledWith('/a/project/project-123/leg/leg-123')
    })

    it('should calculate correct expiry time (24 hours from now)', async () => {
      const startTime = Date.now()

      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { 
          leg_id: 'leg-123',
          legs: { project_id: 'project-123' }
        }, 
        error: null 
      })

      await createHold(mockFormData)

      // Check that expires_at is approximately 24 hours from now
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0]
      const firstHold = insertCall[0]
      const expiresAt = new Date(firstHold.expires_at)
      const expiresAtMs = expiresAt.getTime()
      const expectedMinMs = startTime + (24 * 60 * 60 * 1000) - 1000 // Allow 1 second tolerance
      const expectedMaxMs = startTime + (24 * 60 * 60 * 1000) + 1000

      expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMinMs)
      expect(expiresAtMs).toBeLessThanOrEqual(expectedMaxMs)
    })

    it('should create holds for single passenger', async () => {
      const singlePassengerFormData = new FormData()
      singlePassengerFormData.set('option_id', '550e8400-e29b-41d4-a716-446655440003')
      singlePassengerFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440001')

      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { 
          leg_id: 'leg-123',
          legs: { project_id: 'project-123' }
        }, 
        error: null 
      })

      const result = await createHold(singlePassengerFormData)

      expect(result).toEqual({ success: true })
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          option_id: '550e8400-e29b-41d4-a716-446655440003',
          tour_personnel_id: '550e8400-e29b-41d4-a716-446655440001',
          expires_at: expect.any(String),
        })
      ])
    })

    it('should return error for unauthorized user', async () => {
      vi.mocked(getServerUser).mockResolvedValueOnce({
        id: 'user-123',
        email: 'client@test.com',
        role: 'client',
      } as any)

      const result = await createHold(mockFormData)

      expect(result).toEqual({ error: 'Unauthorized' })
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Hold creation failed')
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: dbError })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await createHold(mockFormData)

      expect(result).toEqual({ error: 'Failed to create hold' })
      expect(consoleSpy).toHaveBeenCalledWith('Error creating hold:', dbError)

      consoleSpy.mockRestore()
    })

    it('should validate input data schema', async () => {
      const invalidFormData = new FormData()
      invalidFormData.set('option_id', 'invalid-uuid')
      invalidFormData.append('passenger_ids', 'also-invalid')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await createHold(invalidFormData)

      expect(result).toEqual({ error: 'Failed to create hold' })
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle missing option during revalidation', async () => {
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: null, 
        error: new Error('Option not found') 
      })

      // Should still return success since holds were created successfully
      const result = await createHold(mockFormData)

      expect(result).toEqual({ success: true })
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('Database Contract Validation', () => {
    it('should maintain correct table names', async () => {
      const mockFormData = new FormData()
      mockFormData.set('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      mockFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440001')

      mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { project_id: 'project-123' }, 
        error: null 
      })

      await assignPassengersToLeg(mockFormData)

      // Verify exact table names
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('leg_passengers')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('legs')
    })

    it('should maintain correct column names for leg_passengers', async () => {
      const mockFormData = new FormData()
      mockFormData.set('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      mockFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440001')

      mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { project_id: 'project-123' }, 
        error: null 
      })

      await assignPassengersToLeg(mockFormData)

      // Verify exact column names in insert
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([{
        leg_id: '550e8400-e29b-41d4-a716-446655440000',
        tour_personnel_id: '550e8400-e29b-41d4-a716-446655440001',
        treat_as_individual: false,
      }])

      // Verify exact column names in queries
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('tour_personnel_id', ['550e8400-e29b-41d4-a716-446655440001'])
    })

    it('should maintain correct column names for options table', async () => {
      const mockFormData = new FormData()
      mockFormData.set('leg_id', '550e8400-e29b-41d4-a716-446655440000')
      mockFormData.set('name', 'Test Flight')
      mockFormData.set('components', JSON.stringify([]))

      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { id: 'option-123' }, 
        error: null 
      })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { project_id: 'project-123' }, 
        error: null 
      })

      await createFlightOption(mockFormData)

      // Verify exact column names for options
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        leg_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Flight',
        description: undefined,
        total_cost: undefined,
        currency: undefined,
        is_recommended: false,
        is_available: true,
      })
    })

    it('should maintain correct column names for holds table', async () => {
      const mockFormData = new FormData()
      mockFormData.set('option_id', '550e8400-e29b-41d4-a716-446655440003')
      mockFormData.append('passenger_ids', '550e8400-e29b-41d4-a716-446655440001')

      mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { 
          leg_id: 'leg-123',
          legs: { project_id: 'project-123' }
        }, 
        error: null 
      })

      await createHold(mockFormData)

      // Verify exact column names for holds
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([{
        option_id: '550e8400-e29b-41d4-a716-446655440003',
        tour_personnel_id: '550e8400-e29b-41d4-a716-446655440001',
        expires_at: expect.any(String),
      }])
    })
  })
})
