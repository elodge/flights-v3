/**
 * @fileoverview Unit tests for seed selection groups server actions
 * 
 * @description Tests the seedSelectionGroups and getSelectionGroupsForLeg server actions
 * to ensure proper business logic, authorization, and error handling.
 * @coverage Covers seedSelectionGroups and getSelectionGroupsForLeg server actions
 * @database Tests selection_groups table operations and leg_passengers queries
 * @security Tests role-based authorization for employee operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedSelectionGroups, getSelectionGroupsForLeg } from '@/app/(employee)/a/actions/seed-selection-groups';

// CONTEXT: Mock Supabase client and authentication
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

// CONTEXT: Mock the Supabase server client
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}));

// CONTEXT: Helper function to create chainable query mock
function createMockQuery(returnValue: any = { data: null, error: null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(returnValue)),
    insert: vi.fn(() => Promise.resolve(returnValue)),
    delete: vi.fn(() => Promise.resolve(returnValue)),
    order: vi.fn(() => query)
  };
  return query;
}

describe('seedSelectionGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    // CONTEXT: Test unauthorized access
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('Unauthorized: User not authenticated');
  });

  it('should require employee role', async () => {
    // CONTEXT: Test insufficient permissions
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'client' }, error: null });
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      return createMockQuery();
    });

    await expect(seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('Unauthorized: Agent or admin role required');
  });

  it('should validate leg ID format', async () => {
    // CONTEXT: Test invalid UUID format
    await expect(seedSelectionGroups('invalid-uuid')).rejects.toThrow('Invalid leg ID');
  });

  it('should handle leg not found', async () => {
    // CONTEXT: Test non-existent leg
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockLegQuery = createMockQuery({ data: null, error: { message: 'Leg not found' } });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'legs') return mockLegQuery;
      return createMockQuery();
    });

    await expect(seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('Leg not found or not accessible');
  });

  it('should handle no passengers assigned', async () => {
    // CONTEXT: Test leg with no passengers
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockLegQuery = createMockQuery({ 
      data: { origin_city: 'LAX', destination_city: 'JFK', label: 'Test Leg' }, 
      error: null 
    });
    const mockPassengersQuery = createMockQuery({ data: [], error: null });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'legs') return mockLegQuery;
      if (table === 'leg_passengers') return mockPassengersQuery;
      return createMockQuery();
    });

    await expect(seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('No passengers assigned to this leg');
  });

  it('should create individual groups only', async () => {
    // CONTEXT: Test all passengers marked as individual
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockLegQuery = createMockQuery({ 
      data: { origin_city: 'LAX', destination_city: 'JFK', label: 'Test Leg' }, 
      error: null 
    });
    const mockPassengersQuery = createMockQuery({ 
      data: [
        { id: 'lp1', passenger_id: 'p1', is_individual: true, tour_personnel: { id: 'p1', full_name: 'John Doe' } },
        { id: 'lp2', passenger_id: 'p2', is_individual: true, tour_personnel: { id: 'p2', full_name: 'Jane Smith' } }
      ], 
      error: null 
    });
    const mockDeleteQuery = createMockQuery({ data: null, error: null });
    const mockInsertQuery = createMockQuery({ data: null, error: null });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'legs') return mockLegQuery;
      if (table === 'leg_passengers') return mockPassengersQuery;
      if (table === 'selection_groups') {
        return {
          delete: vi.fn(() => mockDeleteQuery),
          insert: vi.fn(() => mockInsertQuery)
        };
      }
      return createMockQuery();
    });

    const result = await seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(result).toEqual({
      success: true,
      created: 2,
      details: {
        individuals: 2,
        grouped: 0,
        totalPassengers: 2
      }
    });
  });

  it('should create group only', async () => {
    // CONTEXT: Test all passengers in group
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'admin' }, error: null });
    const mockLegQuery = createMockQuery({ 
      data: { origin_city: 'LAX', destination_city: 'JFK', label: 'Test Leg' }, 
      error: null 
    });
    const mockPassengersQuery = createMockQuery({ 
      data: [
        { id: 'lp1', passenger_id: 'p1', is_individual: false, tour_personnel: { id: 'p1', full_name: 'John Doe' } },
        { id: 'lp2', passenger_id: 'p2', is_individual: false, tour_personnel: { id: 'p2', full_name: 'Jane Smith' } },
        { id: 'lp3', passenger_id: 'p3', is_individual: false, tour_personnel: { id: 'p3', full_name: 'Bob Wilson' } }
      ], 
      error: null 
    });
    const mockDeleteQuery = createMockQuery({ data: null, error: null });
    const mockInsertQuery = createMockQuery({ data: null, error: null });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'legs') return mockLegQuery;
      if (table === 'leg_passengers') return mockPassengersQuery;
      if (table === 'selection_groups') {
        return {
          delete: vi.fn(() => mockDeleteQuery),
          insert: vi.fn(() => mockInsertQuery)
        };
      }
      return createMockQuery();
    });

    const result = await seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(result).toEqual({
      success: true,
      created: 1,
      details: {
        individuals: 0,
        grouped: 1,
        totalPassengers: 3
      }
    });
  });

  it('should create mixed individual and group', async () => {
    // CONTEXT: Test mix of individual and group passengers
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockLegQuery = createMockQuery({ 
      data: { origin_city: 'LAX', destination_city: 'JFK', label: 'Test Leg' }, 
      error: null 
    });
    const mockPassengersQuery = createMockQuery({ 
      data: [
        { id: 'lp1', passenger_id: 'p1', is_individual: true, tour_personnel: { id: 'p1', full_name: 'VIP Person' } },
        { id: 'lp2', passenger_id: 'p2', is_individual: false, tour_personnel: { id: 'p2', full_name: 'Group Member 1' } },
        { id: 'lp3', passenger_id: 'p3', is_individual: false, tour_personnel: { id: 'p3', full_name: 'Group Member 2' } }
      ], 
      error: null 
    });
    const mockDeleteQuery = createMockQuery({ data: null, error: null });
    const mockInsertQuery = createMockQuery({ data: null, error: null });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'legs') return mockLegQuery;
      if (table === 'leg_passengers') return mockPassengersQuery;
      if (table === 'selection_groups') {
        return {
          delete: vi.fn(() => mockDeleteQuery),
          insert: vi.fn(() => mockInsertQuery)
        };
      }
      return createMockQuery();
    });

    const result = await seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(result).toEqual({
      success: true,
      created: 2,
      details: {
        individuals: 1,
        grouped: 1,
        totalPassengers: 3
      }
    });
  });

  it('should handle database errors during deletion', async () => {
    // CONTEXT: Test database error handling
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockLegQuery = createMockQuery({ 
      data: { origin_city: 'LAX', destination_city: 'JFK', label: 'Test Leg' }, 
      error: null 
    });
    const mockPassengersQuery = createMockQuery({ 
      data: [
        { id: 'lp1', passenger_id: 'p1', is_individual: false, tour_personnel: { id: 'p1', full_name: 'John Doe' } }
      ], 
      error: null 
    });
    const mockDeleteQuery = createMockQuery({ data: null, error: { message: 'Database connection failed' } });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'legs') return mockLegQuery;
      if (table === 'leg_passengers') return mockPassengersQuery;
      if (table === 'selection_groups') {
        return {
          delete: vi.fn(() => mockDeleteQuery),
          insert: vi.fn(() => createMockQuery())
        };
      }
      return createMockQuery();
    });

    await expect(seedSelectionGroups('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('Failed to clear existing groups: Database connection failed');
  });
});

describe('getSelectionGroupsForLeg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    // CONTEXT: Test unauthorized access
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getSelectionGroupsForLeg('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('Unauthorized: User not authenticated');
  });

  it('should require employee role', async () => {
    // CONTEXT: Test insufficient permissions
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'client' }, error: null });
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      return createMockQuery();
    });

    await expect(getSelectionGroupsForLeg('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('Unauthorized: Agent or admin role required');
  });

  it('should return selection groups for leg', async () => {
    // CONTEXT: Test successful retrieval
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockGroupsQuery = createMockQuery({ 
      data: [
        { id: 'sg1', type: 'individual', passenger_ids: ['p1'], label: 'VIP Person — LAX → JFK' },
        { id: 'sg2', type: 'group', passenger_ids: ['p2', 'p3'], label: 'Test Leg — 2 passengers' }
      ], 
      error: null 
    });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'selection_groups') return mockGroupsQuery;
      return createMockQuery();
    });

    const result = await getSelectionGroupsForLeg('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'sg1',
      type: 'individual',
      passenger_ids: ['p1'],
      label: 'VIP Person — LAX → JFK'
    });
    expect(result[1]).toMatchObject({
      id: 'sg2',
      type: 'group',
      passenger_ids: ['p2', 'p3'],
      label: 'Test Leg — 2 passengers'
    });
  });

  it('should handle database errors', async () => {
    // CONTEXT: Test database error handling
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockGroupsQuery = createMockQuery({ 
      data: null, 
      error: { message: 'Database connection failed' } 
    });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'selection_groups') return mockGroupsQuery;
      return createMockQuery();
    });

    await expect(getSelectionGroupsForLeg('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).rejects.toThrow('Failed to fetch selection groups: Database connection failed');
  });

  it('should return empty array when no groups exist', async () => {
    // CONTEXT: Test empty results
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: { id: 'user-123' } } 
    });
    
    const mockUserQuery = createMockQuery({ data: { role: 'agent' }, error: null });
    const mockGroupsQuery = createMockQuery({ data: [], error: null });
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockUserQuery;
      if (table === 'selection_groups') return mockGroupsQuery;
      return createMockQuery();
    });

    const result = await getSelectionGroupsForLeg('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(result).toEqual([]);
  });
});
