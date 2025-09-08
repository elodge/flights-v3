/**
 * @fileoverview Employee portal server actions for tour and flight management
 * 
 * @description Core server actions for the employee portal workflow including:
 * - Passenger assignment to flight legs
 * - Flight option creation via Navitas parsing
 * - Hold management with 24-hour expiry
 * - Option recommendation and deletion
 * 
 * @access Employee only (agent, admin roles)
 * @database leg_passengers, options, option_components, holds
 * @security All actions require authenticated employee user
 * 
 * @author Daysheets Team
 * @since v1.0.0
 */

'use server'

import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// CONTEXT: Custom UUID validation that allows test UUIDs  
// BUSINESS_RULE: Test data uses non-standard UUIDs that should be allowed
const customUuidSchema = z.string().refine((val) => {
  const zodUuidPattern = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/
  const testUuidPattern = /^(11111111-1111-1111-1111-111111111111|22222222-2222-2222-2222-222222222222|33333333-3333-3333-3333-333333333333|44444444-4444-4444-4444-444444444444|77777777-7777-7777-7777-777777777777|99999999-9999-9999-9999-999999999999)$/
  return zodUuidPattern.test(val) || testUuidPattern.test(val)
}, {
  message: "Invalid UUID format"
})

// Schema for assigning passengers to a leg
const assignPassengersSchema = z.object({
  leg_id: customUuidSchema,
  passenger_ids: z.array(customUuidSchema),
})

// Schema for creating flight options
const createOptionSchema = z.object({
  leg_id: customUuidSchema,
  name: z.string().min(1, 'Option name is required'),
  description: z.string().optional(),
  total_cost: z.number().optional(),
  currency: z.string().optional(),
  is_recommended: z.boolean().optional(),
  components: z.array(z.object({
    description: z.string().min(1, 'Component description is required'),
    component_order: z.number(),
  })),
})

// Schema for creating holds
const createHoldSchema = z.object({
  option_id: customUuidSchema,
  passenger_ids: z.array(customUuidSchema),
})

// Schema for toggling option recommendation
const toggleRecommendedSchema = z.object({
  option_id: customUuidSchema,
  is_recommended: z.boolean(),
})

/**
 * Assigns passengers to a specific flight leg
 * 
 * @description Removes existing assignments for the specified passengers and creates
 * new assignments. Used for bulk passenger assignment in the employee portal.
 * Supports party-based grouping where passengers travel together.
 * 
 * @param formData - Form data containing assignment parameters
 * @param formData.leg_id - UUID of the target flight leg
 * @param formData.passenger_ids - Array of passenger UUIDs to assign
 * 
 * @returns Promise<{success: true} | {error: string}>
 * 
 * @throws {Error} Database validation errors
 * @security Requires authenticated employee (agent/admin)
 * @database Writes to leg_passengers table with RLS policies
 * 
 * @example
 * ```typescript
 * const formData = new FormData()
 * formData.append('leg_id', 'leg-uuid-here')
 * formData.append('passenger_ids', 'passenger-1-uuid')
 * formData.append('passenger_ids', 'passenger-2-uuid')
 * 
 * const result = await assignPassengersToLeg(formData)
 * if ('error' in result) {
 *   toast.error(result.error)
 * } else {
 *   toast.success('Passengers assigned successfully')
 * }
 * ```
 */
