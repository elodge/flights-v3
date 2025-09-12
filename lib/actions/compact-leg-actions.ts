/**
 * @fileoverview Server actions for compact leg management
 * 
 * @description Server-side actions for creating flight options from Navitas or manual
 * entry data and attaching them to selected passengers. Reuses existing enrichment
 * and database structures to maintain compatibility with client-facing app.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through getServerUser
 * @database Creates options and option_components via Supabase
 */

'use server'

import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { NavitasOption } from '@/lib/navitas'
import { enrichFlightSegments } from '@/lib/enrichment-service'
import { revalidatePath } from 'next/cache'

interface CreateOptionsRequest {
  legId: string
  passengerIds: string[]
  options: NavitasOption[]
}

interface CreateOptionsResponse {
  success: boolean
  count: number
  error?: string
}

/**
 * Creates flight options for selected passengers from Navitas or manual entry data
 * 
 * @description Processes NavitasOption data, enriches flight segments, and creates
 * database records for options and their components. Maintains existing data structure
 * for compatibility with client-facing application.
 * 
 * @param request - Object containing legId, passengerIds, and options data
 * @returns Promise<CreateOptionsResponse> - Success status and count or error message
 * 
 * @security Requires authenticated employee (non-client role)
 * @database Creates records in options and option_components tables
 * @business_rule Maintains one-passenger-per-PNR selection model
 * @business_rule Enriches flight data using existing Aviationstack/Airlabs services
 * 
 * @example
 * ```typescript
 * const result = await createOptionsForPassengers({
 *   legId: 'leg-uuid',
 *   passengerIds: ['passenger-1', 'passenger-2'],
 *   options: [navitasOption]
 * });
 * ```
 */
