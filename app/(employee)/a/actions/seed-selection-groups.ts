/**
 * @fileoverview Server actions for seeding selection groups from leg assignments
 * 
 * @description Provides functionality to automatically generate selection groups
 * from leg passenger assignments, supporting both individual and group selections.
 * @route Used in employee portal leg management
 * @access Employee (agent/admin) only
 * @security Requires authentication and employee role
 * @database Creates selection_groups records based on leg_passengers data
 * @coverage Unit tests for server actions, integration tests for UI
 */

'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase'

/**
 * Input validation schema for seeding selection groups
 */
const SeedSelectionGroupsSchema = z.object({
  legId: z.string().uuid('Invalid leg ID format')
})

/**
 * Result type for seeding selection groups operation
 */
interface SeedSelectionGroupsResult {
  success: boolean
  details: {
    totalPassengers: number
    individuals: number
    grouped: number
    groupsCreated: number
  }
  error?: string
}

/**
 * Seeds selection groups from leg passenger assignments
 * 
 * @description Automatically creates selection groups based on leg passenger
 * assignments. Passengers marked as individual get their own group, others
 * are grouped together. This enables the group-based selection system.
 * 
 * @param legId - UUID of the leg to seed selection groups for
 * @returns Promise<SeedSelectionGroupsResult> - Operation result with counts
 * 
 * @security Requires authenticated employee user
 * @database Queries leg_passengers, creates selection_groups records
 * @business_rule Individual passengers get separate groups
 * @business_rule Non-individual passengers are grouped together
 * @business_rule Idempotent - safe to run multiple times
 * @throws Error if unauthorized or leg not found
 * 
 * @example
 * ```typescript
 * const result = await seedSelectionGroups('leg-uuid')
 * if (result.success) {
 *   console.log(`Created ${result.details.groupsCreated} groups`)
 * }
 * ```
 */
