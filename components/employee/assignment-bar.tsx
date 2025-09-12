/**
 * @fileoverview Assignment bar component for compact leg management
 * 
 * @description Provides passenger filtering, search, party selection, and Navitas entry
 * functionality in a compact horizontal layout. Always visible above the main tabs.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions
 * @database Creates options via server actions
 */

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Search, Users, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { NavitasPanel } from './navitas-panel'

interface Passenger {
  treat_as_individual: boolean
  tour_personnel: {
    id: string
    full_name: string
    email: string | null
    role_title: string | null
    is_vip: boolean
  }
}

interface Filters {
  search: string
  parties: string[]
  showNoParty: boolean
  hasOptions: string
}

interface AssignmentBarProps {
  passengers: Passenger[]
  selectedPassengers: string[]
  onSelectionChange: (passengerIds: string[]) => void
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  legId: string
}

/**
 * Assignment bar component for compact leg management
 * 
 * @description Provides passenger filtering, search, party selection, and option entry
 * functionality in a compact horizontal layout. Handles bulk selection and option creation.
 * 
 * @param passengers - List of passengers assigned to the leg
 * @param selectedPassengers - Currently selected passenger IDs
 * @param onSelectionChange - Callback for selection changes
 * @param filters - Current filter state
 * @param onFiltersChange - Callback for filter changes
 * @param legId - Leg UUID for option creation
 * @returns JSX.Element - Assignment bar with filters and option entry
 * 
 * @security Uses existing RLS/RBAC through server actions
 * @database Creates options via server actions
 * @business_rule Maintains one-passenger-per-PNR selection model
 * 
 * @example
 * ```tsx
 * <AssignmentBar
 *   passengers={legPassengers}
 *   selectedPassengers={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   legId="leg-uuid"
 * />
 * ```
 */
export function AssignmentBar({
  passengers,
  selectedPassengers,
  onSelectionChange,
  filters,
  onFiltersChange,
  legId
}: AssignmentBarProps) {
  const [showNavitasPanel, setShowNavitasPanel] = useState(false)

  // CONTEXT: Get unique parties from passengers
  const availableParties = Array.from(new Set(
    passengers
      .map(p => p.tour_personnel.role_title)
      .filter(Boolean)
  )) as string[]

  // CONTEXT: Handle passenger selection
  const handleSelectPassenger = (passengerId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedPassengers, passengerId])
    } else {
      onSelectionChange(selectedPassengers.filter(id => id !== passengerId))
    }
  }

  // CONTEXT: Handle select all/none
  const handleSelectAll = () => {
    if (selectedPassengers.length === passengers.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(passengers.map(p => p.tour_personnel.id))
    }
  }

  // CONTEXT: Handle party filter toggle
  const handlePartyToggle = (party: string) => {
    const newParties = filters.parties.includes(party)
      ? filters.parties.filter(p => p !== party)
      : [...filters.parties, party]
    
    onFiltersChange({ ...filters, parties: newParties })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Filters Row */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search passengers..."
                  value={filters.search}
                  onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Party Filters */}
            {availableParties.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Parties:</span>
                <div className="flex items-center space-x-1">
                  {availableParties.map(party => (
                    <Badge
                      key={party}
                      variant={filters.parties.includes(party) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handlePartyToggle(party)}
                    >
                      {party}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* No Party Filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="no-party"
                checked={filters.showNoParty}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, showNoParty: !!checked })
                }
              />
              <label htmlFor="no-party" className="text-sm">
                No party
              </label>
            </div>

            {/* Clear Filters */}
            {(filters.search || filters.parties.length > 0 || filters.showNoParty) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({
                  search: '',
                  parties: [],
                  showNoParty: false,
                  hasOptions: 'all'
                })}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Passenger Selection Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedPassengers.length === passengers.length && passengers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({passengers.length})
                </label>
              </div>
              
              {selectedPassengers.length > 0 && (
                <Badge variant="secondary">
                  {selectedPassengers.length} selected
                </Badge>
              )}
            </div>

            {/* Add Options Button */}
            <Button
              onClick={() => setShowNavitasPanel(!showNavitasPanel)}
              disabled={selectedPassengers.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Options ({selectedPassengers.length})
            </Button>
          </div>

          {/* Passenger List */}
          <div className="max-h-32 overflow-y-auto border rounded-md">
            <div className="p-2 space-y-1">
              {passengers.map(passenger => (
                <div key={passenger.tour_personnel.id} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                  <Checkbox
                    checked={selectedPassengers.includes(passenger.tour_personnel.id)}
                    onCheckedChange={(checked) => 
                      handleSelectPassenger(passenger.tour_personnel.id, !!checked)
                    }
                  />
                  <span className="text-sm font-medium">{passenger.tour_personnel.full_name}</span>
                  {passenger.tour_personnel.role_title && (
                    <Badge variant="outline" className="text-xs">
                      {passenger.tour_personnel.role_title}
                    </Badge>
                  )}
                  {passenger.tour_personnel.is_vip && (
                    <Badge variant="secondary" className="text-xs">VIP</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Option Entry Panels */}
          <Collapsible open={showNavitasPanel} onOpenChange={setShowNavitasPanel}>
            <CollapsibleContent className="space-y-2">
              <NavitasPanel
                selectedPassengers={selectedPassengers}
                legId={legId}
                onSuccess={() => {
                  setShowNavitasPanel(false)
                  onSelectionChange([])
                }}
              />
            </CollapsibleContent>
          </Collapsible>

        </div>
      </CardContent>
    </Card>
  )
}
