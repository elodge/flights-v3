/**
 * @fileoverview Admin User Management Tests
 * 
 * @description Unit and integration tests for admin user management functionality
 * including user search, invite creation, and user profile updates.
 * 
 * @coverage Tests admin server actions, user management UI, and invite system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminSearchUsers, adminCreateInvite, adminUpdateUserProfile } from '@/app/(admin)/admin/users/_actions/user-actions'

// Mock Supabase client with proper chaining
const createMockQuery = () => {
  const mockQuery = {
    or: vi.fn(() => mockQuery),
    eq: vi.fn(() => mockQuery),
    order: vi.fn(() => mockQuery),
    range: vi.fn(() => ({ data: [], count: 0, error: null }))
  }
  return mockQuery
}

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => createMockQuery()),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ data: [{ token: 'test-token', expires_at: '2024-01-13T00:00:00Z' }], error: null })) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))
  })),
  rpc: vi.fn(() => ({ data: [{ token: 'test-token', expires_at: '2024-01-13T00:00:00Z' }], error: null })),
  auth: {
    admin: {
      inviteUserByEmail: vi.fn(() => ({ data: { user: { id: 'new-user-id' } }, error: null }))
    }
  }
}

// Mock auth functions
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}))

vi.mock('@/lib/supabase', () => ({
  createAdminClient: vi.fn(() => mockSupabaseClient)
}))

vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn(() => Promise.resolve({
    user: { id: 'admin-user-id' },
    role: 'admin'
  }))
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('Admin User Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('adminSearchUsers', () => {
    it('should search users with filters', async () => {
      const result = await adminSearchUsers({
        q: 'test@example.com',
        role: 'client',
        status: 'active',
        page: 1,
        limit: 20
      })

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 20
      })
    })

    it('should handle search without filters', async () => {
      const result = await adminSearchUsers({
        page: 1,
        limit: 20
      })

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 20
      })
    })
  })

  describe('adminCreateInvite', () => {
    it('should create invite for client with artist assignments', async () => {
      const result = await adminCreateInvite({
        email: 'client@example.com',
        role: 'client',
        artistIds: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001']
      })

      expect(result).toEqual({
        success: true,
        message: 'Invite email sent successfully to client@example.com',
        userId: 'new-user-id',
        email: 'client@example.com'
      })
    })

    it('should create invite for agent without artist assignments', async () => {
      const result = await adminCreateInvite({
        email: 'agent@example.com',
        role: 'agent',
        artistIds: []
      })

      expect(result).toEqual({
        success: true,
        message: 'Invite email sent successfully to agent@example.com',
        userId: 'new-user-id',
        email: 'agent@example.com'
      })
    })
  })

  describe('adminUpdateUserProfile', () => {
    it('should update user profile information', async () => {
      const result = await adminUpdateUserProfile({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        fullName: 'Updated Name',
        email: 'updated@example.com',
        role: 'agent',
        status: 'active'
      })

      expect(result).toEqual({ success: true })
    })

    it('should handle role elevation', async () => {
      const result = await adminUpdateUserProfile({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        fullName: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active'
      })

      expect(result).toEqual({ success: true })
    })
  })
})
