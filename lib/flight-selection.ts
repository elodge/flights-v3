/**
 * @fileoverview Client-side flight option selection utilities
 * 
 * @description Provides functions for clients to select flight options
 * through the rpc_client_select_option RPC function. Handles both
 * group selections (all passengers) and individual selections.
 * 
 * @access Client only - uses RLS-protected RPC function
 * @database Calls rpc_client_select_option which writes to selections table
 */

import { supabase } from './supabase'
import { Database } from './database.types'

/**
 * Parameters for flight option selection
 * 
 * @description Configuration for selecting a flight option, either for
 * all passengers on a leg or specific individuals.
 */
export interface SelectOptionParams {
  /** UUID of the flight leg */
  leg_id: string
  /** UUID of the flight option to select */
  option_id: string
  /** Optional array of passenger UUIDs for individual selection */
  passenger_ids?: string[]
}

/**
 * Result of flight option selection operation
 * 
 * @description Response object indicating success/failure and providing
 * user-friendly messages or error details.
 */
export interface SelectOptionResult {
  /** Whether the selection was successful */
  success: boolean
  /** Success message for user feedback */
  message?: string
  /** Error message if selection failed */
  error?: string
}

/**
 * Helper function to call the rpc_client_select_option RPC
 * 
 * @param params - Selection parameters
 * @param params.leg_id - The leg ID to select for
 * @param params.option_id - The option ID to select
 * @param params.passenger_ids - Optional array of passenger IDs for individual selection
 * @returns Promise with success status and optional message/error
 */
export async function selectOption(params: SelectOptionParams): Promise<SelectOptionResult> {
  try {
    const { leg_id, option_id, passenger_ids } = params

    // Validate required parameters
    if (!leg_id) {
      throw new Error('leg_id is required')
    }
    if (!option_id) {
      throw new Error('option_id is required')
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('rpc_client_select_option', {
      leg_id_param: leg_id,
      option_id_param: option_id,
      passenger_ids_param: passenger_ids || undefined
    })

    if (error) {
      console.error('RPC error:', error)
      return {
        success: false,
        error: error.message || 'Failed to select option'
      }
    }

    return {
      success: true,
      message: passenger_ids 
        ? `Successfully selected option for ${passenger_ids.length} passenger(s)`
        : 'Successfully selected option for all passengers'
    }
  } catch (error) {
    console.error('selectOption error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Select flight option for all passengers on a leg (group selection)
 */
export async function selectOptionForGroup(legId: string, optionId: string): Promise<SelectOptionResult> {
  return selectOption({
    leg_id: legId,
    option_id: optionId
  })
}

/**
 * Select flight option for specific passengers (individual selection)
 */
export async function selectOptionForPassengers(
  legId: string, 
  optionId: string, 
  passengerIds: string[]
): Promise<SelectOptionResult> {
  if (!passengerIds || passengerIds.length === 0) {
    return {
      success: false,
      error: 'At least one passenger ID is required for individual selection'
    }
  }

  return selectOption({
    leg_id: legId,
    option_id: optionId,
    passenger_ids: passengerIds
  })
}
