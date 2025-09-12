/**
 * @fileoverview Compact Leg Management Server Actions
 * 
 * @description Server-side actions for the compact leg management interface, providing
 * functionality to create flight options from Navitas or manual entry data and associate
 * them with selected passengers. Handles data enrichment, database operations, and
 * maintains compatibility with existing client-facing application structures.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through getServerUser authentication
 * @database Creates records in options, option_components, and option_passengers tables
 * @business_rule Maintains one-passenger-per-option selection model
 * @business_rule Enriches flight data using existing Aviationstack/Airlabs services
 * @business_rule Supports batch creation of multiple options for multiple passengers
 * 
 * @example
 * ```typescript
 * // Create options for multiple passengers
 * const result = await createOptionsForPassengers({
 *   legId: 'leg-uuid',
 *   passengerIds: ['passenger-1', 'passenger-2'],
 *   options: [navitasOption1, navitasOption2]
 * });
 * 
 * // Remove passenger from option
 * const removeResult = await removePassengerFromOption({
 *   optionId: 'option-uuid',
 *   passengerId: 'passenger-uuid'
 * });
 * ```
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

    // BUSINESS_RULE: Must have at least one option to create
    if (!options || options.length === 0) {
      return { success: true, count: 0 }
    }

    // CONTEXT: Process each option for each passenger
    for (const passengerId of passengerIds) {
      for (const option of options) {
        try {
          // CONTEXT: Enrich flight segments using existing service
          // Map NavitasSegment format to enrichFlightSegments format
          const segmentsForEnrichment = option.segments.map(segment => ({
            flightNumber: segment.flightNumber,
            airlineIata: segment.airline,
            depIata: segment.origin,
            arrIata: segment.destination
          }))
          const enrichedSegments = await enrichFlightSegments(segmentsForEnrichment)

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
            continue
          }

          // DATABASE: Create option components
          // CONTEXT: Combine original segment data with enrichment results and preserve times
          // BUSINESS_RULE: Save complete Navitas text and parsed times for consistent display
          
          const components = option.segments.map((segment, index) => {
            const enrichment = enrichedSegments[index]
            
            // CONTEXT: Build complete Navitas text with times for proper parsing later
            const completeNavitasText = segment.dateRaw && segment.depTimeRaw && segment.arrTimeRaw
              ? `${segment.airline} ${segment.flightNumber} ${segment.origin}-${segment.destination} ${segment.dateRaw} ${segment.depTimeRaw}-${segment.arrTimeRaw}`
              : `${segment.airline} ${segment.flightNumber} ${segment.origin}-${segment.destination}`
            
            return {
              option_id: optionData.id,
              component_order: index + 1,
              navitas_text: completeNavitasText,
              flight_number: segment.flightNumber,
              airline: segment.airline,
              airline_iata: segment.airline,
              airline_name: null, // TODO: Get airline name from enrichment if available
              dep_iata: segment.origin,
              arr_iata: segment.destination,
              // CONTEXT: Save parsed times from Navitas for immediate display
              departure_time: null, // TODO: Convert segment.depTimeRaw to proper timestamp format
              arrival_time: null, // TODO: Convert segment.arrTimeRaw to proper timestamp format
              dep_time_local: null, // Keep as null for now - would need proper timestamp parsing
              arr_time_local: null, // Keep as null for now - would need proper timestamp parsing
              day_offset: segment.dayOffset || 0,
              duration_minutes: enrichment?.duration || null,
              stops: 0, // Navitas typically shows direct flights
              enriched_terminal_gate: enrichment ? {
                dep_terminal: enrichment.dep_terminal || null,
                arr_terminal: enrichment.arr_terminal || null
              } : null
            }
          })

          
          const { error: componentsError } = await supabase
            .from('option_components')
            .insert(components)

          if (componentsError) {
            // DATABASE: Clean up the option if components failed
            await supabase.from('options').delete().eq('id', optionData.id)
            continue
          }
          
          // DATABASE: Associate this passenger with the option
          
          const { error: passengerError, data: passengerData } = await supabase
            .from('option_passengers' as any)
            .insert({
              option_id: optionData.id,
              passenger_id: passengerId
            })
            .select()

          if (passengerError) {
            console.error('Failed to associate passenger with option:', passengerError)
            console.error('Passenger error details:', {
              code: passengerError.code,
              message: passengerError.message,
              details: passengerError.details,
              hint: passengerError.hint
            })
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

    const supabase = await createServerClient()

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
    // SECURITY: Verify user authentication and role
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const supabase = await createServerClient()
    const { optionId, passengerId } = request

    // DATABASE: Remove the passenger association from option_passengers junction table
    // BUSINESS_RULE: This removes the passenger from the option without deleting the option itself
    const { error: removeError } = await supabase
      .from('option_passengers' as any)
      .delete()
      .eq('option_id', optionId)
      .eq('passenger_id', passengerId)

    if (removeError) {
      console.error('Error removing passenger from option:', removeError)
      return { error: 'Failed to remove passenger from option' }
    }

    // DATABASE: Check if there are any other passengers on this option
    const { data: remainingPassengers, error: checkError } = await supabase
      .from('option_passengers' as any)
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

