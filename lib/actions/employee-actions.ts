'use server'

import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Schema for assigning passengers to a leg
const assignPassengersSchema = z.object({
  leg_id: z.string().uuid(),
  passenger_ids: z.array(z.string().uuid()),
})

// Schema for creating flight options
const createOptionSchema = z.object({
  leg_id: z.string().uuid(),
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
  option_id: z.string().uuid(),
  passenger_ids: z.array(z.string().uuid()),
})

// Schema for toggling option recommendation
const toggleRecommendedSchema = z.object({
  option_id: z.string().uuid(),
  is_recommended: z.boolean(),
})

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

    // Remove existing assignments for these passengers on this leg
    await supabase
      .from('leg_passengers')
      .delete()
      .eq('leg_id', validated.leg_id)
      .in('passenger_id', validated.passenger_ids)

    // Add new assignments
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
      const components = validated.components.map(comp => ({
        option_id: option.id,
        navitas_text: comp.description,
        component_order: comp.component_order,
      }))

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

// Utility function to parse Navitas text
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
