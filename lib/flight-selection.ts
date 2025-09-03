import { supabase } from './supabase'
import { Database } from './database.types'

export interface SelectOptionParams {
  leg_id: string
  option_id: string
  passenger_ids?: string[]
}

export interface SelectOptionResult {
  success: boolean
  message?: string
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