export async function createOptionsForPassengers(
  request: CreateOptionsRequest
): Promise<CreateOptionsResponse> {
  try {
    // SECURITY: Verify user authentication and role
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { success: false, count: 0, error: 'Unauthorized' }
    }

    const { legId, passengerIds, options } = request

    if (!legId || !passengerIds.length || !options.length) {
      return { success: false, count: 0, error: 'Missing required parameters' }
    }

    const supabase = await createServerClient()

    // DATABASE: Verify leg exists and user has access
    const { data: leg, error: legError } = await supabase
      .from('legs')
      .select('id, project_id')
      .eq('id', legId)
      .single()

    if (legError || !leg) {
      return { success: false, count: 0, error: 'Leg not found' }
    }

    // DATABASE: Verify passengers are assigned to this leg
    const { data: assignments, error: assignmentError } = await supabase
      .from('leg_passengers')
      .select('passenger_id')
      .eq('leg_id', legId)
      .in('passenger_id', passengerIds)

    if (assignmentError) {
      return { success: false, count: 0, error: 'Failed to verify passenger assignments' }
    }

    const assignedPassengerIds = assignments?.map(a => a.passenger_id) || []
    const invalidPassengers = passengerIds.filter(id => !assignedPassengerIds.includes(id))
    
    if (invalidPassengers.length > 0) {
      return { 
        success: false, 
        count: 0, 
        error: `Invalid passengers: ${invalidPassengers.join(', ')}` 
      }
    }

    let createdCount = 0

    // CONTEXT: Process each option for each passenger
    for (const passengerId of passengerIds) {
      for (const option of options) {
        try {
          // CONTEXT: Enrich flight segments using existing service
          const enrichedSegments = await enrichFlightSegments(option.segments)

          // DATABASE: Create the option
          const { data: optionData, error: optionError } = await supabase
            .from('options')
            .insert({
              leg_id: legId,
              name: option.passenger || `Flight Option ${Date.now()}`,
              description: `Created from ${option.source} entry`,
              total_cost: option.totalFare ? Math.round(option.totalFare * 100) : null, // Convert to cents
              currency: option.currency || 'USD',
              is_recommended: false,
              is_available: true
            })
            .select('id')
            .single()

          if (optionError || !optionData) {
            console.error('Failed to create option:', optionError)
            continue
          }

          // DATABASE: Create option components
          const components = enrichedSegments.map((segment, index) => ({
            option_id: optionData.id,
            component_order: index + 1,
            navitas_text: segment.navitas_text || `${segment.airline} ${segment.flightNumber}`,
            flight_number: segment.flightNumber,
            airline: segment.airline,
            airline_iata: segment.airline,
            airline_name: segment.airline_name,
            dep_iata: segment.origin,
            arr_iata: segment.destination,
            departure_time: segment.departure_time,
            arrival_time: segment.arrival_time,
            dep_time_local: segment.dep_time_local,
            arr_time_local: segment.arr_time_local,
            day_offset: segment.day_offset,
            duration_minutes: segment.duration_minutes,
            stops: segment.stops,
            enriched_terminal_gate: segment.enriched_terminal_gate
          }))

          const { error: componentsError } = await supabase
            .from('option_components')
            .insert(components)

          if (componentsError) {
            console.error('Failed to create option components:', componentsError)
            // DATABASE: Clean up the option if components failed
            await supabase.from('options').delete().eq('id', optionData.id)
            continue
          }

          // DATABASE: Associate this passenger with the option
          const { error: passengerError } = await supabase
            .from('option_passengers')
            .insert({
              option_id: optionData.id,
              passenger_id: passengerId
            })

          if (passengerError) {
            console.error('Failed to associate passenger with option:', passengerError)
            // DATABASE: Clean up the option and components if passenger association failed
            await supabase.from('options').delete().eq('id', optionData.id)
            continue
          }

          createdCount++

        } catch (error) {
          console.error('Error processing option:', error)
          continue
        }
      }
    }

    // CONTEXT: Revalidate the leg page to show new options
    revalidatePath(`/a/tour/${leg.project_id}/leg/${legId}`)
    revalidatePath(`/a/tour/${leg.project_id}/leg/${legId}/manage`)

    return { success: true, count: createdCount }

  } catch (error) {
    console.error('Error in createOptionsForPassengers:', error)
    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Removes a hold for a specific passenger and option
 * 
 * @description Removes the hold record that connects a passenger to a flight option.
 * This effectively removes the passenger from the option without deleting the option itself.
 * 
 * @param request - Object containing optionId and passengerId
 * @returns Promise<{success: true} | {error: string}>
 * 
 * @security Requires authenticated employee (non-client role)
 * @database Deletes record from holds table
 * @business_rule Maintains data integrity by only removing the hold relationship
 * 
 * @example
 * ```typescript
 * const result = await removeHold({
 *   optionId: 'option-uuid',
 *   passengerId: 'passenger-uuid'
 * });
 * ```
 */
export async function removeHold(request: {
  optionId: string
  passengerId: string
}): Promise<{success: true} | {error: string}> {
  try {
    // SECURITY: Verify user authentication and role
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const { optionId, passengerId } = request

    // DATABASE: Remove the hold record
    const { error } = await supabase
      .from('holds')
      .delete()
      .eq('option_id', optionId)
      .eq('passenger_id', passengerId)

    if (error) {
      console.error('Failed to remove hold:', error)
      return { error: 'Failed to remove hold' }
    }

    // CONTEXT: Revalidate the leg page to refresh data
    const { data: optionData } = await supabase
      .from('options')
      .select('leg_id')
      .eq('id', optionId)
      .single()

    if (optionData) {
      revalidatePath(`/a/tour/[id]/leg/[legId]/manage`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing hold:', error)
    return {
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Removes a passenger from a flight option
 * 
 * @description Removes the passenger association from a flight option by deleting the
 * option_passengers record. If the option has no other passengers associated, the entire
 * option will be deleted to prevent orphaned options.
 * 
 * @param request - Object containing optionId and passengerId
 * @returns Promise<{success: true} | {error: string}>
 * 
 * @security Requires authenticated employee (non-client role)
 * @database Deletes from option_passengers table, potentially from options table
 * @business_rule Deletes entire option if no other passengers are associated
 * 
 * @example
 * ```typescript
 * const result = await removePassengerFromOption({
 *   optionId: 'option-uuid',
 *   passengerId: 'passenger-uuid'
 * });
 * ```
 */
export async function removePassengerFromOption(request: {
  optionId: string
  passengerId: string
}): Promise<{ success: true } | { error: string }> {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const supabase = await createServerClient()
    const { optionId, passengerId } = request

    // DATABASE: Remove the passenger association
    const { error: removeError } = await supabase
      .from('option_passengers')
      .delete()
      .eq('option_id', optionId)
      .eq('passenger_id', passengerId)

    if (removeError) {
      console.error('Error removing passenger from option:', removeError)
      return { error: 'Failed to remove passenger from option' }
    }

    // DATABASE: Check if there are any other passengers on this option
    const { data: remainingPassengers, error: checkError } = await supabase
      .from('option_passengers')
      .select('id')
      .eq('option_id', optionId)

    if (checkError) {
      console.error('Error checking remaining passengers:', checkError)
      return { error: 'Failed to check remaining passengers' }
    }

    // BUSINESS_RULE: If no other passengers, delete the entire option
    if (remainingPassengers && remainingPassengers.length === 0) {
      const { error: deleteOptionError } = await supabase
        .from('options')
        .delete()
        .eq('id', optionId)

      if (deleteOptionError) {
        console.error('Error deleting empty option:', deleteOptionError)
        return { error: 'Failed to delete empty option' }
      }
    }

    // CONTEXT: Revalidate pages to show updated data
    revalidatePath('/a')

    return { success: true }
  } catch (error) {
    console.error('Error in removePassengerFromOption:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Manually revalidates the manage page data
 * 
 * @description Forces Next.js to refresh cached data for the manage page.
 * Useful for debugging cache issues.
 * 
 * @param legId - Leg UUID to revalidate
 * @returns Promise<{success: true} | {error: string}>
 */
export async function revalidateManagePage(legId: string): Promise<{ success: true } | { error: string }> {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const supabase = await createServerClient()
    
    // Get project ID for revalidation
    const { data: leg, error } = await supabase
      .from('legs')
      .select('project_id')
      .eq('id', legId)
      .single()

    if (error || !leg) {
      return { error: 'Leg not found' }
    }

    // Force revalidation
    revalidatePath(`/a/tour/${leg.project_id}/leg/${legId}/manage`)
    revalidatePath(`/a/tour/${leg.project_id}/leg/${legId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error in revalidateManagePage:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

