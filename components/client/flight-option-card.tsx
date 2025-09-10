/**
 * @fileoverview Flight option card component for client selection interface
 * 
 * @description Interactive card displaying flight option details with selection
 * actions, status visualization, and hold countdown. Uses FlightSegmentRow for
 * consistent flight display across client and agent interfaces. Parses both
 * structured data and Navitas text for maximum compatibility.
 * 
 * @access Client-side component
 * @security Client-only operations via RLS-protected RPC calls
 * @database Reads option_components with airline_iata, flight_number, navitas_text
 * @business_rule Uses same flight parsing logic as agent interface via normalizeSegment
 * @business_rule Displays airline logos via Logo.dev proxy when available
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, Star, Plane, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useHoldCountdown } from '@/hooks/use-hold-countdown'
import { selectFlightOption } from '@/lib/actions/selection-actions'
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow'

/**
 * DECISION: Use FlightSegmentRow instead of custom enrichment display
 * 
 * RATIONALE: Client and agent interfaces should display flight data identically.
 * FlightSegmentRow uses normalizeSegment which handles both structured data and
 * Navitas text parsing, eliminating the need for client-side API enrichment.
 * 
 * MIGRATION: Removed complex enrichment logic, useAviationStack hook, and 
 * conditional rendering in favor of simple FlightSegmentRow mapping.
 * 
 * ALTERNATIVES: Could have kept separate enrichment logic, but this creates
 * inconsistency and maintenance burden between client and agent displays.
 */

interface OptionComponent {
  id: string
  component_order: number
  navitas_text: string
  flight_number: string | null
  airline: string | null
  departure_time: string | null
  arrival_time: string | null
  aircraft_type: string | null
  seat_configuration: string | null
  meal_service: string | null
  baggage_allowance: string | null
  cost: number | null
  currency: string | null
  // Manual option fields
  airline_iata?: string | null
  airline_name?: string | null
  dep_iata?: string | null
  arr_iata?: string | null
  dep_time_local?: string | null
  arr_time_local?: string | null
  day_offset?: number | null
  stops?: number | null
  duration_minutes?: number | null
  enriched_terminal_gate?: {
    dep_terminal?: string | null
    dep_gate?: string | null
    arr_terminal?: string | null
    arr_gate?: string | null
  } | null
  // Server-side enrichment fields
  enriched_aircraft_type?: string | null
  enriched_aircraft_name?: string | null
  enriched_status?: string | null
  enriched_dep_terminal?: string | null
  enriched_arr_terminal?: string | null
  enriched_dep_gate?: string | null
  enriched_arr_gate?: string | null
  enriched_dep_scheduled?: string | null
  enriched_arr_scheduled?: string | null
  enriched_duration?: number | null
  enrichment_source?: string | null
  enrichment_fetched_at?: string | null
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
  passenger_id: string
  expires_at: string
  notes: string | null
  created_by: string | null
}

interface FlightOption {
  id: string
  name: string
  description: string | null
  total_cost: number | null
  currency: string | null
  is_recommended: boolean
  is_available: boolean
  option_components: OptionComponent[]
  selections: Selection[]
  holds: Hold[]
}

interface FlightOptionCardProps {
  option: FlightOption
  legId: string
  selectionType: 'group' | 'individual'
  passengerIds: string[] | null
}

/**
 * Flight option card component for client selection
 * 
 * @description Interactive card showing flight option details with status-aware
 * selection interface. Uses FlightSegmentRow components for consistent flight
 * display matching agent interface. Handles both manual and Navitas options.
 * 
 * @param option - Flight option data with components, selections, and holds
 * @param legId - UUID of the leg this option belongs to
 * @param selectionType - Whether this is for group or individual selection
 * @param passengerIds - Array of passenger UUIDs for individual selection, null for group
 * @returns JSX.Element - Interactive option card with selection button and flight segments
 * 
 * @security Uses RLS-protected RPC calls for selections
 * @database Uses option_components with both structured fields and navitas_text fallback
 * @business_rule Group selections apply to all passengers, individual use specific passenger_id
 * @business_rule Cannot select expired or ticketed options
 * @business_rule FlightSegmentRow handles data parsing via normalizeSegment function
 * 
 * @example
 * ```tsx
 * <FlightOptionCard
 *   option={flightOption}
 *   legId="leg-uuid"
 *   selectionType="group"
 *   passengerIds={null}
 * />
 * ```
 */
