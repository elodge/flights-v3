/**
 * @fileoverview Budget Actions Tests
 * 
 * @description Comprehensive tests for budget management actions including
 * getProjectBudgets, setBudget, and getBudgetSnapshot functions.
 * 
 * @coverage Budget actions, database operations, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getProjectBudgets, setBudget, getBudgetSnapshot } from '../budget-actions'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'

// Mock dependencies
vi.mock('@/lib/supabase-server')
vi.mock('@/lib/auth')

const mockCreateServerClient = vi.mocked(createServerClient)
const mockGetServerUser = vi.mocked(getServerUser)

describe('Budget Actions', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'agent'
    }
    mockGetServerUser.mockResolvedValue(mockUser)

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn()
    }
    mockCreateServerClient.mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProjectBudgets', () => {
    it('should fetch all budget records for a project', async () => {
      // CONTEXT: Mock successful budget fetch
      const mockBudgets = [
        {
          id: 'budget-1',
          project_id: 'project-123',
          level: 'tour',
          amount_cents: 1000000,
          notes: 'Tour budget',
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user-123',
          party: null,
          passenger_id: null,
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'budget-2',
          project_id: 'project-123',
          level: 'party',
          amount_cents: 500000,
          notes: 'Artist party budget',
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user-123',
          party: 'Artist',
          passenger_id: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.single.mockResolvedValue({
        data: mockBudgets,
        error: null
      })

      const result = await getProjectBudgets('project-123')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].level).toBe('tour')
      expect(result.data?.[1].level).toBe('party')
      expect(result.data?.[1].party).toBe('Artist')
    })

    it('should handle authentication errors', async () => {
      // SECURITY: Test authentication requirement
      mockGetServerUser.mockResolvedValue(null)

      const result = await getProjectBudgets('project-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
    })

    it('should handle missing project ID', async () => {
      const result = await getProjectBudgets('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Project ID is required')
    })

    it('should handle database errors', async () => {
      // DATABASE: Test error handling
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const result = await getProjectBudgets('project-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })

    it('should transform null values to undefined for TypeScript compatibility', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          project_id: 'project-123',
          level: 'tour',
          amount_cents: 1000000,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'user-123',
          party: null,
          passenger_id: null,
          updated_at: null
        }
      ]

      mockSupabase.single.mockResolvedValue({
        data: mockBudgets,
        error: null
      })

      const result = await getProjectBudgets('project-123')

      expect(result.success).toBe(true)
      expect(result.data?.[0].notes).toBeUndefined()
      expect(result.data?.[0].party).toBeUndefined()
      expect(result.data?.[0].passenger_id).toBeUndefined()
      expect(result.data?.[0].updated_at).toBeUndefined()
    })
  })

  describe('setBudget', () => {
    it('should create a new tour-level budget', async () => {
      // BUSINESS_RULE: Test tour-level budget creation
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'budget-1',
          project_id: 'project-123',
          level: 'tour',
          amount_cents: 1000000,
          notes: 'Tour budget',
          created_by: 'user-123'
        },
        error: null
      })

      const result = await setBudget({
        project_id: 'project-123',
        level: 'tour',
        amount_cents: 1000000,
        notes: 'Tour budget'
      })

      expect(result.success).toBe(true)
      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        project_id: 'project-123',
        level: 'tour',
        amount_cents: 1000000,
        notes: 'Tour budget',
        created_by: 'user-123'
      })
    })

    it('should create a party-level budget', async () => {
      // BUSINESS_RULE: Test party-level budget creation
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'budget-2',
          project_id: 'project-123',
          level: 'party',
          party: 'Artist',
          amount_cents: 500000,
          created_by: 'user-123'
        },
        error: null
      })

      const result = await setBudget({
        project_id: 'project-123',
        level: 'party',
        party: 'Artist',
        amount_cents: 500000
      })

      expect(result.success).toBe(true)
      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        project_id: 'project-123',
        level: 'party',
        party: 'Artist',
        amount_cents: 500000,
        created_by: 'user-123'
      })
    })

    it('should create a person-level budget', async () => {
      // BUSINESS_RULE: Test person-level budget creation
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'budget-3',
          project_id: 'project-123',
          level: 'person',
          passenger_id: 'person-123',
          amount_cents: 250000,
          created_by: 'user-123'
        },
        error: null
      })

      const result = await setBudget({
        project_id: 'project-123',
        level: 'person',
        passenger_id: 'person-123',
        amount_cents: 250000
      })

      expect(result.success).toBe(true)
      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        project_id: 'project-123',
        level: 'person',
        passenger_id: 'person-123',
        amount_cents: 250000,
        created_by: 'user-123'
      })
    })

    it('should handle authentication errors', async () => {
      // SECURITY: Test authentication requirement
      mockGetServerUser.mockResolvedValue(null)

      const result = await setBudget({
        project_id: 'project-123',
        level: 'tour',
        amount_cents: 1000000
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
    })

    it('should handle employee role validation', async () => {
      // SECURITY: Test employee-only access
      mockUser.role = 'client'
      mockGetServerUser.mockResolvedValue(mockUser)

      const result = await setBudget({
        project_id: 'project-123',
        level: 'tour',
        amount_cents: 1000000
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Employee access required')
    })

    it('should handle database errors', async () => {
      // DATABASE: Test error handling
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Constraint violation' }
      })

      const result = await setBudget({
        project_id: 'project-123',
        level: 'tour',
        amount_cents: 1000000
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Constraint violation')
    })
  })

  describe('getBudgetSnapshot', () => {
    it('should calculate budget snapshot with totals and spend', async () => {
      // CONTEXT: Mock budget and spend data
      const mockBudgets = [
        {
          level: 'tour',
          amount_cents: 1000000
        },
        {
          level: 'party',
          party: 'Artist',
          amount_cents: 500000
        }
      ]

      const mockSpend = {
        confirmed: 300000,
        pending: 100000
      }

      // Mock multiple database calls
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockBudgets, error: null })
        .mockResolvedValueOnce({ data: mockSpend, error: null })

      const result = await getBudgetSnapshot('project-123')

      expect(result.success).toBe(true)
      expect(result.data?.totals.tour).toBe(1000000)
      expect(result.data?.spend.confirmed).toBe(300000)
      expect(result.data?.spend.pending).toBe(100000)
      expect(result.data?.remaining.total).toBe(600000)
    })

    it('should handle missing budget data', async () => {
      // DATABASE: Test empty budget scenario
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await getBudgetSnapshot('project-123')

      expect(result.success).toBe(true)
      expect(result.data?.totals.tour).toBe(0)
      expect(result.data?.spend.confirmed).toBe(0)
      expect(result.data?.remaining.total).toBe(0)
    })

    it('should handle authentication errors', async () => {
      // SECURITY: Test authentication requirement
      mockGetServerUser.mockResolvedValue(null)

      const result = await getBudgetSnapshot('project-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
    })
  })
})
