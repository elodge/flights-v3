/**
 * @fileoverview Server actions for booking queue and ticketing operations
 * 
 * @description Handles booking queue operations including marking selections
 * as held/ticketed, PNR creation, and document management. Implements
 * business rules for 1 passenger per PNR and proper status transitions.
 * 
 * @access Employee only (agent, admin roles)
 * @database selections, pnrs, documents, holds
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const markHeldSchema = z.object({
  selection_id: z.string().uuid()
})

const markTicketedSchema = z.object({
  selection_id: z.string().uuid(),
  pnr_code: z.string().min(1, 'PNR code is required').max(10, 'PNR code too long')
})

const revertSelectionSchema = z.object({
  selection_id: z.string().uuid()
})

/**
 * Server action result type for consistent error handling
 */
interface ActionResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * Marks a selection as held
 * 
 * @description Updates selection status to 'held'. Note that this is separate
 * from the holds table which tracks specific hold expirations per passenger.
 * This status indicates the selection has been processed and held by the agent.
 * 
 * @param formData - Form data containing selection_id
 * @returns Promise<ActionResult> Success/error result
 * 
 * @business_rule Only employees can mark selections as held
 * @business_rule Selection must be in 'pending' status to be marked held
 */
export async function markHeld(formData: FormData): Promise<ActionResult> {
  try {
    // Authenticate user
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const rawData = {
      selection_id: formData.get('selection_id')
    }
    
    const validated = markHeldSchema.parse(rawData)
    const supabase = await createServerClient()

    // BUSINESS_RULE: Check current status before updating
    const { data: selection, error: fetchError } = await supabase
      .from('selections')
      .select('id, status, passenger_id')
      .eq('id', validated.selection_id)
      .single()

    if (fetchError || !selection) {
      return { success: false, error: 'Selection not found' }
    }

    if (selection.status !== 'pending') {
      return { success: false, error: `Cannot mark ${selection.status} selection as held` }
    }

    // ALGORITHM: Update selection status to held
    const { error: updateError } = await supabase
      .from('selections')
      .update({ 
        status: 'held',
        updated_at: new Date().toISOString()
      })
      .eq('id', validated.selection_id)

    if (updateError) {
      console.error('Error marking selection as held:', updateError)
      return { success: false, error: 'Failed to update selection status' }
    }

    // Revalidate relevant pages
    revalidatePath('/a/queue')
    revalidatePath('/c')

    return { 
      success: true, 
      data: { selection_id: validated.selection_id, status: 'held' }
    }

  } catch (error) {
    console.error('Error in markHeld:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Marks a selection as ticketed and creates/links PNR
 * 
 * @description Updates selection status to 'ticketed' and ensures PNR exists
 * for the passenger. Implements 1 passenger per PNR business rule.
 * 
 * @param formData - Form data containing selection_id and pnr_code
 * @returns Promise<ActionResult> Success/error result with PNR data
 * 
 * @business_rule Only employees can mark selections as ticketed
 * @business_rule Selection must be 'pending' or 'held' to be ticketed
 * @business_rule One PNR per passenger (unique on passenger_id + code)
 * @business_rule Ticketing can proceed even if hold expired (just informational)
 */
export async function markTicketed(formData: FormData): Promise<ActionResult> {
  try {
    // Authenticate user
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const rawData = {
      selection_id: formData.get('selection_id'),
      pnr_code: formData.get('pnr_code')
    }
    
    const validated = markTicketedSchema.parse(rawData)
    const supabase = await createServerClient()

    // BUSINESS_RULE: Fetch selection with passenger info
    const { data: selection, error: fetchError } = await supabase
      .from('selections')
      .select(`
        id, 
        status, 
        passenger_id,
        passenger:tour_personnel!passenger_id (
          id,
          full_name,
          project_id
        )
      `)
      .eq('id', validated.selection_id)
      .single()

    if (fetchError || !selection) {
      return { success: false, error: 'Selection not found' }
    }

    if (!['pending', 'held'].includes(selection.status)) {
      return { success: false, error: `Cannot ticket ${selection.status} selection` }
    }

    // BUSINESS_RULE: Check if PNR already exists for this passenger
    const { data: existingPnr } = await supabase
      .from('pnrs')
      .select('id, code')
      .eq('passenger_id', selection.passenger_id)
      .eq('code', validated.pnr_code)
      .single()

    let pnrId: string

    if (existingPnr) {
      // PNR already exists
      pnrId = existingPnr.id
    } else {
      // ALGORITHM: Create new PNR (1 passenger per PNR rule)
      const { data: newPnr, error: pnrError } = await supabase
        .from('pnrs')
        .insert({
          passenger_id: selection.passenger_id,
          code: validated.pnr_code,
          project_id: selection.passenger.project_id
        })
        .select('id')
        .single()

      if (pnrError) {
        console.error('Error creating PNR:', pnrError)
        return { success: false, error: 'Failed to create PNR' }
      }

      pnrId = newPnr.id
    }

    // ALGORITHM: Update selection status to ticketed
    const { error: updateError } = await supabase
      .from('selections')
      .update({ 
        status: 'ticketed',
        updated_at: new Date().toISOString()
      })
      .eq('id', validated.selection_id)

    if (updateError) {
      console.error('Error marking selection as ticketed:', updateError)
      return { success: false, error: 'Failed to update selection status' }
    }

    // Revalidate relevant pages
    revalidatePath('/a/queue')
    revalidatePath('/c')

    return { 
      success: true, 
      data: { 
        selection_id: validated.selection_id, 
        status: 'ticketed',
        pnr_id: pnrId,
        pnr_code: validated.pnr_code
      }
    }

  } catch (error) {
    console.error('Error in markTicketed:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Reverts a selection back to pending status
 * 
 * @description Allows reverting held or ticketed selections back to pending
 * for corrections. Does NOT delete PNRs as they may be referenced elsewhere.
 * 
 * @param formData - Form data containing selection_id
 * @returns Promise<ActionResult> Success/error result
 * 
 * @business_rule Only employees can revert selections
 * @business_rule Cannot revert cancelled selections
 * @business_rule PNRs are preserved even when reverting ticketed selections
 */
export async function revertToClientChoice(formData: FormData): Promise<ActionResult> {
  try {
    // Authenticate user
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const rawData = {
      selection_id: formData.get('selection_id')
    }
    
    const validated = revertSelectionSchema.parse(rawData)
    const supabase = await createServerClient()

    // BUSINESS_RULE: Check current status
    const { data: selection, error: fetchError } = await supabase
      .from('selections')
      .select('id, status')
      .eq('id', validated.selection_id)
      .single()

    if (fetchError || !selection) {
      return { success: false, error: 'Selection not found' }
    }

    if (selection.status === 'cancelled') {
      return { success: false, error: 'Cannot revert cancelled selection' }
    }

    if (selection.status === 'pending') {
      return { success: false, error: 'Selection is already pending' }
    }

    // ALGORITHM: Revert to pending status
    const { error: updateError } = await supabase
      .from('selections')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', validated.selection_id)

    if (updateError) {
      console.error('Error reverting selection:', updateError)
      return { success: false, error: 'Failed to revert selection status' }
    }

    // Revalidate relevant pages
    revalidatePath('/a/queue')
    revalidatePath('/c')

    return { 
      success: true, 
      data: { selection_id: validated.selection_id, status: 'pending' }
    }

  } catch (error) {
    console.error('Error in revertToClientChoice:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Gets booking queue statistics for dashboard
 * 
 * @description Fetches summary statistics for the booking queue including
 * counts by status, urgency levels, and expiring holds.
 * 
 * @returns Promise<ActionResult> Queue statistics data
 */
export async function getQueueStats(): Promise<ActionResult> {
  try {
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createServerClient()

    // Get selection counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('selections')
      .select('status')
      .not('status', 'eq', 'cancelled')

    if (statusError) {
      return { success: false, error: 'Failed to fetch queue statistics' }
    }

    // Calculate statistics
    const stats = {
      total: statusCounts.length,
      pending: statusCounts.filter(s => s.status === 'pending').length,
      held: statusCounts.filter(s => s.status === 'held').length,
      ticketed: statusCounts.filter(s => s.status === 'ticketed').length,
    }

    return { success: true, data: stats }

  } catch (error) {
    console.error('Error fetching queue stats:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
