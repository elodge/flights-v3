/**
 * @fileoverview Tour/Project management server actions
 * 
 * @description Server actions for creating and managing tours/projects.
 * Provides functionality for employees to create new tours with proper
 * validation and authorization.
 * 
 * @security Requires authenticated employee (agent/admin role)
 * @database Creates records in projects table
 * @business_rule Tours must have name, artist assignment, and valid dates
 */

'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * Schema for tour creation input validation
 */
const createTourSchema = z.object({
  name: z.string().min(1, 'Tour name is required').max(200, 'Tour name too long'),
  description: z.string().optional(),
  artist_id: z.string()
    .min(1, 'Artist is required')
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid artist ID format'),
  type: z.enum(['tour', 'event']).default('tour'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
}).refine((data) => {
  // BUSINESS_RULE: If both dates provided, end date must be after start date
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date']
})

export type CreateTourInput = z.infer<typeof createTourSchema>

/**
 * Creates a new tour/project
 * 
 * @description Creates a new tour with proper validation and employee authorization.
 * Automatically sets creator information and validates artist assignments.
 * 
 * @param payload - Tour creation data (name, artist_id, dates, description)
 * @returns Promise<{ success: boolean; tourId?: string; error?: string }>
 * 
 * @security Requires authenticated employee (agent/admin role)
 * @database Inserts into projects table with created_by reference
 * @business_rule Only employees can create tours
 * @business_rule Artist must exist and be accessible to user
 * 
 * @throws {Error} Authentication, validation, or database errors
 * 
 * @example
 * ```typescript
 * const result = await createTour({
 *   name: 'Summer 2024 Tour',
 *   artist_id: 'artist-uuid',
 *   type: 'tour',
 *   start_date: '2024-06-01',
 *   end_date: '2024-08-31',
 *   description: 'Multi-city summer tour'
 * })
 * ```
 */
export async function createTour(
  payload: CreateTourInput
): Promise<{ success: boolean; tourId?: string; error?: string }> {
  try {
    // CONTEXT: Authenticate and authorize user
    const user = await getServerUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }
    
    // CONTEXT: Only employees can create tours
    if (user.role === 'client') {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    // CONTEXT: Validate input data
    const validatedData = createTourSchema.parse(payload)
    
    const supabase = await createServerClient()
    
    // CONTEXT: Verify artist exists and user has access
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, name')
      .eq('id', validatedData.artist_id)
      .single()
    
    if (artistError || !artist) {
      return { success: false, error: 'Artist not found or access denied' }
    }
    
    // CONTEXT: Insert new tour
    const { data: newTour, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: validatedData.name,
        description: validatedData.description || null,
        artist_id: validatedData.artist_id,
        type: validatedData.type,
        start_date: validatedData.start_date || null,
        end_date: validatedData.end_date || null,
        is_active: true,
        created_by: user.id
      })
      .select('id')
      .single()
    
    if (insertError) {
      console.error('Error creating tour:', insertError)
      return { success: false, error: 'Failed to create tour' }
    }
    
    // CONTEXT: Revalidate employee portal to show new tour
    revalidatePath('/a')
    
    return { 
      success: true, 
      tourId: newTour.id 
    }
    
  } catch (error) {
    console.error('Error in createTour:', error)
    
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { 
        success: false, 
        error: firstError?.message || 'Validation failed' 
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

/**
 * Get list of artists for tour creation dropdown
 * 
 * @description Fetches available artists that the current user can create tours for
 * @returns Promise<{ success: boolean; artists?: Array; error?: string }>
 * 
 * @security Respects RLS policies for artist access
 * @database Queries artists table with user-specific filtering
 * @business_rule Returns only artists the user has permission to manage
 */
export async function getAvailableArtists(): Promise<{
  success: boolean
  artists?: Array<{ id: string; name: string; description: string | null }>
  error?: string
}> {
  try {
    const user = await getServerUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }
    
    if (user.role === 'client') {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const supabase = await createServerClient()
    
    // CONTEXT: Get artists based on user role and assignments
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name')
    
    if (error) {
      console.error('Error fetching artists:', error)
      return { success: false, error: 'Failed to fetch artists' }
    }
    
    return { 
      success: true, 
      artists: artists || [] 
    }
    
  } catch (error) {
    console.error('Error in getAvailableArtists:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}
