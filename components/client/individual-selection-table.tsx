/**
 * @fileoverview Individual passenger selection table component
 * 
 * @description Table interface for individual passenger flight option selection.
 * Allows clients to select different options for passengers marked as
 * treat_as_individual=true, with real-time status updates and selection tracking.
 * 
 * @access Client-side component
 * @security Client-only operations via RLS-protected selection actions
 * @database Updates selections via selectFlightOption action
 */

'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { selectFlightOption } from '@/lib/actions/selection-actions'
import { useHoldCountdown } from '@/hooks/use-hold-countdown'

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

interface Selection {
  id: string
  status: string
  passenger_id: string
  selected_at: string
  expires_at: string | null
  notes: string | null
}

interface Hold {
  id: string
  expires_at: string
  tour_personnel: {
    full_name: string
  }
}

interface FlightOption {
  id: string
  name: string
  description: string | null
  total_cost: number | null
  currency: string | null
  is_recommended: boolean
  is_available: boolean
  selections: Selection[]
  holds: Hold[]
}

interface IndividualSelectionTableProps {
  passengers: Passenger[]
  options: FlightOption[]
  legId: string
}

/**
 * Individual passenger selection table component
 * 
 * @description Table interface allowing selection of different flight options
 * for individual passengers. Shows current selections, provides option picker,
 * and displays selection status with real-time updates.
 * 
 * @param passengers - Array of passengers marked for individual selection
 * @param options - Available flight options for this leg
 * @param legId - UUID of the leg being selected for
 * @returns JSX.Element - Table with passenger rows and option selectors
 * 
 * @security Uses RLS-protected selection actions
 * @business_rule Only shows passengers with treat_as_individual=true
 * @business_rule Each passenger can have different option selection
 * 
 * @example
 * ```tsx
 * <IndividualSelectionTable
 *   passengers={individualPassengers}
 *   options={availableOptions}
 *   legId="leg-uuid"
 * />
 * ```
 */
export function IndividualSelectionTable({ passengers, options, legId }: IndividualSelectionTableProps) {
  const [selectingFor, setSelectingFor] = useState<string | null>(null)
  
  /**
   * Gets current selection for a specific passenger
   * 
   * @description Finds the selection record for the specific passenger ID.
   * Used to show current selection status.
   * 
   * @param passengerId - UUID of the passenger to check
   * @returns Selection object or undefined if no selection found
   * 
   * @business_rule Individual selections have specific passenger_id matching
   */
  const getPassengerSelection = (passengerId: string): Selection | undefined => {
    for (const option of options) {
      const selection = option.selections.find(s => s.passenger_id === passengerId)
      if (selection) return selection
    }
    return undefined
  }
  
  /**
   * Gets the option that a passenger has selected
   * 
   * @description Finds which option (if any) the passenger has currently selected
   * by checking selection records across all options.
   * 
   * @param passengerId - UUID of the passenger to check
   * @returns FlightOption object or undefined if no selection
   */
  const getSelectedOption = (passengerId: string): FlightOption | undefined => {
    for (const option of options) {
      const hasSelection = option.selections.some(s => s.passenger_id === passengerId)
      if (hasSelection) return option
    }
    return undefined
  }
  
  /**
   * Handles individual passenger option selection
   * 
   * @description Creates a selection for a specific passenger by calling
   * the selection action with the passenger ID.
   * 
   * @param passengerId - UUID of the passenger making the selection
   * @param optionId - UUID of the option being selected
   * 
   * @security Uses RLS-protected selectFlightOption action
   * @business_rule Individual selections use passenger_ids array with single ID
   */
  const handleIndividualSelection = async (passengerId: string, optionId: string) => {
    setSelectingFor(passengerId)
    
    try {
      // CONTEXT: Individual selection with specific passenger ID
      // BUSINESS_RULE: passenger_ids array contains single passenger for individual selection
      const result = await selectFlightOption({
        leg_id: legId,
        option_id: optionId,
        passenger_ids: [passengerId]
      })
      
      if (result.success) {
        toast.success('Individual selection updated successfully')
      } else {
        toast.error(result.error || 'Failed to update selection')
      }
    } catch (error) {
      console.error('Individual selection error:', error)
      toast.error('An error occurred while updating selection')
    } finally {
      setSelectingFor(null)
    }
  }
  
  /**
   * Gets display status for a passenger's selection
   * 
   * @description Determines the visual status (badge) to show for a passenger
   * based on their current selection and any holds on that option.
   * 
   * @param passengerId - UUID of the passenger to check status for
   * @returns Object with status type and display component
   */
  const getPassengerStatus = (passengerId: string) => {
    const selection = getPassengerSelection(passengerId)
    const selectedOption = getSelectedOption(passengerId)
    
    if (!selection || !selectedOption) {
      return { type: 'none', badge: null }
    }
    
    // CONTEXT: Check for active holds on the selected option
    const activeHold = selectedOption.holds.find(h => 
      new Date(h.expires_at) > new Date()
    )
    
    // ALGORITHM: Priority order for status display
    if (selection.status === 'ticketed') {
      return { 
        type: 'ticketed', 
        badge: <Badge className="bg-green-100 text-green-800">Ticketed</Badge>
      }
    }
    
    if (selection.status === 'client_choice') {
      if (activeHold) {
        return { 
          type: 'held', 
          badge: (
            <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <HoldCountdownDisplay expiresAt={activeHold.expires_at} />
            </Badge>
          )
        }
      }
      
      return { 
        type: 'selected', 
        badge: <Badge className="bg-yellow-100 text-yellow-800">Selected</Badge>
      }
    }
    
    return { type: 'none', badge: null }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Individual Selections
        </CardTitle>
        <CardDescription>
          Select different options for individual passengers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Passenger</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Current Selection</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passengers.map((passenger) => {
              const passengerId = passenger.tour_personnel.id
              const selectedOption = getSelectedOption(passengerId)
              const status = getPassengerStatus(passengerId)
              const isSelecting = selectingFor === passengerId
              
              return (
                <TableRow key={passengerId}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{passenger.tour_personnel.full_name}</span>
                      {passenger.tour_personnel.is_vip && (
                        <Badge variant="secondary" className="w-fit mt-1">VIP</Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {passenger.tour_personnel.role_title || 'Passenger'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {selectedOption ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{selectedOption.name}</span>
                        {selectedOption.total_cost && (
                          <span className="text-sm text-muted-foreground">
                            {selectedOption.currency || '$'}{selectedOption.total_cost.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No selection</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {status.badge}
                  </TableCell>
                  
                  <TableCell>
                    {status.type !== 'ticketed' ? (
                      <Select
                        disabled={isSelecting}
                        onValueChange={(optionId) => handleIndividualSelection(passengerId, optionId)}
                        value={selectedOption?.id || ''}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={isSelecting ? 'Selecting...' : 'Choose option'} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              <div className="flex flex-col">
                                <span>{option.name}</span>
                                {option.total_cost && (
                                  <span className="text-sm text-muted-foreground">
                                    {option.currency || '$'}{option.total_cost.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">Locked</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/**
 * Hold countdown display component for table cells
 * 
 * @description Small wrapper component to display hold countdown in table cells
 * without cluttering the main component logic.
 * 
 * @param expiresAt - ISO timestamp string of when hold expires
 * @returns JSX.Element - Formatted countdown text
 */
function HoldCountdownDisplay({ expiresAt }: { expiresAt: string }) {
  const countdown = useHoldCountdown(expiresAt)
  return <span>{countdown}</span>
}
