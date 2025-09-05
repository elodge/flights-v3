/**
 * @fileoverview Client flight selection server actions
 * 
 * @description Server-side actions for client flight option selection operations.
 * Handles both group and individual selection modes via RLS-protected RPC calls
 * to maintain data integrity and security.
 * 
 * @access Client-side callable server actions
 * @security RLS enforced through rpc_client_select_option
 * @database Calls Supabase RPC functions for selections
 */

'use server'

import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface SelectFlightOptionParams {
  leg_id: string
  option_id: string
  passenger_ids: string[] | null
}

export interface SelectFlightOptionResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * Selects a flight option for group or individual passengers
 * 
 * @description Creates a selection record via RPC call. Supports both group
 * selection (passenger_ids = null) and individual selection (specific IDs).
 * Validates user authentication and uses RLS-protected database operations.
 * 
 * @param params - Selection parameters containing leg_id, option_id, and passenger_ids
 * @returns Promise<SelectFlightOptionResult> - Success status with optional error message
 * 
 * @security Requires authenticated client user
 * @database Calls rpc_client_select_option with parameter validation
 * @business_rule Group selections use null passenger_ids, individual use specific IDs
 * @business_rule RPC function handles duplicate detection and status transitions
 * 
 * @throws {Error} Authentication failures or database errors
 * 
 * @example
 * ```typescript
 * // Group selection
 * const result = await selectFlightOption({
 *   leg_id: 'leg-uuid',
 *   option_id: 'option-uuid',
 *   passenger_ids: null
 * })
 * 
 * // Individual selection
 * const result = await selectFlightOption({
 *   leg_id: 'leg-uuid',
 *   option_id: 'option-uuid',
 *   passenger_ids: ['passenger-1', 'passenger-2']
 * })
 * ```
 */
export async function selectFlightOption(params: SelectFlightOptionParams): Promise<SelectFlightOptionResult> {
  try {
    // SECURITY: Verify user authentication and role
    const user = await getServerUser()
    if (!user || user.role !== 'client') {
      return {
        success: false,
        error: 'Authentication required'
      }
    }
    
    const { leg_id, option_id, passenger_ids } = params
    
    // CONTEXT: Validate required parameters
    if (!leg_id || !option_id) {
      return {
        success: false,
        error: 'Missing required parameters'
      }
    }
    
    const supabase = await createServerClient()
    
    // CONTEXT: Call RPC function for selection with RLS protection
    // DATABASE: rpc_client_select_option handles business logic and validation
    // BUSINESS_RULE: RPC ensures client can only select for their assigned projects
    const { data, error } = await supabase.rpc('rpc_client_select_option', {
      leg_id_param: leg_id,
      option_id_param: option_id,
      passenger_ids_param: passenger_ids
    })
    
    if (error) {
      console.error('RPC selection error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update selection'
      }
    }
    
    // NEXTJS_15_FIX: Revalidate the leg page to show updated selections
    // BUSINESS_RULE: Client needs to see immediate feedback after selection
    // NOTE: Skip revalidation in test environment to avoid mock complexity
    if (process.env.NODE_ENV !== 'test') {
      try {
        // Get project_id for revalidation path using fresh client
        const revalidationClient = await createServerClient()
        const { data: legData } = await revalidationClient
          .from('legs')
          .select('project_id')
          .eq('id', leg_id)
          .single()
        
        if (legData) {
          revalidatePath(`/c/project/${legData.project_id}/legs/${leg_id}`)
        }
      } catch (revalidateError) {
        console.error('Revalidation error:', revalidateError)
        // Don't fail the selection if revalidation fails
      }
    }
    
    return {
      success: true,
      data
    }
    
  } catch (error) {
    console.error('Selection action error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Confirms group selection for all non-individual passengers
 * 
 * @description Idempotent operation that ensures client_choice selections exist
 * for all passengers not marked as treat_as_individual. Used by confirmation
 * UI to finalize group selections.
 * 
 * @param legId - UUID of the leg to confirm selections for
 * @returns Promise<SelectFlightOptionResult> - Success status with optional error
 * 
 * @security Requires authenticated client user
 * @database Queries existing selections and creates missing ones
 * @business_rule Only affects passengers with treat_as_individual = false
 * @business_rule Idempotent - safe to call multiple times
 * 
 * @example
 * ```typescript
 * const result = await confirmGroupSelection('leg-uuid')
 * if (result.success) {
 *   toast.success('Group selection confirmed')
 * }
 * ```
 */
export async function confirmGroupSelection(legId: string): Promise<SelectFlightOptionResult> {
  try {
    // SECURITY: Verify user authentication and role
    const user = await getServerUser()
    if (!user || user.role !== 'client') {
      return {
        success: false,
        error: 'Authentication required'
      }
    }
    
    if (!legId) {
      return {
        success: false,
        error: 'Leg ID is required'
      }
    }
    
    const supabase = await createServerClient()
    
    // CONTEXT: This is an idempotent operation - confirms existing selections
    // BUSINESS_RULE: Group confirmation doesn't change individual selections
    // DATABASE: RLS ensures client can only confirm their own project selections
    const { data, error } = await supabase.rpc('rpc_confirm_group_selection', {
      leg_id_param: legId
    })
    
    if (error) {
      console.error('Group confirmation error:', error)
      return {
        success: false,
        error: error.message || 'Failed to confirm group selection'
      }
    }
    
    // NEXTJS_15_FIX: Revalidate the leg page to show confirmed selections
    // NOTE: Skip revalidation in test environment to avoid mock complexity
    if (process.env.NODE_ENV !== 'test') {
      try {
        // Get project_id for revalidation path using fresh client
        const revalidationClient = await createServerClient()
        const { data: legData } = await revalidationClient
          .from('legs')
          .select('project_id')
          .eq('id', legId)
          .single()
        
        if (legData) {
          revalidatePath(`/c/project/${legData.project_id}/legs/${legId}`)
        }
      } catch (revalidateError) {
        console.error('Revalidation error:', revalidateError)
        // Don't fail the confirmation if revalidation fails
      }
    }
    
    return {
      success: true,
      data
    }
    
  } catch (error) {
    console.error('Group confirmation action error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}
