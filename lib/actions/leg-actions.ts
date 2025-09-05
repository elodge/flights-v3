/**
 * @fileoverview Server actions for leg management operations
 * 
 * @description Provides server-side functions for creating, updating, and managing
 * flight legs within tours. Includes employee role enforcement and validation.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses server-side authentication and RLS enforcement
 * @database Writes to legs table with proper foreign key relationships
 */

'use server'

import { revalidatePath } from 'next/cache'
import { getServerUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * Zod schema for leg creation validation
 * 
 * @description Validates leg creation form data with proper constraints
 * for destination, dates, and optional fields.
 * 
 * @business_rule Destination is required, 2-80 characters
 * @business_rule If both dates provided, arrival_date >= departure_date
 */
const createLegSchema = z.object({
  destination: z.string()
    .min(2, 'Destination must be at least 2 characters')
    .max(80, 'Destination must be less than 80 characters'),
  origin: z.string().optional(),
  departure_date: z.string().optional(),
  arrival_date: z.string().optional(),
  label: z.string().optional()
}).refine((data) => {
  // CONTEXT: Validate date order if both dates are provided
  if (data.departure_date && data.arrival_date) {
    const departure = new Date(data.departure_date)
    const arrival = new Date(data.arrival_date)
    return arrival >= departure
  }
  return true
}, {
  message: 'Arrival date must be on or after departure date',
  path: ['arrival_date']
})

type CreateLegInput = z.infer<typeof createLegSchema>

/**
 * Creates a new flight leg for a tour
 * 
 * @description Inserts a new leg into the database with proper validation
 * and employee role enforcement. Automatically sets leg_order based on
 * existing legs in the tour.
 * 
 * @param projectId - UUID of the tour/project to add the leg to
 * @param payload - Leg creation data (destination, origin, dates, label)
 * @returns Promise<{ success: boolean; legId?: string; error?: string }>
 * 
 * @security Requires authenticated employee (agent/admin role)
 * @database Inserts into legs table with project_id foreign key
 * @business_rule Sets created_by to current user ID
 * @business_rule Automatically calculates leg_order as next sequential number
 * 
 * @throws {Error} Authentication, validation, or database errors
 * 
 * @example
 * ```typescript
 * const result = await createLeg('tour-uuid', {
 *   destination: 'New York, NY',
 *   origin: 'Los Angeles, CA',
 *   departure_date: '2024-03-15',
 *   arrival_date: '2024-03-15',
 *   label: 'E2E Test Leg'
 * })
 * ```
 */
export async function createLeg(
  projectId: string,
  payload: CreateLegInput
): Promise<{ success: boolean; legId?: string; error?: string }> {
  try {
    // CONTEXT: Authenticate and authorize user
    const user = await getServerUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }
    
    // CONTEXT: Only employees can create legs
    if (user.role === 'client') {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    // CONTEXT: Validate input data
    const validatedData = createLegSchema.parse(payload)
    
    const supabase = await createServerClient()
    
    // CONTEXT: Get the next leg order for this tour
    const { data: existingLegs, error: orderError } = await supabase
      .from('legs')
      .select('leg_order')
      .eq('project_id', projectId)
      .order('leg_order', { ascending: false })
      .limit(1)
    
    if (orderError) {
      console.error('Error fetching leg order:', orderError)
      return { success: false, error: 'Failed to determine leg order' }
    }
    
    const nextOrder = existingLegs && existingLegs.length > 0 
      ? existingLegs[0].leg_order + 1 
      : 1
    
    // CONTEXT: Insert new leg with calculated order
    const { data: newLeg, error: insertError } = await supabase
      .from('legs')
      .insert({
        project_id: projectId,
        destination_city: validatedData.destination,
        origin_city: validatedData.origin || null,
        departure_date: validatedData.departure_date || null,
        arrival_date: validatedData.arrival_date || null,
        label: validatedData.label || null,
        leg_order: nextOrder,
        created_by: user.id
      })
      .select('id')
      .single()
    
    if (insertError) {
      console.error('Error creating leg:', insertError)
      return { success: false, error: 'Failed to create leg' }
    }
    
    // CONTEXT: Revalidate the tour page to show new leg
    revalidatePath(`/a/tour/${projectId}`)
    
    return { 
      success: true, 
      legId: newLeg.id 
    }
    
  } catch (error) {
    console.error('Error in createLeg:', error)
    
    if (error instanceof z.ZodError) {
      // CONTEXT: Access ZodError issues directly since errors property may not be serializable
      const issues = (error as any).issues || error.errors || []
      const firstIssue = issues[0]
      return { 
        success: false, 
        error: firstIssue?.message || 'Validation failed' 
      }
    }
    
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    }
  }
}