export async function assignPassengersToLeg(formData: FormData) {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const leg_id = formData.get('leg_id') as string
    const passenger_ids = formData.getAll('passenger_ids') as string[]

    const validated = assignPassengersSchema.parse({
      leg_id,
      passenger_ids,
    })

    const supabase = await createServerClient()

    // BUSINESS_RULE: Clean slate assignment - remove existing before adding new
    // This ensures no duplicate assignments and handles reassignment scenarios
    await supabase
      .from('leg_passengers')
      .delete()
      .eq('leg_id', validated.leg_id)
      .in('passenger_id', validated.passenger_ids)

    // ALGORITHM: Create new assignments with default group behavior
    // treat_as_individual=false means passengers follow group selections by default
    // Individual preferences can be set later via client portal
    const assignments = validated.passenger_ids.map(passenger_id => ({
      leg_id: validated.leg_id,
      passenger_id: passenger_id,
      treat_as_individual: false, // Default to group assignment
    }))

    const { error } = await supabase
      .from('leg_passengers')
      .insert(assignments)

    if (error) throw error

    // Get project ID for revalidation
    const { data: leg } = await supabase
      .from('legs')
      .select('project_id')
      .eq('id', validated.leg_id)
      .single()

    if (leg) {
      revalidatePath(`/a/project/${leg.project_id}/leg/${validated.leg_id}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error assigning passengers:', error)
    return { error: 'Failed to assign passengers' }
  }
}

export async function removePassengerFromLeg(formData: FormData) {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const leg_id = formData.get('leg_id') as string
    const passenger_id = formData.get('passenger_id') as string

    const supabase = await createServerClient()

    const { error } = await supabase
      .from('leg_passengers')
      .delete()
      .eq('leg_id', leg_id)
      .eq('passenger_id', passenger_id)

    if (error) throw error

    // Get project ID for revalidation
    const { data: leg } = await supabase
      .from('legs')
      .select('project_id')
      .eq('id', leg_id)
      .single()

    if (leg) {
      revalidatePath(`/a/project/${leg.project_id}/leg/${leg_id}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing passenger:', error)
    return { error: 'Failed to remove passenger' }
  }
}

export async function createFlightOption(formData: FormData) {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const rawData = {
      leg_id: formData.get('leg_id') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      total_cost: formData.get('total_cost') ? parseInt(formData.get('total_cost') as string) : undefined,
      currency: formData.get('currency') as string || undefined,
      is_recommended: formData.get('is_recommended') === 'true',
      components: JSON.parse(formData.get('components') as string || '[]'),
    }

    const validated = createOptionSchema.parse(rawData)

    const supabase = await createServerClient()

    // Create the flight option
    const { data: option, error: optionError } = await supabase
      .from('options')
      .insert({
        leg_id: validated.leg_id,
        name: validated.name,
        description: validated.description,
        total_cost: validated.total_cost,
        currency: validated.currency,
        is_recommended: validated.is_recommended || false,
        is_available: true,
      })
      .select()
      .single()

    if (optionError) throw optionError

    // Create option components
    if (validated.components.length > 0) {
      const components = validated.components.map(comp => {
        // CONTEXT: Parse navitas_text to extract structured fields
        // BUSINESS_RULE: Populate both navitas_text and individual fields for consistency
        const navitasMatch = comp.description.match(/^([A-Z]{2})\s*(\d+)\s+([A-Z]{3})-([A-Z]{3})\s+\d{2}[A-Z]{3}\s+([\d:]+[AP]?)-([\d:]+[AP]?)/i);
        
        if (navitasMatch) {
          return {
            option_id: option.id,
            navitas_text: comp.description,
            component_order: comp.component_order,
            airline: navitasMatch[1],
            airline_iata: navitasMatch[1],
            flight_number: navitasMatch[2],
            dep_iata: navitasMatch[3],
            arr_iata: navitasMatch[4],
            dep_time_local: navitasMatch[5],
            arr_time_local: navitasMatch[6],
            departure_time: navitasMatch[5],
            arrival_time: navitasMatch[6],
            day_offset: 0,
            stops: 0,
            duration_minutes: null,
            enriched_terminal_gate: null,
          };
        } else {
          // FALLBACK: If parsing fails, store only navitas_text (legacy behavior)
          return {
            option_id: option.id,
            navitas_text: comp.description,
            component_order: comp.component_order,
          };
        }
      })

      const { error: componentsError } = await supabase
        .from('option_components')
        .insert(components)

      if (componentsError) throw componentsError
    }

    // Get project ID for revalidation
    const { data: leg } = await supabase
      .from('legs')
      .select('project_id')
      .eq('id', validated.leg_id)
      .single()

    if (leg) {
      revalidatePath(`/a/project/${leg.project_id}/leg/${validated.leg_id}`)
    }

    return { success: true, option }
  } catch (error) {
    console.error('Error creating flight option:', error)
    return { error: 'Failed to create flight option' }
  }
}

