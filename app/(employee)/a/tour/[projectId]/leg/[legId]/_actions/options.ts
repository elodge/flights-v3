/**
 * @fileoverview Server actions for manual flight option creation
 * 
 * @description Server-side actions for creating manual flight options with segments.
 * Handles authentication, validation, and database operations for manual flight option entry.
 * 
 * @access Employee only (agent/admin)
 * @security Role-based access control enforced
 * @database Creates records in options and option_components tables
 * @business_rule Manual options can have multiple segments with enrichment data
 */

'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';

export type SegmentInput = {
  airline_iata: string;
  airline_name?: string | null;
  flight_number: string;
  dep_iata: string;
  arr_iata: string;
  dep_time_local: string; // ISO string in local time
  arr_time_local: string; // ISO string in local time
  day_offset?: number;
  duration_minutes?: number | null;
  enriched_terminal_gate?: {
    dep_terminal?: string | null;
    dep_gate?: string | null;
    arr_terminal?: string | null;
    arr_gate?: string | null;
  } | null;
  stops?: number | null;
};

export type CreateManualOptionInput = {
  leg_id: string;
  name: string;
  description?: string | null;
  class_of_service?: string | null;
  seats_available?: number | null;
  price_total?: number | null;
  price_currency?: string | null;
  hold_expires_at?: string | null; // ISO
  notes?: string | null;
  recommended?: boolean;
  segments: SegmentInput[];
  is_split?: boolean;
};

/**
 * Creates a manual flight option with segments
 * 
 * @description Creates a new flight option with manual entry data and associated segments.
 * Validates user permissions, input data, and creates database records in a transaction.
 * 
 * @param input - Flight option and segment data
 * @returns Promise with created option ID
 * @throws Error if validation fails or database operation fails
 * 
 * @security Requires agent or admin role
 * @database Inserts into options and option_components tables
 * @business_rule Segments are ordered by component_order field
 * 
 * @example
 * ```typescript
 * const result = await createManualFlightOption({
 *   leg_id: 'leg-uuid',
 *   name: 'UA123 AMS-PHL',
 *   segments: [{
 *     airline_iata: 'UA',
 *     flight_number: '123',
 *     dep_iata: 'AMS',
 *     arr_iata: 'PHL',
 *     dep_time_local: '2024-01-15T14:30:00+01:00',
 *     arr_time_local: '2024-01-15T16:45:00-05:00'
 *   }]
 * });
 * ```
 */
export async function createManualFlightOption(input: CreateManualOptionInput) {
  const supabase = await createServerClient();

  // CONTEXT: Authentication and authorization check
  // SECURITY: Only agents and admins can create manual options
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!userProfile || (userProfile.role !== 'agent' && userProfile.role !== 'admin')) {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  // CONTEXT: Input validation
  // BUSINESS_RULE: Must have leg_id and at least one segment
  if (!input.leg_id || !input.segments?.length) {
    throw new Error('Missing required fields: leg_id and segments');
  }

  if (!input.name?.trim()) {
    throw new Error('Option name is required');
  }

  // CONTEXT: Validate each segment has required fields
  // BUSINESS_RULE: Each segment needs airline, flight number, and airports
  input.segments.forEach((segment, idx) => {
    if (!segment.airline_iata?.trim() || !segment.flight_number?.trim() || 
        !segment.dep_iata?.trim() || !segment.arr_iata?.trim() ||
        !segment.dep_time_local || !segment.arr_time_local) {
      throw new Error(`Segment ${idx + 1} missing required fields`);
    }
  });

  try {
    // CONTEXT: Create flight option record
    // DATABASE: Insert into options table with manual source
    const { data: option, error: optionError } = await supabase
      .from('options')
      .insert({
        leg_id: input.leg_id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        source: 'manual',
        class_of_service: input.class_of_service || null,
        seats_available: input.seats_available || null,
        price_total: input.price_total || null,
        price_currency: input.price_currency || 'USD',
        expires_at: input.hold_expires_at || null, // Using expires_at for hold_expires_at
        notes: input.notes?.trim() || null,
        is_recommended: !!input.recommended,
        is_split: !!input.is_split,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (optionError) {
      throw new Error(`Failed to create option: ${optionError.message}`);
    }

    // CONTEXT: Create segment components
    // DATABASE: Insert into option_components table with proper ordering
    const segmentRows = input.segments.map((segment, order) => ({
      option_id: option.id,
      component_order: order + 1,
      navitas_text: `${segment.airline_iata}${segment.flight_number} ${segment.dep_iata}-${segment.arr_iata}`,
      flight_number: segment.flight_number.trim(),
      airline: segment.airline_iata.toUpperCase(),
      airline_iata: segment.airline_iata.toUpperCase(),
      airline_name: segment.airline_name?.trim() || null,
      dep_iata: segment.dep_iata.toUpperCase(),
      arr_iata: segment.arr_iata.toUpperCase(),
      departure_time: segment.dep_time_local,
      arrival_time: segment.arr_time_local,
      dep_time_local: segment.dep_time_local,
      arr_time_local: segment.arr_time_local,
      day_offset: segment.day_offset || 0,
      duration_minutes: segment.duration_minutes || null,
      stops: segment.stops || 0,
      enriched_terminal_gate: segment.enriched_terminal_gate || null,
    }));

    const { error: segmentsError } = await supabase
      .from('option_components')
      .insert(segmentRows);

    if (segmentsError) {
      // CONTEXT: Rollback option creation if segments fail
      // FALLBACK: Clean up partial data on error
      await supabase.from('options').delete().eq('id', option.id);
      throw new Error(`Failed to create segments: ${segmentsError.message}`);
    }

    return { id: option.id };
  } catch (error) {
    console.error('Error creating manual flight option:', error);
    throw error;
  }
}


