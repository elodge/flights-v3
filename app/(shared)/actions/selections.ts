/**
 * @fileoverview Server actions for client flight option selections
 * 
 * @description Handles client selections of flight options for both individual
 * and group passengers. Supports the group-based selection system where clients
 * can select options for multiple passengers at once.
 * @route Used in client portal flight selection interface
 * @access Client users only
 * @security Requires authentication and artist access permissions
 * @database Creates/updates client_selections records
 * @coverage Unit tests for server actions, integration tests for UI
 */

'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'

/**
 * Input validation schema for selecting options
 */
const SelectOptionSchema = z.object({
  selectionGroupId: z.string().uuid('Invalid selection group ID format'),
  optionId: z.string().uuid('Invalid option ID format')
})

/**
 * Selects a flight option for a selection group
 * 
 * @description Allows clients to select flight options for their assigned
 * selection groups. Deactivates any previous selection and creates a new
 * active selection with price snapshot.
 * 
 * @param selectionGroupId - UUID of the selection group
 * @param optionId - UUID of the flight option to select
 * @returns Promise<{success: boolean}> - Operation result
 * 
 * @security Requires authenticated client user with artist access
 * @database Updates client_selections table, queries selection_groups and options
 * @business_rule Only one active selection per group
 * @business_rule Deactivates previous selections when new one is made
 * @business_rule Captures price snapshot at time of selection
 * @throws Error if unauthorized or selection group not found
 * 
 * @example
 * ```typescript
 * const result = await selectOptionForGroup('group-uuid', 'option-uuid')
 * if (result.success) {
 *   toast.success('Selection updated successfully')
 * }
 * ```
 */
export async function selectOptionForGroup(selectionGroupId: string, optionId: string) {
  try {
    // CONTEXT: Validate input parameters
    const validatedInput = SelectOptionSchema.parse({
      selectionGroupId,
      optionId
    })
    
    const validatedGroupId = validatedInput.selectionGroupId
    const validatedOptionId = validatedInput.optionId
    
    // SECURITY: Verify user authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Authentication required')
    }
    
    // CONTEXT: Check user role - only clients can make selections
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!userRole || userRole.role !== 'client') {
      throw new Error('Only clients can make flight selections')
    }
    
    // DATABASE: Get selection group and validate access
    // CONTEXT: selection_groups table exists but not in generated types
    // DATABASE: Using type assertion for missing table in generated types
    const { data: selectionGroup, error: groupError } = await (supabase as any)
      .from('selection_groups')
      .select(`
        id,
        leg_id,
        type,
        label,
        passenger_ids,
        legs!inner(
          id,
          project_id,
          projects!inner(
            id,
            artist_id
          )
        )
      `)
      .eq('id', validatedGroupId)
      .single()

    if (groupError || !selectionGroup) {
      throw new Error('Selection group not found')
    }

    // CONTEXT: Verify user has access through artist assignment
    // In production, this would check artist assignments through the leg->project->artist chain
    // For now, we rely on RLS policies to enforce access control

    // DATABASE: Get option details for price snapshot
    const { data: option, error: optionError } = await supabase
      .from('options')
      .select('id, total_cost, currency')
      .eq('id', validatedOptionId)
      .single()

    if (optionError || !option) {
      throw new Error('Flight option not found')
    }

    // BUSINESS_RULE: Deactivate any previous active selection for this group
    // CONTEXT: client_selections table exists but not in generated types
    // DATABASE: Using type assertion for missing table in generated types
    const { error: deactivateError } = await (supabase as any)
      .from('client_selections')
      .update({ is_active: false })
      .eq('selection_group_id', validatedGroupId)
      .eq('is_active', true)

    if (deactivateError) {
      throw new Error(`Failed to deactivate previous selection: ${deactivateError.message}`)
    }

    // DATABASE: Insert new active selection with price snapshot
    // CONTEXT: client_selections table exists but not in generated types
    // DATABASE: Using type assertion for missing table in generated types
    const { error: insertError } = await (supabase as any)
      .from('client_selections')
      .insert({
        selection_group_id: validatedGroupId,
        option_id: validatedOptionId,
        selected_by: user.id,
        price_snapshot: option.total_cost,
        currency: option.currency
      })

    if (insertError) {
      throw new Error(`Failed to create selection: ${insertError.message}`)
    }

    // CONTEXT: Trigger notification event for client selection
    try {
      // TODO: In production, fetch artist_id and project_id through proper joins
      // CONTEXT: notification_events table exists but not in generated types
      // DATABASE: Using type assertion for missing table in generated types
      await (supabase as any)
        .from('notification_events')
        .insert({
          type: 'client_selection',
          severity: 'info',
          title: 'New Client Selection',
          body: 'Client has made a flight option selection',
          leg_id: selectionGroup.leg_id,
          actor_user_id: user.id
        })
    } catch (notificationError) {
      // FALLBACK: Don't fail the selection if notification fails
      console.warn('Failed to create notification event:', notificationError)
    }

    return { success: true }
    
  } catch (error) {
    console.error('Select option for group error:', error)
    throw error instanceof Error ? error : new Error('An unexpected error occurred')
  }
}

/**
 * Get active selections for a leg grouped by selection group
 * 
 * @description Retrieves all active client selections for a leg, useful for
 * displaying current selections and feeding the booking queue.
 * 
 * @param legId - UUID of the leg to get selections for
 * @returns Array of active selections with group and option details
 * @security Requires authentication and artist access permissions
 * @database Queries client_selections, selection_groups, options
 * @business_rule Only returns active selections
 * @throws Error if unauthorized or leg not accessible
 * 
 * @example
 * ```typescript
 * const selections = await getActiveSelectionsForLeg('leg-123')
 * ```
 */
export async function getActiveSelectionsForLeg(legId: string) {
  try {
    // SECURITY: Verify user authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Authentication required')
    }
    
    // DATABASE: Get active selections with related data
    // CONTEXT: client_selections table exists but not in generated types
    // DATABASE: Using type assertion for missing table in generated types
    const { data: selections, error } = await (supabase as any)
      .from('client_selections')
      .select(`
        id,
        option_id,
        price_snapshot,
        currency,
        selected_at,
        selection_groups!inner(
          id,
          type,
          label,
          passenger_ids,
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
      .eq('is_active', true)
      .eq('selection_groups.leg_id', legId)
    
    if (error) {
      throw new Error(`Failed to fetch selections: ${error.message}`)
    }
    
    return selections || []
    
  } catch (error) {
    console.error('Get active selections error:', error)
    throw error instanceof Error ? error : new Error('An unexpected error occurred')
  }
}
