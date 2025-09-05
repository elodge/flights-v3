/**
 * @fileoverview Budget sidebar component for client project overview
 * 
 * @description Sticky sidebar displaying real-time budget summary including
 * total budget, confirmed spend, pending selections, and remaining balance.
 * Updates live when selections change and shows color-coded status indicators.
 * 
 * @access Client-side component
 * @security Read-only budget display via RLS-protected queries
 * @database Reads budget data and selection totals
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { getBudgetSnapshot } from '@/lib/actions/budget-actions'

interface BudgetSnapshot {
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

interface BudgetSidebarProps {
  projectId: string
}

/**
 * Budget sidebar component with live updates
 * 
 * @description Displays comprehensive budget overview with real-time updates
 * when selections change. Shows total budget, confirmed/pending spend, and
 * remaining balance with color-coded status indicators.
 * 
 * @param projectId - UUID of the project to show budget for
 * @returns JSX.Element - Sticky sidebar with budget summary
 * 
 * @security Read-only access via RLS-protected budget actions
 * @business_rule Color thresholds: green (<90%), yellow (90-100%), red (>100%)
 * @business_rule Live updates when selection totals change
 * 
 * @example
 * ```tsx
 * <BudgetSidebar projectId="project-uuid" />
 * ```
 */
export function BudgetSidebar({ projectId }: BudgetSidebarProps) {
  const [budget, setBudget] = useState<BudgetSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Fetches current budget snapshot from server
   * 
   * @description Calls budget action to get comprehensive budget data
   * including totals, spend, and remaining amounts with party breakdown.
   * 
   * @security Uses RLS-protected getBudgetSnapshot action
   * @business_rule Aggregates from selections and option prices
   */
  const fetchBudgetSnapshot = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // CONTEXT: Get comprehensive budget data via server action
      // SECURITY: RLS ensures client only sees their assigned project budgets
      const result = await getBudgetSnapshot(projectId)
      
      if (result.success) {
        setBudget(result.data)
      } else {
        setError(result.error || 'Failed to load budget data')
      }
    } catch (error) {
      console.error('Budget fetch error:', error)
      setError('An error occurred while loading budget data')
    } finally {
      setLoading(false)
    }
  }
  
  // CONTEXT: Load budget data on mount and set up refresh interval
  useEffect(() => {
    fetchBudgetSnapshot()
    
    // BUSINESS_RULE: Refresh budget every 30 seconds for live updates
    // This ensures the sidebar reflects recent selection changes
    const interval = setInterval(fetchBudgetSnapshot, 30 * 1000)
    
    return () => clearInterval(interval)
  }, [projectId])
  
  /**
   * Determines budget status color based on spend percentage
   * 
   * @description Calculates percentage of budget used and returns appropriate
   * color class for visual status indication.
   * 
   * @param spent - Amount currently spent (confirmed + pending)
   * @param total - Total budget amount
   * @returns Object with color classes and status text
   * 
   * @business_rule Color thresholds: green (<90%), yellow (90-100%), red (>100%)
   */
  const getBudgetStatus = (spent: number, total: number) => {
    if (total === 0) return { color: 'text-muted-foreground', bg: 'bg-gray-100', status: 'No budget set' }
    
    const percentage = (spent / total) * 100
    
    if (percentage >= 100) {
      return { color: 'text-red-600', bg: 'bg-red-100', status: 'Over budget', percentage }
    } else if (percentage >= 90) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'Near limit', percentage }
    } else {
      return { color: 'text-green-600', bg: 'bg-green-100', status: 'On track', percentage }
    }
  }
  
  if (loading) {
    return (
      <div className="sticky top-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error || !budget) {
    return (
      <div className="sticky top-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error || 'Budget data unavailable'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const totalSpent = budget.spend.confirmed + budget.spend.pending
  const status = getBudgetStatus(totalSpent, budget.totals.tour)
  
  return (
    <div className="sticky top-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Summary
          </CardTitle>
          <CardDescription>
            Real-time project budget tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Status */}
          <div className={`p-3 rounded-lg ${status.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${status.color}`}>{status.status}</span>
              {status.percentage !== undefined && (
                <span className={`text-sm ${status.color}`}>
                  {status.percentage.toFixed(1)}%
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total Budget</span>
                <span className="font-medium">${budget.totals.tour.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining</span>
                <span className={`font-medium ${status.color}`}>
                  ${budget.remaining.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Spend Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Spend Breakdown</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Confirmed</span>
              </div>
              <span className="font-medium">${budget.spend.confirmed.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Pending</span>
              </div>
              <span className="font-medium">${budget.spend.pending.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between border-t pt-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total Spend</span>
              </div>
              <span className="font-bold">${totalSpent.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Party Breakdown (if configured) */}
          {Object.keys(budget.totals.byParty).length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm">By Party</h4>
                {Object.entries(budget.totals.byParty).map(([party, total]) => {
                  const partySpent = (budget.spend.byParty[party] || 0)
                  const partyRemaining = (budget.remaining.byParty[party] || 0)
                  const partyStatus = getBudgetStatus(partySpent, total)
                  
                  return (
                    <div key={party} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Party {party}</span>
                        <Badge variant="outline" className={partyStatus.color}>
                          ${partyRemaining.toLocaleString()} left
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${partySpent.toLocaleString()} of ${total.toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          
          {/* Last Updated */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
