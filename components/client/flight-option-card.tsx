/**
 * @fileoverview Flight option card component for client selection interface
 * 
 * @description Interactive card displaying flight option details with selection
 * actions, status visualization, and hold countdown. Supports both group and
 * individual selection modes with real-time status updates.
 * 
 * @access Client-side component
 * @security Client-only operations via RLS-protected RPC calls
 * @database Calls rpc_client_select_option for selections
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, Star, Plane, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeSegment } from '@/lib/segmentAdapter'
import { getAirlineName } from '@/lib/airlines'
import { useHoldCountdown } from '@/hooks/use-hold-countdown'
import { selectFlightOption } from '@/lib/actions/selection-actions'
import { useAviationStack } from '@/hooks/useAviationstack'
import { EnrichedFlightDisplay } from '@/components/flight/enriched-flight-display'

/**
 * Flight header component with enrichment
 */
function FlightHeaderWithEnrichment({ component }: { component: any }) {
  // Use stored enrichment data from database
  const enrichment = {
    aircraft_type: component.enriched_aircraft_type,
    aircraft_name: component.enriched_aircraft_name,
    status: component.enriched_status,
    dep_terminal: component.enriched_dep_terminal,
    arr_terminal: component.enriched_arr_terminal,
    dep_gate: component.enriched_dep_gate,
    arr_gate: component.enriched_arr_gate,
    dep_scheduled: component.enriched_dep_scheduled,
    arr_scheduled: component.enriched_arr_scheduled,
    duration: component.enriched_duration,
    source: component.enrichment_source,
    fetched_at: component.enrichment_fetched_at,
  };

  return (
    <EnrichedFlightDisplay
      flight={{
        airline: component.airline,
        flightNumber: component.flightNumber,
        origin: component.origin,
        destination: component.destination,
      }}
      enrichment={enrichment}
      variant="header"
    />
  );
}

/**
 * Enhanced segment display with enrichment
 */
