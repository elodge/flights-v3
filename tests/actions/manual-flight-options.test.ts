/**
 * @fileoverview Unit tests for manual flight option server actions
 * 
 * @description Tests for createManualFlightOption server action including
 * validation, authentication, and database operations.
 * 
 * @coverage Manual flight option creation, validation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createManualFlightOption } from '@/lib/actions/manual-flight-options';

// Mock Supabase with proper method chaining
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

// Create mock methods that return the proper chain
const createMockChain = (finalResult: any) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(finalResult),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(finalResult),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({}),
  }),
});

mockSupabase.from.mockImplementation((table: string) => {
  if (table === 'users') {
    return createMockChain({ data: { role: 'agent' } });
  } else if (table === 'options') {
    return createMockChain({ data: { id: 'option-uuid' } });
  } else if (table === 'option_components') {
    return createMockChain({});
  }
  return createMockChain({});
});

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => mockSupabase,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({}),
}));

describe('Manual Flight Option Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementation
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return createMockChain({ data: { role: 'agent' } });
      } else if (table === 'options') {
        return createMockChain({ data: { id: 'option-uuid' } });
      } else if (table === 'option_components') {
        return createMockChain({});
      }
      return createMockChain({});
    });
  });

  describe('createManualFlightOption', () => {
    const validInput = {
      leg_id: 'leg-uuid',
      name: 'UA123 AMS-PHL',
      description: 'Test flight option',
      class_of_service: 'Economy',
      seats_available: 8,
      price_total: 500.00,
      price_currency: 'USD',
      hold_expires_at: '2024-12-25T10:00:00Z',
      notes: 'Test notes',
      recommended: true,
      segments: [
        {
          airline_iata: 'UA',
          airline_name: 'United Airlines',
          flight_number: '123',
          dep_iata: 'AMS',
          arr_iata: 'PHL',
          dep_time_local: '2024-01-15T14:30:00+01:00',
          arr_time_local: '2024-01-15T16:45:00-05:00',
          day_offset: 0,
          duration_minutes: 135,
          stops: 0,
          enriched_terminal_gate: {
            dep_terminal: '1',
            dep_gate: 'B12',
            arr_terminal: 'A',
            arr_gate: 'A15',
          },
        },
      ],
      is_split: false,
    };

    it('should create manual flight option successfully', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
      });

      const result = await createManualFlightOption(validInput);

      expect(result).toEqual({ id: 'option-uuid' });
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from).toHaveBeenCalledWith('options');
      expect(mockSupabase.from).toHaveBeenCalledWith('option_components');
    });

    it('should reject unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await expect(createManualFlightOption(validInput)).rejects.toThrow('Unauthorized: User not authenticated');
    });

    it('should reject users without agent/admin role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
      });

      // Mock user with client role
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return createMockChain({ data: { role: 'client' } });
        }
        return createMockChain({});
      });

      await expect(createManualFlightOption(validInput)).rejects.toThrow('Unauthorized: Insufficient permissions');
    });

    it('should reject missing leg_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
      });


      const invalidInput = { ...validInput, leg_id: '' };

      await expect(createManualFlightOption(invalidInput)).rejects.toThrow('Missing required fields: leg_id and segments');
    });

    it('should reject empty segments array', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
      });


      const invalidInput = { ...validInput, segments: [] };

      await expect(createManualFlightOption(invalidInput)).rejects.toThrow('Missing required fields: leg_id and segments');
    });

    it('should reject missing option name', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
      });


      const invalidInput = { ...validInput, name: '' };

      await expect(createManualFlightOption(invalidInput)).rejects.toThrow('Option name is required');
    });

    it('should reject segments with missing required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
      });


      const invalidInput = {
        ...validInput,
        segments: [
          {
            airline_iata: 'UA',
            flight_number: '', // Missing required field
            dep_iata: 'AMS',
            arr_iata: 'PHL',
            dep_time_local: '2024-01-15T14:30:00+01:00',
            arr_time_local: '2024-01-15T16:45:00-05:00',
          },
        ],
      };

      await expect(createManualFlightOption(invalidInput)).rejects.toThrow('Segment 1 missing required fields');
    });

    it('should handle multiple segments correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
      });

      const multiSegmentInput = {
        ...validInput,
        segments: [
          {
            airline_iata: 'UA',
            flight_number: '123',
            dep_iata: 'AMS',
            arr_iata: 'PHL',
            dep_time_local: '2024-01-15T14:30:00+01:00',
            arr_time_local: '2024-01-15T16:45:00-05:00',
          },
          {
            airline_iata: 'UA',
            flight_number: '456',
            dep_iata: 'PHL',
            arr_iata: 'LAX',
            dep_time_local: '2024-01-15T18:00:00-05:00',
            arr_time_local: '2024-01-15T20:30:00-08:00',
          },
        ],
      };

      const result = await createManualFlightOption(multiSegmentInput);

      expect(result).toEqual({ id: 'option-uuid' });
      expect(mockSupabase.from).toHaveBeenCalledWith('option_components');
    });
  });
});
