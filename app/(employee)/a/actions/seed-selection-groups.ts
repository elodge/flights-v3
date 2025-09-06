/**
 * @fileoverview Server action for seeding selection groups from leg passenger assignments
 * 
 * @description Automatically creates selection groups based on leg passenger assignments,
 * splitting individuals and groups according to the is_individual flag.
 * @route N/A (Server action)
 * @access Employees only (agents/admins)
 * @security Role-based authorization required
 * @database Creates selection_groups from leg_passengers data
 */

'use server';

import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// CONTEXT: Validation schema for leg ID
const SeedSelectionGroupsSchema = z.object({
  legId: z.string().uuid('Invalid leg ID')
});

/**
 * Helper function to require employee role authorization
 * 
 * @description Validates that the current user has agent or admin role
 * @param role - User role to validate
 * @security Critical authorization check for employee operations
 * @throws Error if user is not an agent or admin
 */
function requireEmployee(role?: string) {
  if (role !== 'agent' && role !== 'admin') {
    throw new Error('Unauthorized: Agent or admin role required');
  }
}

/**
 * Seed selection groups from leg passenger assignments
 * 
 * @description Automatically creates selection groups by analyzing passenger assignments
 * and splitting them into individuals (is_individual=true) and groups (remainder).
 * Clears existing groups for the leg before creating new ones.
 * @param legId - UUID of the leg to create selection groups for
 * @returns Object with count of created groups
 * @security Requires agent/admin role
 * @database Inserts into selection_groups, deletes existing groups for leg
 * @business_rule Individual passengers get their own group, others grouped together
 * @throws Error if unauthorized or database operation fails
 * @example
 * ```typescript
 * const result = await seedSelectionGroups('leg-123');
 * console.log(`Created ${result.created} groups`);
 * ```
 */
export async function seedSelectionGroups(legId: string) {
  // CONTEXT: Validate input parameters
  const { legId: validatedLegId } = SeedSelectionGroupsSchema.parse({ legId });

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

  // CONTEXT: Get leg information for labeling
  const { data: leg, error: legError } = await supabase
    .from('legs')
    .select('origin_city, destination_city, label')
    .eq('id', validatedLegId)
    .single();

  if (legError || !leg) {
    throw new Error('Leg not found or not accessible');
  }

  // DATABASE: Load passengers for leg with their personnel details
  const { data: passengers, error: passengersError } = await supabase
    .from('leg_passengers')
    .select(`
      id,
      passenger_id,
      is_individual,
      tour_personnel!inner(
        id,
        full_name
      )
    `)
    .eq('leg_id', validatedLegId);

  if (passengersError) {
    throw new Error(`Failed to load passengers: ${passengersError.message}`);
  }

  if (!passengers || passengers.length === 0) {
    throw new Error('No passengers assigned to this leg');
  }

  // CONTEXT: Split passengers into individuals and group
  const individuals = passengers.filter(p => p.is_individual);
  const grouped = passengers.filter(p => !p.is_individual);

  // BUSINESS_RULE: Clear existing selection groups for this leg before creating new ones
  const { error: deleteError } = await supabase
    .from('selection_groups')
    .delete()
    .eq('leg_id', validatedLegId);

  if (deleteError) {
    throw new Error(`Failed to clear existing groups: ${deleteError.message}`);
  }

  let createdCount = 0;

  // CONTEXT: Create individual selection groups
  for (const passenger of individuals) {
    const { error: individualError } = await supabase
      .from('selection_groups')
      .insert({
        leg_id: validatedLegId,
        type: 'individual',
        passenger_ids: [passenger.passenger_id],
        label: `${passenger.tour_personnel.full_name} — ${leg.origin_city || 'Origin'} → ${leg.destination_city || 'Destination'}`
      });

    if (individualError) {
      throw new Error(`Failed to create individual group: ${individualError.message}`);
    }

    createdCount++;
  }

  // CONTEXT: Create group selection group if there are grouped passengers
  if (grouped.length > 0) {
    const groupLabel = leg.label 
      ? `${leg.label} — ${grouped.length} passengers`
      : `${leg.origin_city || 'Origin'} → ${leg.destination_city || 'Destination'} — ${grouped.length} passengers`;

    const { error: groupError } = await supabase
      .from('selection_groups')
      .insert({
        leg_id: validatedLegId,
        type: 'group',
        passenger_ids: grouped.map(p => p.passenger_id),
        label: groupLabel
      });

    if (groupError) {
      throw new Error(`Failed to create group: ${groupError.message}`);
    }

    createdCount++;
  }

  return { 
    success: true,
    created: createdCount,
    details: {
      individuals: individuals.length,
      grouped: grouped.length > 0 ? 1 : 0,
      totalPassengers: passengers.length
    }
  };
}

/**
 * Get existing selection groups for a leg
 * 
 * @description Retrieves current selection groups for a leg with passenger details
 * for display and verification purposes.
 * @param legId - UUID of the leg to get groups for
 * @returns Array of selection groups with passenger information
 * @security Requires agent/admin role
 * @database Queries selection_groups with passenger details
 * @throws Error if unauthorized
 * @example
 * ```typescript
 * const groups = await getSelectionGroupsForLeg('leg-123');
 * ```
 */
export async function getSelectionGroupsForLeg(legId: string) {
  // CONTEXT: Validate input parameters
  const { legId: validatedLegId } = SeedSelectionGroupsSchema.parse({ legId });

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

  // DATABASE: Fetch selection groups with passenger count
  const { data: groups, error } = await supabase
    .from('selection_groups')
    .select('*')
    .eq('leg_id', validatedLegId)
    .order('type', { ascending: true }); // Show groups before individuals

  if (error) {
    throw new Error(`Failed to fetch selection groups: ${error.message}`);
  }

  return groups || [];
}
