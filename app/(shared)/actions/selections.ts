/**
 * @fileoverview Server actions for client selection persistence
 * 
 * @description Handles client flight option selections with group-based persistence.
 * Ensures one active selection per group and captures price snapshots.
 * @route N/A (Server actions)
 * @access Clients can create selections for their assigned artists
 * @security RLS enforced, requires authentication
 * @database client_selections, selection_groups, options, notification_events
 */

'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// CONTEXT: Validation schema for selection creation
const SelectOptionSchema = z.object({
  selectionGroupId: z.string().uuid('Invalid selection group ID'),
  optionId: z.string().uuid('Invalid option ID')
});

/**
 * Client makes a flight option choice for a selection group
 * 
 * @description Deactivates any previous selection for the group and creates a new
 * active selection with price snapshot. Triggers client_selection notification.
 * @param selectionGroupId - UUID of the selection group making the choice
 * @param optionId - UUID of the flight option being selected
 * @returns Success indicator
 * @security Requires client authentication and artist access permissions
 * @database Inserts into client_selections, deactivates previous selections
 * @business_rule One active selection per group, captures price at selection time
 * @throws Error if unauthorized, option not found, or database operation fails
 * @example
 * ```typescript
 * await selectOptionForGroup('group-123', 'option-456');
 * ```
 */
export async function selectOptionForGroup(selectionGroupId: string, optionId: string) {
  // CONTEXT: Validate input parameters
  const { selectionGroupId: validatedGroupId, optionId: validatedOptionId } = 
    SelectOptionSchema.parse({ selectionGroupId, optionId });

  // SECURITY: Create authenticated Supabase client
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // CONTEXT: Fetch option for price snapshot and validate accessibility
  const { data: option, error: optionError } = await supabase
    .from('options')
    .select('id, price_total, price_currency, leg_id')
    .eq('id', validatedOptionId)
    .single();

  if (optionError || !option) {
    throw new Error('Option not found or not accessible');
  }

  // CONTEXT: Validate user has access to this selection group
  const { data: selectionGroup, error: groupError } = await supabase
    .from('selection_groups')
    .select('id, leg_id')
    .eq('id', validatedGroupId)
    .single();

  if (groupError || !selectionGroup) {
    throw new Error('Selection group not found');
  }

  // CONTEXT: Verify user has access through artist assignment (simplified for MVP)
  // In production, this would check artist assignments through the leg->project->artist chain
  // For now, we rely on RLS policies to enforce access control

  // BUSINESS_RULE: Deactivate any previous active selection for this group
  const { error: deactivateError } = await supabase
    .from('client_selections')
    .update({ is_active: false })
    .eq('selection_group_id', validatedGroupId)
    .eq('is_active', true);

  if (deactivateError) {
    throw new Error(`Failed to deactivate previous selection: ${deactivateError.message}`);
  }

  // DATABASE: Insert new active selection with price snapshot
  const { error: insertError } = await supabase
    .from('client_selections')
    .insert({
      selection_group_id: validatedGroupId,
      option_id: validatedOptionId,
      selected_by: user.id,
      price_snapshot: option.price_total,
      currency: option.price_currency
    });

  if (insertError) {
    throw new Error(`Failed to create selection: ${insertError.message}`);
  }

  // CONTEXT: Trigger notification event for client selection
  try {
    // TODO: In production, fetch artist_id and project_id through proper joins
    await supabase
      .from('notification_events')
      .insert({
        type: 'client_selection',
        severity: 'info',
        title: 'New Client Selection',
        body: 'Client has made a flight option selection',
        leg_id: option.leg_id,
        actor_user_id: user.id
      });
  } catch (notificationError) {
    // FALLBACK: Don't fail the selection if notification fails
    console.warn('Failed to create notification event:', notificationError);
  }

  return { success: true };
}

/**
 * Get active selections for a leg grouped by selection group
 * 
 * @description Retrieves all active client selections for a leg, useful for
 * displaying current selections and feeding the booking queue.
 * @param legId - UUID of the leg to get selections for
 * @returns Array of active selections with group and option details
 * @security Requires authentication and artist access permissions
 * @database Queries client_selections, selection_groups, options
 * @business_rule Only returns active selections
 * @throws Error if unauthorized or leg not accessible
 * @example
 * ```typescript
 * const selections = await getActiveSelectionsForLeg('leg-123');
 * ```
 */
export async function getActiveSelectionsForLeg(legId: string) {
  // SECURITY: Create authenticated Supabase client
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // DATABASE: Fetch active selections with related data
  const { data: selections, error } = await supabase
    .from('client_selections')
    .select(`
      *,
      selection_groups!inner(*),
      options!inner(*)
    `)
    .eq('is_active', true)
    .eq('selection_groups.leg_id', legId);

  if (error) {
    throw new Error(`Failed to fetch active selections: ${error.message}`);
  }

  return selections || [];
}
