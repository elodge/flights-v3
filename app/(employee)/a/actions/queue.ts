/**
 * @fileoverview Server actions for employee booking queue management
 * 
 * @description Handles agent operations for holds, ticketing, and queue management.
 * Includes role-based authorization and business logic for booking workflow.
 * @route N/A (Server actions)
 * @access Agents and admins only
 * @security Role-based authorization required for all operations
 * @database holds, ticketings, booking_documents, client_selections
 */

'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

/**
 * Helper function to require employee role authorization
 * 
 * @description Validates that the current user has agent or admin role
 * @param role - User role to validate
 * @security Critical authorization check for all employee operations
 * @throws Error if user is not an agent or admin
 */
function requireEmployee(role?: string) {
  if (role !== 'agent' && role !== 'admin') {
    throw new Error('Unauthorized: Agent or admin role required');
  }
}

// CONTEXT: Validation schemas for booking operations
const PlaceHoldSchema = z.object({
  optionId: z.string().uuid('Invalid option ID'),
  legId: z.string().uuid('Invalid leg ID'),
  passengerId: z.string().uuid('Invalid passenger ID'),
  hours: z.number().min(1).max(72).default(24)
});

const MarkTicketedSchema = z.object({
  optionId: z.string().uuid('Invalid option ID'),
  legId: z.string().uuid('Invalid leg ID'),
  passengerId: z.string().uuid('Invalid passenger ID'),
  pnr: z.string().length(6, 'PNR must be exactly 6 characters'),
  pricePaid: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().default('USD')
});

/**
 * Place a hold on a flight option
 * 
 * @description Creates a time-limited hold on a flight option to secure pricing
 * and availability. Holds cannot be extended once placed.
 * @param optionId - UUID of the flight option to hold
 * @param legId - UUID of the leg containing the option
 * @param passengerId - UUID of the passenger for the hold
 * @param hours - Number of hours for the hold (default 24, max 72)
 * @returns Hold details with expiration time
 * @security Requires agent/admin role
 * @database Inserts into holds table
 * @business_rule Holds expire automatically, no extensions allowed
 * @throws Error if unauthorized or database operation fails
 * @example
 * ```typescript
 * const hold = await placeHold('option-123', 'leg-456', 'passenger-789', 24);
 * console.log('Hold expires at:', hold.expires_at);
 * ```
 */
export async function placeHold(optionId: string, legId: string, passengerId: string, hours: number = 24) {
  // CONTEXT: Validate input parameters
  const { optionId: validatedOptionId, legId: validatedLegId, passengerId: validatedPassengerId, hours: validatedHours } = 
    PlaceHoldSchema.parse({ optionId, legId, passengerId, hours });

  // SECURITY: Create authenticated Supabase client and verify role
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  requireEmployee(me?.role);

  // CONTEXT: Calculate hold expiration time
  const expiresAt = new Date(Date.now() + validatedHours * 3600 * 1000).toISOString();

  // DATABASE: Insert hold record
  // CONTEXT: holds table only has option_id and passenger_id, not leg_id
  const { error } = await supabase
    .from('holds')
    .insert({
      option_id: validatedOptionId,
      passenger_id: validatedPassengerId,
      created_by: user.id,
      expires_at: expiresAt
    });

  if (error) {
    throw new Error(`Failed to place hold: ${error.message}`);
  }

  // CONTEXT: Trigger notification event for hold expiring
  // DATABASE: notification_events table exists but not in generated types
  try {
    await (supabase as any)
      .from('notification_events')
      .insert({
        type: 'hold_expiring',
        severity: 'warning',
        title: 'Hold Placed',
        body: `Hold placed on option expiring at ${expiresAt}`,
        leg_id: validatedLegId,
        actor_user_id: user.id
      });
  } catch (notificationError) {
    // FALLBACK: Don't fail the hold if notification fails
    console.warn('Failed to create hold notification:', notificationError);
  }

  return { success: true, expires_at: expiresAt };
}

/**
 * Mark passengers as ticketed for a flight option
 * 
 * @description Records ticketing information for passengers and deactivates
 * their selections. Enforces one passenger per PNR business rule.
 * @param params - Ticketing parameters including passenger, PNR, and pricing
 * @returns Success indicator
 * @security Requires agent/admin role
 * @database Inserts into ticketings, calls deactivate function
 * @business_rule One passenger per PNR, unique per leg+passenger
 * @throws Error if unauthorized, duplicate ticketing, or database operation fails
 * @example
 * ```typescript
 * await markTicketed({
 *   optionId: 'option-123',
 *   legId: 'leg-456', 
 *   passengerId: 'passenger-789',
 *   pnr: 'ABC123',
 *   pricePaid: 500.00,
 *   currency: 'USD'
 * });
 * ```
 */