export function FlightOptionCard({ option, legId, selectionType, passengerIds }: FlightOptionCardProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  
  // CONTEXT: Determine current selection status for this option
  // BUSINESS_RULE: Check if current user/passengers have selected this option
  const currentSelection = selectionType === 'group'
    ? option.selections[0] // For group, any selection represents the group choice
    : option.selections.find(s => 
        passengerIds && passengerIds.includes(s.passenger_id)
      )
  
  // CONTEXT: Get active hold information for countdown display
  const activeHold = option.holds.find(h => 
    new Date(h.expires_at) > new Date()
  )
  
  const holdCountdown = useHoldCountdown(activeHold?.expires_at)
  
  // CONTEXT: Get first component for header display
  const firstComponent = option.option_components[0]
  
  
  // CONTEXT: Determine visual status for the card
  // ALGORITHM: Priority order - ticketed > selected > held > expired > neutral
  const getStatus = () => {
    if (currentSelection?.status === 'ticketed') return 'ticketed'
    if (currentSelection?.status === 'client_choice') return 'selected'
    if (activeHold) return 'held'
    if (option.holds.some(h => new Date(h.expires_at) <= new Date())) return 'expired'
    return 'neutral'
  }
  
  const status = getStatus()
  
  /**
   * Handles option selection for group or individual passengers
   * 
   * @description Calls the RPC function to create a selection record.
   * Shows loading state and toast feedback for user experience.
   * 
   * @security Uses RLS-protected rpc_client_select_option
   * @business_rule Cannot select if already ticketed or expired
   */
  const handleSelect = async () => {
    if (status === 'ticketed' || status === 'expired') return
    
    setIsSelecting(true)
    
    try {
      // CONTEXT: Call selection RPC with appropriate passenger_ids
      // BUSINESS_RULE: Group selections use null, individual use specific IDs
      const result = await selectFlightOption({
        leg_id: legId,
        option_id: option.id,
        passenger_ids: selectionType === 'group' ? null : passengerIds
      })
      
      if (result.success) {
        toast.success(
          selectionType === 'group' 
            ? 'Group selection updated successfully'
            : 'Individual selection updated successfully'
        )
      } else {
        toast.error(result.error || 'Failed to update selection')
      }
    } catch (error) {
      console.error('Selection error:', error)
      toast.error('An error occurred while updating your selection')
    } finally {
      setIsSelecting(false)
    }
  }
  
  
  // CONTEXT: Get status-specific styling
  const getCardStyling = () => {
    switch (status) {
      case 'ticketed':
        return 'border-green-200 bg-green-50'
      case 'selected':
        return 'border-yellow-200 bg-yellow-50'
      case 'held':
        return 'border-blue-200 bg-blue-50'
      case 'expired':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-border bg-card'
    }
  }
  
  const getStatusBadge = () => {
    switch (status) {
      case 'ticketed':
        return <Badge className="bg-green-100 text-green-800">Ticketed</Badge>
      case 'selected':
        return <Badge className="bg-yellow-100 text-yellow-800">Selected</Badge>
      case 'held':
        return (
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {holdCountdown}
          </Badge>
        )
      case 'expired':
        return <Badge variant="destructive">Price not guaranteed</Badge>
      default:
        return null
    }
  }
  
  const isSelectable = status !== 'ticketed' && status !== 'expired'
  
  return (
    <Card className={`transition-all duration-200 ${getCardStyling()}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {option.name}
              {option.is_recommended && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </CardTitle>
            {option.description && (
              <CardDescription className="mt-1">
                {option.description}
              </CardDescription>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            {option.total_cost && (
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {option.currency || '$'}{option.total_cost.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Flight Segments */}
          {/* CONTEXT: Unified flight display using same component as agent interface */}
          {/* BUSINESS_RULE: FlightSegmentRow handles both structured data and Navitas text parsing */}
          {/* DATABASE: Uses option_components with airline_iata, flight_number, navitas_text fields */}
          {option.option_components.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-muted-foreground">Flight Segments</h5>
              {option.option_components
                .sort((a, b) => a.component_order - b.component_order)
                .map((component) => (
                  <FlightSegmentRow 
                    key={component.id} 
                    segment={component as unknown as Record<string, unknown>} 
                  />
                ))}
            </div>
          )}
          
          {/* Selection Button */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {activeHold && status === 'held' && (
                <span>Held by agent</span>
              )}
            </div>
            
            <Button
              onClick={handleSelect}
              disabled={!isSelectable || isSelecting}
              variant={status === 'selected' ? 'secondary' : 'default'}
              size="sm"
            >
              {isSelecting ? 'Selecting...' : 
               status === 'selected' ? 'Selected' :
               status === 'ticketed' ? 'Ticketed' :
               status === 'expired' ? 'Expired' :
               `Select for ${selectionType}`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
