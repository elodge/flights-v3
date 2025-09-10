/**
 * @fileoverview Budget Management Component for Employee Tour Management
 * 
 * @description Comprehensive budget management interface allowing employees to set
 * and manage budgets at tour, party, and person levels. Provides real-time tracking
 * of budget vs. actual spend with visual indicators and audit trail.
 * 
 * @access Employee only (agents/admins)
 * @security Uses RLS-protected budget actions
 * @database Reads/writes to budgets table
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  User, 
  Plus, 
  Edit, 
  Save, 
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { setBudget, getBudgetSnapshot, type BudgetSnapshot } from '@/lib/actions/budget-actions'
import { toast } from 'sonner'

interface BudgetRecord {
  id?: string
  level: 'tour' | 'party' | 'person'
  party?: string
  passenger_id?: string
  amount_cents: number
  notes?: string
}

interface BudgetManagementProps {
  projectId: string
  budgets: BudgetRecord[]
  snapshot: BudgetSnapshot | null
  tourPersonnel: Array<{
    id: string
    full_name: string
    party: string
  }>
}

/**
 * Budget Management Component
 * 
 * @description Provides comprehensive budget management interface for employees
 * @param projectId - UUID of the project
 * @param budgets - Current budget records
 * @param snapshot - Current budget snapshot with spend data
 * @param tourPersonnel - List of personnel for person-level budgets
 * @returns JSX.Element - Budget management interface
 * 
 * @security Employee-only access via parent component
 * @business_rule Budgets can be set at tour, party, or person level
 * @business_rule Person budgets override party budgets
 */