function EnrichedSegmentDisplay({ component }: { component: OptionComponent }) {
  // Use stored enrichment data from database
  const enrichment = {
    aircraft_type: component.enriched_aircraft_type,
    aircraft_name: component.enriched_aircraft_name,
    status: component.enriched_status,
    dep_terminal: component.enriched_dep_terminal,
    arr_terminal: component.enriched_arr_terminal,
    dep_gate: component.enriched_dep_gate,
    arr_gate: component.enriched_arr_gate,
    dep_scheduled: component.enriched_dep_scheduled,
    arr_scheduled: component.enriched_arr_scheduled,
    duration: component.enriched_duration,
    source: component.enrichment_source,
    fetched_at: component.enrichment_fetched_at,
  };

  // FALLBACK: Use existing display if no enrichment data available
  if (!enrichment || (!enrichment.aircraft_type && !enrichment.aircraft_name)) {
    return (
      <div className="border rounded-lg p-3 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm">
              {getAirlineName(component.airline_iata || (component as any).airline_code)} {component.flight_number}
            </div>
            <div className="text-xs text-muted-foreground">
              {component.dep_iata} → {component.arr_iata}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {component.dep_time_local && component.arr_time_local && (
              <>
                {new Date(component.dep_time_local).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} - {new Date(component.arr_time_local).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-muted/50">
      <EnrichedFlightDisplay
        flight={{
          airline: component.airline_iata || component.airline,
          flightNumber: component.flight_number || '',
          origin: component.dep_iata || '',
          destination: component.arr_iata || '',
        }}
        enrichment={enrichment}
        variant="compact"
      />
      
      {/* Local times from component data */}
      {component.dep_time_local && component.arr_time_local && (
        <div className="mt-2 text-xs text-muted-foreground">
          Local: {new Date(component.dep_time_local).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} → {new Date(component.arr_time_local).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      )}
    </div>
  );
}

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
 * selection interface. Handles group and individual selection modes with
 * real-time hold countdown and status visualization.
 * 
 * @param option - Flight option data with components, selections, and holds
 * @param legId - UUID of the leg this option belongs to
 * @param selectionType - Whether this is for group or individual selection
 * @param passengerIds - Array of passenger UUIDs for individual selection, null for group
 * @returns JSX.Element - Interactive option card with selection button
 * 
 * @security Uses RLS-protected RPC calls for selections
 * @business_rule Group selections apply to all passengers, individual use specific passenger_id
 * @business_rule Cannot select expired or ticketed options
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
  
  // CONTEXT: AviationStack flight data enrichment
  // BUSINESS_RULE: Build query from first component with flight data, prefer flight_iata
  const firstComponent = option.option_components[0]
  const aviationStackQuery = firstComponent ? {
    flight_iata: firstComponent.flight_number && (firstComponent.airline || firstComponent.airline_iata)
      ? `${firstComponent.airline || firstComponent.airline_iata}${firstComponent.flight_number}` 
      : undefined,
    airline_iata: firstComponent.airline_iata || firstComponent.airline || undefined,
    flight_number: firstComponent.flight_number || undefined,
    dep_iata: firstComponent.dep_iata || undefined,
    arr_iata: firstComponent.arr_iata || undefined,
  } : {}
  
  const { data: flightData, loading: flightLoading, error: flightError } = useAviationStack(aviationStackQuery)
  
  // CONTEXT: Check for stored enriched data from manual options
  // BUSINESS_RULE: Prefer stored enriched data over live API calls for manual options
  const hasStoredEnrichedData = firstComponent?.enriched_terminal_gate && 
    (firstComponent.enriched_terminal_gate.dep_terminal || firstComponent.enriched_terminal_gate.dep_gate ||
     firstComponent.enriched_terminal_gate.arr_terminal || firstComponent.enriched_terminal_gate.arr_gate)
  
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
  
  // CONTEXT: Format segments from option components for display
  const formatSegments = (components: OptionComponent[]) => {
    return components
      .sort((a, b) => a.component_order - b.component_order)
      .map(c => c.navitas_text || 'Flight segment')
      .join(' • ')
  }
  
  // CONTEXT: Format flight status for display
  const formatFlightStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'Scheduled'
      case 'active': return 'Active'
      case 'landed': return 'Landed'
      case 'cancelled': return 'Cancelled'
      case 'delayed': return 'Delayed'
      default: return status
    }
  }
  
  // CONTEXT: Get flight status badge variant
  const getFlightStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'secondary'
      case 'active': return 'default'
      case 'landed': return 'outline'
      case 'cancelled': return 'destructive'
      case 'delayed': return 'destructive'
      default: return 'secondary'
    }
  }
  
  // CONTEXT: Format time with priority (estimated > scheduled > actual)
  const formatFlightTime = (scheduled: string, estimated?: string, actual?: string) => {
    const time = estimated || scheduled || actual
    if (!time) return null
    
    try {
      const date = new Date(time)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } catch {
      return time
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
          {/* Flight Information */}
          {option.option_components.length > 0 && (
            <div className="space-y-3">
              {/* Flight Status and Basic Info */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {firstComponent?.airline} {firstComponent?.flight_number}
                  </span>
                </div>
                
                {/* Flight Status Badge */}
                {flightData && (
                  <Badge variant={getFlightStatusVariant((flightData as any).flightStatus)} className="text-xs">
                    {formatFlightStatus((flightData as any).flightStatus)}
                  </Badge>
                )}
                
                {/* Delay Badge */}
                {(flightData as any)?.departure.delayMin && (flightData as any).departure.delayMin > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    +{(flightData as any).departure.delayMin}m delay
                  </Badge>
                )}
              </div>
              
              {/* Flight Times */}
              {(flightData || hasStoredEnrichedData) && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">
                        {(flightData as any)?.departure.iata || firstComponent?.dep_iata}
                      </p>
                      <p className="text-muted-foreground">
                        {flightData ? formatFlightTime(
                          flightData.departure.scheduled,
                          flightData.departure.estimated,
                          flightData.departure.actual || undefined
                        ) : firstComponent?.dep_time_local ? 
                          new Date(firstComponent.dep_time_local).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          }) : null}
                      </p>
                      {(flightData?.departure.terminal || firstComponent?.enriched_terminal_gate?.dep_terminal) && (
                        <p className="text-xs text-muted-foreground">
                          Terminal {flightData?.departure.terminal || firstComponent?.enriched_terminal_gate?.dep_terminal}
                        </p>
                      )}
                      {(flightData?.departure.gate || firstComponent?.enriched_terminal_gate?.dep_gate) && (
                        <p className="text-xs text-muted-foreground">
                          Gate {flightData?.departure.gate || firstComponent?.enriched_terminal_gate?.dep_gate}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">
                        {(flightData as any)?.arrival.iata || firstComponent?.arr_iata}
                      </p>
                      <p className="text-muted-foreground">
                        {flightData ? formatFlightTime(
                          flightData.arrival.scheduled,
                          flightData.arrival.estimated,
                          flightData.arrival.actual || undefined
                        ) : firstComponent?.arr_time_local ? 
                          new Date(firstComponent.arr_time_local).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          }) : null}
                      </p>
                      {(flightData?.arrival.terminal || firstComponent?.enriched_terminal_gate?.arr_terminal) && (
                        <p className="text-xs text-muted-foreground">
                          Terminal {flightData?.arrival.terminal || firstComponent?.enriched_terminal_gate?.arr_terminal}
                        </p>
                      )}
                      {(flightData?.arrival.gate || firstComponent?.enriched_terminal_gate?.arr_gate) && (
                        <p className="text-xs text-muted-foreground">
                          Gate {flightData?.arrival.gate || firstComponent?.enriched_terminal_gate?.arr_gate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Fallback to segment rows if no enrichment data */}
              {!flightData && !hasStoredEnrichedData && !flightLoading && (
                <div className="space-y-2">
                  {/* Header with first segment info - Enhanced with enrichment */}
                  {option.option_components.length > 0 && (() => {
                    const first = normalizeSegment(option.option_components[0] as any);
                    return <FlightHeaderWithEnrichment component={first} />;
                  })()}
                  
                  {/* Segments list - Enhanced with enrichment */}
                  <div className="space-y-2">
                    {option.option_components
                      .sort((a, b) => a.component_order - b.component_order)
                      .map((component) => (
                        <EnrichedSegmentDisplay 
                          key={component.id} 
                          component={component} 
                        />
                      ))}
                  </div>
                </div>
              )}
              
              {/* Loading state */}
              {flightLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading flight data...</span>
                </div>
              )}
              
              {/* Error state (silent fallback) */}
              {flightError && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Flight data unavailable</span>
                </div>
              )}
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
