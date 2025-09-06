/**
 * @fileoverview Unit tests for personnel deletion functionality
 * 
 * @description Tests the deleteTourPerson server action and related components
 * @coverage Server action authorization, error handling, and UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteTourPerson } from '@/app/(admin)/admin/users/_actions/delete-personnel';

// CONTEXT: Mock Supabase server client
const createMockQuery = () => {
  const mockQuery = {
    eq: vi.fn(() => mockQuery),
    single: vi.fn()
  };
  return mockQuery;
};

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => createMockQuery()),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
};

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}));

describe('deleteTourPerson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully delete person for admin user', async () => {
    // CONTEXT: Mock authenticated admin user
    const mockUser = { id: 'user-123' };
    const mockUserData = { role: 'admin' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockQuery = createMockQuery();
    mockQuery.single.mockResolvedValue({
      data: mockUserData,
      error: null
    });

    mockSupabaseClient.from().delete().eq.mockResolvedValue({
      error: null
    });

    const result = await deleteTourPerson('550e8400-e29b-41d4-a716-446655440000');

    expect(result).toEqual({ success: true });
    expect(mockSupabaseClient.from().delete().eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
  });

  it('should successfully delete person for agent user', async () => {
    // CONTEXT: Mock authenticated agent user
    const mockUser = { id: 'user-456' };
    const mockUserData = { role: 'agent' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockQuery = createMockQuery();
    mockQuery.single.mockResolvedValue({
      data: mockUserData,
      error: null
    });

    mockSupabaseClient.from().delete().eq.mockResolvedValue({
      error: null
    });

    const result = await deleteTourPerson('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toEqual({ success: true });
    expect(mockSupabaseClient.from().delete().eq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440001');
  });

  it('should reject unauthorized user (not authenticated)', async () => {
    // CONTEXT: Mock unauthenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    await expect(deleteTourPerson('550e8400-e29b-41d4-a716-446655440000'))
      .rejects
      .toThrow('Unauthorized: User not authenticated');
  });

  it('should reject client role user', async () => {
    // CONTEXT: Mock authenticated client user
    const mockUser = { id: 'user-789' };
    const mockUserData = { role: 'client' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockQuery = createMockQuery();
    mockQuery.single.mockResolvedValue({
      data: mockUserData,
      error: null
    });

    await expect(deleteTourPerson('550e8400-e29b-41d4-a716-446655440000'))
      .rejects
      .toThrow('Unauthorized: Insufficient permissions. Agent or admin role required.');
  });

  it('should reject invalid UUID format', async () => {
    // CONTEXT: Mock authenticated admin user
    const mockUser = { id: 'user-123' };
    const mockUserData = { role: 'admin' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.from().select().eq().single.mockResolvedValue({
      data: mockUserData,
      error: null
    });

    await expect(deleteTourPerson('invalid-uuid'))
      .rejects
      .toThrow('Invalid person ID format');
  });

  it('should handle database error during deletion', async () => {
    // CONTEXT: Mock authenticated admin user with database error
    const mockUser = { id: 'user-123' };
    const mockUserData = { role: 'admin' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockQuery = createMockQuery();
    mockQuery.single.mockResolvedValue({
      data: mockUserData,
      error: null
    });

    mockSupabaseClient.from().delete().eq.mockResolvedValue({
      error: { message: 'Database constraint violation' }
    });

    await expect(deleteTourPerson('550e8400-e29b-41d4-a716-446655440000'))
      .rejects
      .toThrow('Failed to delete person: Database constraint violation');
  });

  it('should handle user role lookup error', async () => {
    // CONTEXT: Mock authenticated user with role lookup error
    const mockUser = { id: 'user-123' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const mockQuery = createMockQuery();
    mockQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'User not found' }
    });

    await expect(deleteTourPerson('550e8400-e29b-41d4-a716-446655440000'))
      .rejects
      .toThrow('Failed to verify user permissions: User not found');
  });
});