export function BudgetManagement({ 
  projectId, 
  budgets, 
  snapshot, 
  tourPersonnel 
}: BudgetManagementProps) {
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [newBudget, setNewBudget] = useState<Partial<BudgetRecord>>({})
  const [loading, setLoading] = useState(false)
  const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set())

  // CONTEXT: Group personnel by party for party-level budget management
  const personnelByParty = tourPersonnel.reduce((acc, person) => {
    if (!acc[person.party]) {
      acc[person.party] = []
    }
    acc[person.party].push(person)
    return acc
  }, {} as Record<string, typeof tourPersonnel>)

  // CONTEXT: Get current budget amounts by level
  const tourBudget = budgets.find(b => b.level === 'tour')
  const partyBudgets = budgets.filter(b => b.level === 'party')
  const personBudgets = budgets.filter(b => b.level === 'person')

  /**
   * Handles setting a new budget or updating an existing one
   * 
   * @description Calls setBudget action with validation and error handling
   * @param budgetData - Budget data to save
   */
  const handleSetBudget = async (budgetData: BudgetRecord) => {
    try {
      setLoading(true)
      
      const result = await setBudget({
        project_id: projectId,
        level: budgetData.level,
        party: budgetData.party,
        passenger_id: budgetData.passenger_id,
        amount_cents: budgetData.amount_cents,
        notes: budgetData.notes
      })

      if (result.success) {
        toast.success('Budget updated successfully')
        setEditingBudget(null)
        setNewBudget({})
        // CONTEXT: Refresh page to get updated budget data
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to update budget')
      }
    } catch (error) {
      console.error('Budget update error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Formats currency amount from cents to dollars
   * 
   * @param cents - Amount in cents
   * @returns Formatted currency string
   */
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  /**
   * Gets budget status color based on spend percentage
   * 
   * @param spent - Amount spent
   * @param budget - Total budget
   * @returns Color class for status indicator
   */
  const getBudgetStatusColor = (spent: number, budget: number) => {
    if (budget === 0) return 'text-muted-foreground'
    const percentage = (spent / budget) * 100
    if (percentage < 90) return 'text-green-600'
    if (percentage <= 100) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Overview
          </CardTitle>
          <CardDescription>
            Manage budgets at tour, party, and person levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(snapshot.totals.tour)}
                </div>
                <div className="text-sm text-muted-foreground">Total Budget</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getBudgetStatusColor(snapshot.spend.confirmed + snapshot.spend.pending, snapshot.totals.tour)}`}>
                  {formatCurrency(snapshot.spend.confirmed + snapshot.spend.pending)}
                </div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getBudgetStatusColor(snapshot.spend.confirmed + snapshot.spend.pending, snapshot.totals.tour)}`}>
                  {formatCurrency(snapshot.remaining.total)}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Management Tabs */}
      <Tabs defaultValue="tour" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tour">Tour Level</TabsTrigger>
          <TabsTrigger value="party">Party Level</TabsTrigger>
          <TabsTrigger value="person">Person Level</TabsTrigger>
        </TabsList>

        {/* Tour Level Budget */}
        <TabsContent value="tour" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tour Budget
              </CardTitle>
              <CardDescription>
                Set the overall budget for this tour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingBudget === 'tour' ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tour-amount">Budget Amount (USD)</Label>
                    <Input
                      id="tour-amount"
                      type="number"
                      step="0.01"
                      placeholder="50000.00"
                      value={newBudget.amount_cents ? newBudget.amount_cents / 100 : ''}
                      onChange={(e) => setNewBudget({
                        ...newBudget,
                        amount_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tour-notes">Notes (Optional)</Label>
                    <Textarea
                      id="tour-notes"
                      placeholder="Tour budget notes..."
                      value={newBudget.notes || ''}
                      onChange={(e) => setNewBudget({ ...newBudget, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleSetBudget({
                        level: 'tour',
                        amount_cents: newBudget.amount_cents || 0,
                        notes: newBudget.notes
                      })}
                      disabled={loading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Budget
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingBudget(null)
                        setNewBudget({})
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {tourBudget ? formatCurrency(tourBudget.amount_cents) : 'No budget set'}
                    </div>
                    {tourBudget?.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {tourBudget.notes}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => setEditingBudget('tour')}>
                    <Edit className="mr-2 h-4 w-4" />
                    {tourBudget ? 'Edit' : 'Set'} Budget
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Party Level Budget */}
        <TabsContent value="party" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Party Budgets
              </CardTitle>
              <CardDescription>
                Set budgets for each party (Artist, Management, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(personnelByParty).map(([party, personnel]) => {
                const partyBudget = partyBudgets.find(b => b.party === party)
                const isExpanded = expandedParties.has(party)
                
                return (
                  <div key={party} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newExpanded = new Set(expandedParties)
                            if (isExpanded) {
                              newExpanded.delete(party)
                            } else {
                              newExpanded.add(party)
                            }
                            setExpandedParties(newExpanded)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Badge variant="outline">{party}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {personnel.length} person{personnel.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold">
                          {partyBudget ? formatCurrency(partyBudget.amount_cents) : 'No budget'}
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => setEditingBudget(`party-${party}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {partyBudget ? 'Edit' : 'Set'}
                        </Button>
                      </div>
                    </div>

                    {editingBudget === `party-${party}` && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        <div>
                          <Label htmlFor={`party-${party}-amount`}>Budget Amount (USD)</Label>
                          <Input
                            id={`party-${party}-amount`}
                            type="number"
                            step="0.01"
                            placeholder="10000.00"
                            value={newBudget.amount_cents ? newBudget.amount_cents / 100 : ''}
                            onChange={(e) => setNewBudget({
                              ...newBudget,
                              amount_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`party-${party}-notes`}>Notes (Optional)</Label>
                          <Textarea
                            id={`party-${party}-notes`}
                            placeholder="Party budget notes..."
                            value={newBudget.notes || ''}
                            onChange={(e) => setNewBudget({ ...newBudget, notes: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleSetBudget({
                              level: 'party',
                              party: party,
                              amount_cents: newBudget.amount_cents || 0,
                              notes: newBudget.notes
                            })}
                            disabled={loading}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline" 
                            onClick={() => {
                              setEditingBudget(null)
                              setNewBudget({})
                            }}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <Collapsible open={isExpanded}>
                      <CollapsibleContent className="mt-4">
                        <div className="space-y-2">
                          {personnel.map((person) => {
                            const personBudget = personBudgets.find(b => b.passenger_id === person.id)
                            const isEditingPerson = editingBudget === `person-${person.id}`
                            
                            return (
                              <div key={person.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                                <span className="text-sm">{person.full_name}</span>
                                <div className="flex items-center gap-2">
                                  {isEditingPerson ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="5000.00"
                                        className="w-24 h-8 text-sm"
                                        value={newBudget.amount_cents ? newBudget.amount_cents / 100 : ''}
                                        onChange={(e) => setNewBudget({
                                          ...newBudget,
                                          amount_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                                        })}
                                      />
                                      <Button 
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleSetBudget({
                                          level: 'person',
                                          passenger_id: person.id,
                                          amount_cents: newBudget.amount_cents || 0,
                                          notes: newBudget.notes
                                        })}
                                        disabled={loading}
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => {
                                          setEditingBudget(null)
                                          setNewBudget({})
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-sm font-medium">
                                        {personBudget ? formatCurrency(personBudget.amount_cents) : 'No budget'}
                                      </span>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => {
                                          setEditingBudget(`person-${person.id}`)
                                          setNewBudget({
                                            amount_cents: personBudget?.amount_cents || 0,
                                            notes: personBudget?.notes || ''
                                          })
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Person Level Budget */}
        <TabsContent value="person" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Individual Person Budgets
              </CardTitle>
              <CardDescription>
                Set specific budgets for individual personnel (overrides party budgets)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tourPersonnel.map((person) => {
                const personBudget = personBudgets.find(b => b.passenger_id === person.id)
                const isEditing = editingBudget === `person-${person.id}`
                
                return (
                  <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{person.full_name}</div>
                      <Badge variant="outline" className="text-xs">{person.party}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="5000.00"
                            className="w-32"
                            value={newBudget.amount_cents ? newBudget.amount_cents / 100 : ''}
                            onChange={(e) => setNewBudget({
                              ...newBudget,
                              amount_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                            })}
                          />
                          <Button 
                            size="sm"
                            onClick={() => handleSetBudget({
                              level: 'person',
                              passenger_id: person.id,
                              amount_cents: newBudget.amount_cents || 0,
                              notes: newBudget.notes
                            })}
                            disabled={loading}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingBudget(null)
                              setNewBudget({})
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {personBudget ? formatCurrency(personBudget.amount_cents) : 'No budget'}
                          </span>
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingBudget(`person-${person.id}`)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