export async function markTicketed({
  optionId,
  legId,
  passengerId,
  pnr,
  pricePaid,
  currency = 'USD'
}: {
  optionId: string;
  legId: string;
  passengerId: string;
  pnr: string;
  pricePaid: number;
  currency?: string;
}) {
  // CONTEXT: Validate input parameters
  const validated = MarkTicketedSchema.parse({
    optionId,
    legId,
    passengerId,
    pnr: pnr.toUpperCase(), // Normalize PNR to uppercase
    pricePaid,
    currency
  });

  // SECURITY: Create authenticated Supabase client and verify role
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  requireEmployee(me?.role);

  // DATABASE: Insert ticketing record (unique constraint prevents double-ticketing)
  // CONTEXT: ticketings table exists but not in generated types
  const { error: ticketingError } = await (supabase as any)
    .from('ticketings')
    .insert({
      option_id: validated.optionId,
      leg_id: validated.legId,
      passenger_id: validated.passengerId,
      pnr: validated.pnr,
      price_paid: validated.pricePaid,
      currency: validated.currency,
      ticketed_by: user.id
    });

  if (ticketingError) {
    if (ticketingError.code === '23505') { // Unique constraint violation
      throw new Error('Passenger is already ticketed for this leg');
    }
    throw new Error(`Failed to create ticketing record: ${ticketingError.message}`);
  }

  // BUSINESS_RULE: Deactivate selection for group containing this passenger
  // DATABASE: deactivate_selection_for_passenger RPC exists but not in generated types
  try {
    const { error: deactivateError } = await (supabase as any)
      .rpc('deactivate_selection_for_passenger', {
        p_leg_id: validated.legId,
        p_passenger_id: validated.passengerId
      });

    if (deactivateError) {
      console.warn('Failed to deactivate selection:', deactivateError);
      // Don't fail the ticketing operation for this
    }
  } catch (deactivateError) {
    console.warn('Error calling deactivate function:', deactivateError);
  }

  return { success: true };
}

/**
 * Get booking queue items for employee dashboard
 * 
 * @description Retrieves active client selections with hold status, ticketing progress,
 * and sorting for agent prioritization.
 * @param artistId - Optional filter by artist ID
 * @returns Array of queue items with selection, hold, and ticketing details
 * @security Requires agent/admin role
 * @database Complex query across multiple tables
 * @business_rule Sorted by urgency: expiring holds, departure time, creation time
 * @throws Error if unauthorized
 * @example
 * ```typescript
 * const queueItems = await getBookingQueue('artist-123');
 * ```
 */
export async function getBookingQueue(artistId?: string) {
  // SECURITY: Create authenticated Supabase client and verify role
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  requireEmployee(me?.role);

  // DATABASE: Complex query for booking queue data using client_selections
  // CONTEXT: client_selections table exists but not in generated types
  let query = (supabase as any)
    .from('client_selections')
    .select(`
      *,
      selection_groups!inner(
        id,
        label,
        type,
        passenger_ids,
        leg_id,
        legs!inner(
          id,
          label,
          origin_city,
          destination_city,
          departure_date,
          project_id,
          projects!inner(
            id,
            name,
            artist_id,
            artists!inner(id, name)
          )
        )
      ),
      options!inner(
        id,
        name,
        description,
        price_total,
        price_currency,
        segments,
        is_split
      )
    `)
    .eq('is_active', true);

  // CONTEXT: Apply artist filter if provided
  if (artistId) {
    query = query.eq('selection_groups.legs.projects.artist_id', artistId);
  }

  const { data: selections, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch booking queue: ${error.message}`);
  }

  if (!selections) {
    return [];
  }

  // CONTEXT: Fetch hold information for each option
  const optionIds = selections.map((s: any) => s.option_id);
  const { data: holds } = await supabase
    .from('holds')
    .select('*')
    .in('option_id', optionIds)
    .gt('expires_at', new Date().toISOString());

  // CONTEXT: Fetch ticketing progress for each leg
  const legIds = [...new Set(selections.map((s: any) => s.selection_groups?.leg_id).filter(Boolean))];
  const { data: ticketings } = await (supabase as any)
    .from('ticketings')
    .select('leg_id, passenger_id, option_id')
    .in('leg_id', legIds);

  // CONTEXT: Enrich selections with hold and ticketing data
  const enrichedItems = selections.map((selection: any) => {
    const hold = holds?.find(h => h.option_id === selection.option_id);
    const groupTicketings = ticketings?.filter((t: any) => 
      t.leg_id === selection.selection_groups?.leg_id &&
      selection.selection_groups?.passenger_ids?.includes(t.passenger_id)
    ) || [];

    return {
      ...selection,
      hold,
      ticketed_count: groupTicketings.length,
      total_passengers: selection.selection_groups?.passenger_ids?.length || 0
    };
  });

  // BUSINESS_RULE: Sort by priority (expiring holds first, then departure date, then creation time)
  enrichedItems.sort((a: any, b: any) => {
    // Priority 1: Items with expiring holds (soonest first)
    if (a.hold && b.hold) {
      return new Date(a.hold.expires_at).getTime() - new Date(b.hold.expires_at).getTime();
    }
    if (a.hold && !b.hold) return -1;
    if (!a.hold && b.hold) return 1;

    // Priority 2: Departure date (soonest first)
    const aDate = a.selection_groups?.legs?.departure_date;
    const bDate = b.selection_groups?.legs?.departure_date;
    if (aDate && bDate) {
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    }
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;

    // Priority 3: Creation time (oldest first)
    return new Date(a.selected_at).getTime() - new Date(b.selected_at).getTime();
  });

  return enrichedItems;
}
