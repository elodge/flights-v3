/**
 * @fileoverview Unit tests for personnel server actions
 * 
 * @description Tests server actions for adding and updating tour personnel
 * @coverage Authentication, validation, database operations, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addTourPerson, updateTourPerson } from '../personnel';

// Mock dependencies
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn()
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis()
};

describe('Personnel Server Actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup default mocks
    const { createServerClient } = await import('@/lib/supabase-server');
    vi.mocked(createServerClient).mockResolvedValue(mockSupabaseClient as any);
    
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
  });

  describe('addTourPerson', () => {
    it('should successfully add a new person', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'agent' }
      });

      // Mock insert operation
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'new-person-id' },
        error: null
      });

      const result = await addTourPerson('project-123', {
        full_name: 'John Doe',
        party: 'A Party',
        email: 'john@example.com'
      });

      expect(result).toEqual({ id: 'new-person-id' });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tour_personnel');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([{
        project_id: 'project-123',
        full_name: 'John Doe',
        party: 'A Party',
        email: 'john@example.com',
        phone: null,
        seat_pref: null,
        ff_numbers: null,
        notes: null,
        created_by: 'user-123'
      }]);
    });

    it('should reject unauthorized users', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query with client role
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'client' }
      });

      const result = await addTourPerson('project-123', {
        full_name: 'John Doe',
        party: 'A Party'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized: employee role required');
    });

    it('should handle validation errors', async () => {
      const result = await addTourPerson('project-123', {
        full_name: 'Jo', // Too short
        party: 'A Party'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Full name must be at least 3 characters');
    });

    it('should handle database errors', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'agent' }
      });

      // Mock insert operation with error
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await addTourPerson('project-123', {
        full_name: 'John Doe',
        party: 'A Party'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should normalize name by collapsing spaces', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'agent' }
      });

      // Mock insert operation
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'new-person-id' },
        error: null
      });

      await addTourPerson('project-123', {
        full_name: '  John   Doe  ',
        party: 'A Party'
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([{
        project_id: 'project-123',
        full_name: 'John Doe', // Should be normalized
        party: 'A Party',
        email: null,
        phone: null,
        seat_pref: null,
        ff_numbers: null,
        notes: null,
        created_by: 'user-123'
      }]);
    });
  });

  describe('updateTourPerson', () => {
    it('should successfully update a person', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'agent' }
      });

      // Mock update operation
      mockQueryBuilder.eq.mockResolvedValue({
        error: null
      });

      // Mock project_id query for revalidation
      mockQueryBuilder.single.mockResolvedValue({
        data: { project_id: 'project-123' }
      });

      const result = await updateTourPerson('person-123', {
        full_name: 'John Updated',
        status: 'inactive'
      });

      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tour_personnel');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        full_name: 'John Updated',
        status: 'inactive',
        updated_at: expect.any(String)
      });
    });

    it('should handle partial updates', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'agent' }
      });

      // Mock update operation
      mockQueryBuilder.eq.mockResolvedValue({
        error: null
      });

      // Mock project_id query for revalidation
      mockQueryBuilder.single.mockResolvedValue({
        data: { project_id: 'project-123' }
      });

      const result = await updateTourPerson('person-123', {
        status: 'inactive'
      });

      expect(result).toEqual({ success: true });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'inactive',
        updated_at: expect.any(String)
      });
    });

    it('should reject unauthorized users', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query with client role
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'client' }
      });

      const result = await updateTourPerson('person-123', {
        full_name: 'John Updated'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized: employee role required');
    });

    it('should handle validation errors', async () => {
      const result = await updateTourPerson('person-123', {
        full_name: 'Jo' // Too short
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Full name must be at least 3 characters');
    });

    it('should handle database errors', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'agent' }
      });

      // Mock update operation with error
      mockQueryBuilder.eq.mockResolvedValue({
        error: { message: 'Update failed' }
      });

      const result = await updateTourPerson('person-123', {
        full_name: 'John Updated'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should normalize name by collapsing spaces', async () => {
      // Mock authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock user profile query
      mockQueryBuilder.single.mockResolvedValue({
        data: { role: 'agent' }
      });

      // Mock update operation
      mockQueryBuilder.eq.mockResolvedValue({
        error: null
      });

      // Mock project_id query for revalidation
      mockQueryBuilder.single.mockResolvedValue({
        data: { project_id: 'project-123' }
      });

      await updateTourPerson('person-123', {
        full_name: '  John   Updated  '
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        full_name: 'John Updated', // Should be normalized
        updated_at: expect.any(String)
      });
    });
  });
});
