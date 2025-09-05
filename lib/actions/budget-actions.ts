/**
 * @fileoverview Budget management server actions
 * 
 * @description Server-side actions for budget calculation and management.
 * Provides read-only budget snapshots for clients and full CRUD operations
 * for employees. Integrates with selection pricing for real-time totals.
 * 
 * @access Mixed - clients read-only, employees full access
 * @security RLS enforced for all database operations
 * @database Reads from budgets, selections, options tables
 */

'use server'

import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'

export interface BudgetSnapshot {
  totals: {
    tour: number
    byParty: Record<string, number>
    byPerson: Record<string, number>
  }
  spend: {
    confirmed: number
    pending: number
    byParty: Record<string, number>
    byPerson: Record<string, number>
  }
  remaining: {
    total: number
    byParty: Record<string, number>
    byPerson: Record<string, number>
  }
}

export interface BudgetSnapshotResult {
  success: boolean
  error?: string
  data?: BudgetSnapshot
}

/**
 * Gets comprehensive budget snapshot for a project
 * 
 * @description Calculates current budget status including totals, confirmed
 * spend, pending selections, and remaining amounts. Aggregates data from
 * budget records and selection pricing for real-time accuracy.
 * 
 * @param projectId - UUID of the project to get budget snapshot for
 * @returns Promise<BudgetSnapshotResult> - Comprehensive budget data or error
 * 
 * @security RLS enforced - clients only see their assigned projects
 * @database Aggregates from budgets, selections, options tables
 * @business_rule Confirmed = ticketed selections, Pending = client_choice selections
 * @business_rule Budget totals come from budgets table, spend from selections
 * 
 * @example
 * ```typescript
 * const result = await getBudgetSnapshot('project-uuid')
 * if (result.success) {
 *   console.log(`Remaining: $${result.data.remaining.total}`)
 * }
 * ```
 */
export async function getBudgetSnapshot(projectId: string): Promise<BudgetSnapshotResult> {
  try {
    // SECURITY: Verify user authentication
    const user = await getServerUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }
    
    if (!projectId) {
      return {
        success: false,
        error: 'Project ID is required'
      }
    }
    
    const supabase = await createServerClient()
    
    // CONTEXT: Get budget totals configured for this project
    // SECURITY: RLS ensures user can only access their assigned projects
    const { data: budgets } = await supabase
      .from('budgets')
      .select('level, party, passenger_id, amount_cents')
      .eq('project_id', projectId)
    
    // CONTEXT: Get current spend from selections with option pricing
    // DATABASE: Join selections with options to get pricing data
    // BUSINESS_RULE: Include both confirmed (ticketed) and pending (client_choice)
    const { data: selections } = await supabase
      .from('selections')
      .select(`
        status,
        passenger_ids,
        options!inner (
          total_cost,
          currency,
          legs!inner (
            project_id
          )
        )
      `)
      .eq('options.legs.project_id', projectId)
      .in('status', ['ticketed', 'client_choice'])
    
    // ALGORITHM: Calculate budget totals by level
    const totals = {
      tour: 0,
      byParty: {} as Record<string, number>,
      byPerson: {} as Record<string, number>
    }
    
    if (budgets) {
      for (const budget of budgets) {
        const amount = budget.amount_cents / 100 // Convert cents to dollars
        
        switch (budget.level) {
          case 'tour':
            totals.tour += amount
            break
          case 'party':
            if (budget.party) {
              totals.byParty[budget.party] = (totals.byParty[budget.party] || 0) + amount
            }
            break
          case 'person':
            if (budget.passenger_id) {
              totals.byPerson[budget.passenger_id] = (totals.byPerson[budget.passenger_id] || 0) + amount
            }
            break
        }
      }
    }
    
    // ALGORITHM: Calculate current spend from selections
    const spend = {
      confirmed: 0,
      pending: 0,
      byParty: {} as Record<string, number>,
      byPerson: {} as Record<string, number>
    }
    
    if (selections) {
      for (const selection of selections) {
        const cost = selection.options?.total_cost || 0
        const passengerCount = selection.passenger_ids?.length || 1
        const totalCost = cost * passengerCount
        
        // BUSINESS_RULE: Categorize spend by selection status
        if (selection.status === 'ticketed') {
          spend.confirmed += totalCost
        } else if (selection.status === 'client_choice') {
          spend.pending += totalCost
        }
        
        // TODO: Add party and person breakdown when passenger party data available
        // This would require joining with tour_personnel to get party assignments
      }
    }
    
    // ALGORITHM: Calculate remaining amounts
    const totalSpend = spend.confirmed + spend.pending
    const remaining = {
      total: totals.tour - totalSpend,
      byParty: {} as Record<string, number>,
      byPerson: {} as Record<string, number>
    }
    
    // Calculate remaining by party and person
    for (const [party, partyTotal] of Object.entries(totals.byParty)) {
      const partySpend = spend.byParty[party] || 0
      remaining.byParty[party] = partyTotal - partySpend
    }
    
    for (const [personId, personTotal] of Object.entries(totals.byPerson)) {
      const personSpend = spend.byPerson[personId] || 0
      remaining.byPerson[personId] = personTotal - personSpend
    }
    
    return {
      success: true,
      data: {
        totals,
        spend,
        remaining
      }
    }
    
  } catch (error) {
    console.error('Budget snapshot error:', error)
    return {
      success: false,
      error: 'Failed to calculate budget snapshot'
    }
  }
}

/**
 * Creates or updates a budget record
 * 
 * @description Employee-only action to set budget amounts at tour, party,
 * or person level. Validates employee permissions and business rules.
 * 
 * @param params - Budget parameters including project_id, level, amount, etc.
 * @returns Promise<{success: boolean, error?: string}> - Operation result
 * 
 * @security Requires authenticated employee (agent/admin)
 * @database Inserts/updates budgets table
 * @business_rule Only one budget per level+party+person combination
 * 
 * @example
 * ```typescript
 * const result = await setBudget({
 *   project_id: 'project-uuid',
 *   level: 'tour',
 *   amount_cents: 500000, // $5,000
 *   notes: 'Total tour budget'
 * })
 * ```
 */
export async function setBudget(params: {
  project_id: string
  level: 'tour' | 'party' | 'person'
  party?: string
  passenger_id?: string
  amount_cents: number
  notes?: string
}) {
  try {
    // SECURITY: Verify employee authentication
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return {
        success: false,
        error: 'Employee access required'
      }
    }
    
    const supabase = await createServerClient()
    
    // CONTEXT: Upsert budget record with conflict resolution
    // BUSINESS_RULE: Only one budget per project+level+party+person combination
    const { error } = await supabase
      .from('budgets')
      .upsert({
        project_id: params.project_id,
        level: params.level,
        party: params.party || null,
        passenger_id: params.passenger_id || null,
        amount_cents: params.amount_cents,
        notes: params.notes || null,
        created_by: user.id
      })
    
    if (error) {
      console.error('Budget upsert error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update budget'
      }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Set budget error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}