export async function seedSelectionGroups(legId: string): Promise<SeedSelectionGroupsResult> {
  try {
    // CONTEXT: Validate input parameters
    const validatedInput = SeedSelectionGroupsSchema.parse({ legId })
    
    // SECURITY: Verify user authentication and employee role
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        details: { totalPassengers: 0, individuals: 0, grouped: 0, groupsCreated: 0 },
        error: 'Authentication required'
      }
    }
    
    // CONTEXT: Check user role - only employees can seed selection groups
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!userRole || !['agent', 'admin'].includes(userRole.role)) {
      return {
        success: false,
        details: { totalPassengers: 0, individuals: 0, grouped: 0, groupsCreated: 0 },
        error: 'Insufficient permissions - employee role required'
      }
    }
    
    // DATABASE: Get leg information and validate it exists
    const { data: leg, error: legError } = await supabase
      .from('legs')
      .select('id, label, origin_city, destination_city')
      .eq('id', validatedInput.legId)
      .single()
    
    if (legError || !leg) {
      return {
        success: false,
        details: { totalPassengers: 0, individuals: 0, grouped: 0, groupsCreated: 0 },
        error: 'Leg not found'
      }
    }
    
    // DATABASE: Get all passengers assigned to this leg with their details
    const { data: legPassengers, error: passengersError } = await supabase
      .from('leg_passengers')
      .select(`
        passenger_id,
        is_individual,
        tour_personnel!inner(
          id,
          full_name
        )
      `)
      .eq('leg_id', validatedInput.legId)
    
    if (passengersError) {
      return {
        success: false,
        details: { totalPassengers: 0, individuals: 0, grouped: 0, groupsCreated: 0 },
        error: `Failed to fetch passengers: ${passengersError.message}`
      }
    }
    
    if (!legPassengers || legPassengers.length === 0) {
      return {
        success: false,
        details: { totalPassengers: 0, individuals: 0, grouped: 0, groupsCreated: 0 },
        error: 'No passengers assigned to this leg'
      }
    }
    
    // CONTEXT: Split passengers into individual and grouped categories
    const individuals = legPassengers.filter(lp => lp.is_individual)
    const grouped = legPassengers.filter(lp => !lp.is_individual)
    
    // BUSINESS_RULE: Clear existing selection groups for this leg to ensure idempotency
    const { error: deleteError } = await supabase
      .from('selection_groups')
      .delete()
      .eq('leg_id', validatedInput.legId)
    
    if (deleteError) {
      return {
        success: false,
        details: { totalPassengers: 0, individuals: 0, grouped: 0, groupsCreated: 0 },
        error: `Failed to clear existing groups: ${deleteError.message}`
      }
    }
    
    let groupsCreated = 0
    
    // CONTEXT: Create individual selection groups
    for (const individual of individuals) {
      const label = `${individual.tour_personnel.full_name} — ${leg.origin_city} → ${leg.destination_city}`
      
      const { error: insertError } = await supabase
        .from('selection_groups')
        .insert({
          leg_id: validatedInput.legId,
          type: 'individual',
          label,
          passenger_ids: [individual.passenger_id]
        })
      
      if (insertError) {
        return {
          success: false,
          details: { 
            totalPassengers: legPassengers.length, 
            individuals: individuals.length, 
            grouped: grouped.length, 
            groupsCreated 
          },
          error: `Failed to create individual group: ${insertError.message}`
        }
      }
      
      groupsCreated++
    }
    
    // CONTEXT: Create group selection group if there are grouped passengers
    if (grouped.length > 0) {
      const passengerIds = grouped.map(g => g.passenger_id)
      const label = `${leg.origin_city} → ${leg.destination_city} — ${grouped.length} pax`
      
      const { error: insertError } = await supabase
        .from('selection_groups')
        .insert({
          leg_id: validatedInput.legId,
          type: 'group',
          label,
          passenger_ids: passengerIds
        })
      
      if (insertError) {
        return {
          success: false,
          details: { 
            totalPassengers: legPassengers.length, 
            individuals: individuals.length, 
            grouped: grouped.length, 
            groupsCreated 
          },
          error: `Failed to create group: ${insertError.message}`
        }
      }
      
      groupsCreated++
    }
    
    return {
      success: true,
      details: {
        totalPassengers: legPassengers.length,
        individuals: individuals.length,
        grouped: grouped.length,
        groupsCreated
      }
    }
    
  } catch (error) {
    console.error('Seed selection groups error:', error)
    return {
      success: false,
      details: { totalPassengers: 0, individuals: 0, grouped: 0, groupsCreated: 0 },
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Gets existing selection groups for a leg
 * 
 * @description Retrieves all selection groups for a specific leg, useful for
 * displaying current group structure and checking if groups already exist.
 * 
 * @param legId - UUID of the leg to get selection groups for
 * @returns Promise<Array> - Array of selection groups with passenger details
 * @security Requires authentication and employee role
 * @database Queries selection_groups table
 * @business_rule Returns groups ordered by type (individual first, then group)
 * @throws Error if unauthorized or leg not found
 * 
 * @example
 * ```typescript
 * const groups = await getSelectionGroupsForLeg('leg-uuid')
 * console.log(`Found ${groups.length} selection groups`)
 * ```
 */
export async function getSelectionGroupsForLeg(legId: string) {
  try {
    // CONTEXT: Validate input parameters
    const validatedInput = SeedSelectionGroupsSchema.parse({ legId })
    
    // SECURITY: Verify user authentication and employee role
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Authentication required')
    }
    
    // CONTEXT: Check user role - only employees can view selection groups
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!userRole || !['agent', 'admin'].includes(userRole.role)) {
      throw new Error('Insufficient permissions - employee role required')
    }
    
    // DATABASE: Get selection groups for this leg with passenger details
    const { data: groups, error } = await supabase
      .from('selection_groups')
      .select(`
        id,
        type,
        label,
        passenger_ids,
        created_at,
        tour_personnel!inner(
          id,
          full_name
        )
      `)
      .eq('leg_id', validatedInput.legId)
      .order('type', { ascending: true }) // Individual first, then group
    
    if (error) {
      throw new Error(`Failed to fetch selection groups: ${error.message}`)
    }
    
    return groups || []
    
  } catch (error) {
    console.error('Get selection groups error:', error)
    throw error instanceof Error ? error : new Error('An unexpected error occurred')
  }
}