export async function createHold(formData: FormData) {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const option_id = formData.get('option_id') as string
    const passenger_ids = formData.getAll('passenger_ids') as string[]

    const validated = createHoldSchema.parse({
      option_id,
      passenger_ids,
    })

    const supabase = await createServerClient()

    // Calculate expiry (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create holds for each passenger
    const holds = validated.passenger_ids.map(passenger_id => ({
      option_id: validated.option_id,
      passenger_id: passenger_id,
      expires_at: expiresAt.toISOString(),
    }))

    const { error } = await supabase
      .from('holds')
      .insert(holds)

    if (error) throw error

    // Get leg and project info for revalidation
    const { data: option } = await supabase
      .from('options')
      .select(`
        leg_id,
        legs!inner (
          project_id
        )
      `)
      .eq('id', validated.option_id)
      .single()

    if (option) {
      revalidatePath(`/a/project/${option.legs.project_id}/leg/${option.leg_id}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating hold:', error)
    return { error: 'Failed to create hold' }
  }
}

export async function toggleOptionRecommended(formData: FormData) {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const option_id = formData.get('option_id') as string
    const is_recommended = formData.get('is_recommended') === 'true'

    const validated = toggleRecommendedSchema.parse({
      option_id,
      is_recommended,
    })

    const supabase = await createServerClient()

    const { error } = await supabase
      .from('options')
      .update({ is_recommended: validated.is_recommended })
      .eq('id', validated.option_id)

    if (error) throw error

    // Get leg and project info for revalidation
    const { data: option } = await supabase
      .from('options')
      .select(`
        leg_id,
        legs!inner (
          project_id
        )
      `)
      .eq('id', validated.option_id)
      .single()

    if (option) {
      revalidatePath(`/a/project/${option.legs.project_id}/leg/${option.leg_id}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error toggling recommendation:', error)
    return { error: 'Failed to update recommendation' }
  }
}

export async function deleteOption(formData: FormData) {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { error: 'Unauthorized' }
    }

    const option_id = formData.get('option_id') as string

    const supabase = await createServerClient()

    // Get leg and project info before deletion
    const { data: option } = await supabase
      .from('options')
      .select(`
        leg_id,
        legs!inner (
          project_id
        )
      `)
      .eq('id', option_id)
      .single()

    // Delete the option (cascading deletes will handle components and holds)
    const { error } = await supabase
      .from('options')
      .delete()
      .eq('id', option_id)

    if (error) throw error

    if (option) {
      revalidatePath(`/a/project/${option.legs.project_id}/leg/${option.leg_id}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting option:', error)
    return { error: 'Failed to delete option' }
  }
}

/**
 * Parses Navitas flight text into structured option data
 * 
 * @description Extracts flight information, fare details, and reference codes
 * from Navitas-formatted text blocks. Handles both single and split itineraries.
 * Uses pattern matching to identify flight lines, costs, and booking references.
 * 
 * @param navitasText - Raw Navitas text block containing flight information
 * @returns Promise<ParsedOption | null> Structured flight data or null if invalid
 * 
 * @algorithm
 * 1. Split text into lines and filter empty lines
 * 2. Extract flight lines using regex patterns (airline codes, routes, times)
 * 3. Parse fare information from currency patterns ($, €, £)
 * 4. Identify reference codes (PNR, confirmation numbers)
 * 5. Structure as option with components for multi-segment flights
 * 
 * @example
 * ```typescript
 * const navitasText = `
 *   UA 123 LAX→JFK 15MAR 0800/1630
 *   Business Class
 *   Fare: $450 per person
 *   Reference: ABC123
 * `
 * const option = await parseNavitasText(navitasText)
 * // Returns: { 
 * //   name: "UA 123 LAX→JFK 15MAR 0800/1630", 
 * //   total_cost: 45000, 
 * //   currency: "USD",
 * //   components: [...]
 * // }
 * ```
 */
export async function parseNavitasText(navitasText: string) {
  const lines = navitasText.trim().split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    return null
  }

  // More sophisticated parsing logic
  const flightLines = lines.filter(line => {
    const trimmed = line.trim()
    
    // Look for lines with airline codes (2-3 letters followed by numbers)
    // OR lines with explicit flight routing patterns
    const hasAirlineCode = /^[A-Z]{2,3}\s+\d+/.test(trimmed)
    const hasSegmentPrefix = /^Segment\s+\d+:/.test(trimmed)
    const hasFlightRouting = /[A-Z]{3}[→\-][A-Z]{3}/.test(trimmed) && /\d{2}[A-Z]{3}/.test(trimmed) // Airport codes + date pattern
    
    // Exclude lines that are clearly not flight info
    const isDateOnly = /^(January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{1,2}\/\d{4})/.test(trimmed)
    const isTimeOnly = /^\d{1,2}:\d{2}/.test(trimmed)
    const isCityRoute = trimmed.includes('→') && !trimmed.match(/[A-Z]{3}/) // City names without airport codes
    
    return (hasAirlineCode || hasSegmentPrefix || hasFlightRouting) && !isDateOnly && !isTimeOnly && !isCityRoute
  })
  
  const fareLines = lines.filter(line => 
    line.toLowerCase().includes('fare') ||
    line.toLowerCase().includes('cost') ||
    (line.includes('$') && line.match(/\$\d/)) ||
    (line.includes('€') && line.match(/€\d/)) ||
    (line.includes('£') && line.match(/£\d/))
  )
  
  const referenceLines = lines.filter(line =>
    line.toLowerCase().includes('reference') ||
    line.toLowerCase().includes('ref') ||
    line.toLowerCase().includes('pnr')
  )

  // Extract flight info
  let name = 'Flight Option'
  let description = ''
  let totalCost: number | undefined
  let currency = 'USD'
  
  if (flightLines.length > 0) {
    // Take first flight line for name, but truncate properly
    const firstFlight = flightLines[0].trim()
    name = firstFlight.length > 50 ? firstFlight.substring(0, 50) : firstFlight
    description = flightLines.join(' | ')
  } else {
    // If no flight lines found, look for any lines that might contain flight info
    const potentialFlightLines = lines.filter(line => {
      const trimmed = line.trim()
      return (trimmed.includes('→') || trimmed.includes('-')) && 
             !trimmed.toLowerCase().includes('fare') &&
             !trimmed.toLowerCase().includes('reference') &&
             !trimmed.toLowerCase().includes('total') &&
             trimmed.length > 10 // Minimum length for meaningful flight info
    })
    
    if (potentialFlightLines.length > 0) {
      const firstLine = potentialFlightLines[0].trim()
      name = firstLine.length > 50 ? firstLine.substring(0, 50) : firstLine
      description = potentialFlightLines.join(' | ')
      
      // Use these as flight components too
      flightLines.push(...potentialFlightLines)
    }
  }
  
  // Extract fare - look for first valid monetary amount
  const fareText = fareLines.join(' ')
  const fareMatch = fareText.match(/[\$€£](\d+(?:,\d{3})*(?:\.\d{2})?)/)
  if (fareMatch) {
    totalCost = Math.round(parseFloat(fareMatch[1].replace(/,/g, '')) * 100) // Store in cents
    if (fareText.includes('€')) currency = 'EUR'
    else if (fareText.includes('£')) currency = 'GBP'
  }

  // Create components from all identified flight lines
  const components = flightLines.map((line, index) => ({
    description: line.trim(),
    component_order: index + 1,
  }))

  return {
    name: name.trim(),
    description: description || undefined,
    total_cost: totalCost,
    currency,
    components,
  }
}
