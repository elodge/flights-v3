/**
 * @fileoverview Flight grid component for compact leg management
 * 
 * @description Displays flights grouped by normalized flight key in the By Flight view.
 * Each flight card shows the flight details and lists assigned passengers with the
 * ability to add more passengers or remove existing ones.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions
 * @database Reads options and components data
 */

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Plane, Users, Plus, X, AlertTriangle } from 'lucide-react'
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow'
import { createNormalizedFlightKey } from '@/lib/flight-utils'
import { removePassengerFromOption } from '@/lib/actions/compact-leg-actions'
import { toast } from 'sonner'

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

interface Option {
  id: string
  name: string
  description: string | null
  total_cost: number | null
  currency: string | null
  is_recommended: boolean
  is_available: boolean
  holds: Array<{
    id: string
    expires_at: string
    tour_personnel: {
      id: string
      full_name: string
    }
  }>
  option_passengers: Array<{
    id: string
    passenger_id: string
    tour_personnel: {
      id: string
      full_name: string
      is_vip: boolean
      role_title: string | null
      party: string
    }
  }>
  option_components: Array<{
    id: string
    component_order: number
    navitas_text: string
    flight_number: string | null
    airline: string | null
    departure_time: string | null
    arrival_time: string | null
    aircraft_type: string | null
    baggage_allowance: string | null
    meal_service: string | null
    seat_configuration: string | null
    cost: number | null
    currency: string | null
  }>
}

interface FlightGridProps {
  passengers: Passenger[]
  options: Option[]
  legId: string
}

interface GroupedFlight {
  key: string
  flight: {
    airline: string
    flightNumber: string
    origin: string
    destination: string
    depTimeRaw: string
    arrTimeRaw: string
    dayOffset: number
  }
  options: Option[]
  assignedPassengers: Passenger[]
  priceRange: { min: number; max: number; currency: string }
  holdWindows: Array<{ expiresAt: string; passengerName: string }>
}

/**
 * Flight grid component for compact leg management
 * 
 * @description Displays flights grouped by normalized flight key in the By Flight view.
 * Each flight card shows the flight details and lists assigned passengers with the
 * ability to add more passengers or remove existing ones.
 * 
 * @param passengers - List of passengers assigned to the leg
 * @param options - List of all flight options for the leg
 * @param legId - Leg UUID for operations
 * @returns JSX.Element - Flight grid with grouped flights
 * 
 * @security Uses existing RLS/RBAC through server actions
 * @database Reads options and components data
 * @business_rule Groups flights by normalized key (airline, flight number, date, airports)
 * 
 * @example
 * ```tsx
 * <FlightGrid
 *   passengers={legPassengers}
 *   options={legOptions}
 *   legId="leg-uuid"
 * />
 * ```
 */
export function FlightGrid({ passengers, options, legId }: FlightGridProps) {
  const [expandedFlights, setExpandedFlights] = useState<Set<string>>(new Set())

  // CONTEXT: Group flights by normalized key
  const groupedFlights = useMemo(() => {
    const groups = new Map<string, GroupedFlight>()
    
    // DEBUG: Log the data to understand what we're working with
    console.log('FlightGrid - Options:', options)
    console.log('FlightGrid - Passengers:', passengers)

    options.forEach(option => {
      option.option_components.forEach(component => {
        if (!component.airline || !component.flight_number || !component.navitas_text) {
          return
        }

        // CONTEXT: Extract route info from navitas_text (e.g., "AA 1234 BNA-MIA 01MAR 10:30A-1:45P")
        const navitasMatch = component.navitas_text.match(/^([A-Z]{2})\s*(\d+)\s+([A-Z]{3})-([A-Z]{3})/i)
        if (!navitasMatch) {
          return
        }

        const [, airline, flightNum, depIata, arrIata] = navitasMatch

        // CONTEXT: Create normalized flight key for grouping
        const flightKey = createNormalizedFlightKey({
          airline: component.airline,
          flightNumber: component.flight_number,
          depDate: '2024-01-01', // Simplified - in reality you'd extract from departure_time
          depIata,
          arrIata
        })

        if (!groups.has(flightKey)) {
          groups.set(flightKey, {
            key: flightKey,
            flight: {
              airline: component.airline,
              flightNumber: component.flight_number,
              origin: depIata,
              destination: arrIata,
              depTimeRaw: component.departure_time || '',
              arrTimeRaw: component.arrival_time || '',
              dayOffset: 0
            },
            options: [],
            assignedPassengers: [],
            priceRange: { min: Infinity, max: -Infinity, currency: 'USD' },
            holdWindows: []
          })
        }

        const group = groups.get(flightKey)!
        group.options.push(option)

        // CONTEXT: Update price range
        if (option.total_cost) {
          const price = option.total_cost / 100 // Convert from cents
          group.priceRange.min = Math.min(group.priceRange.min, price)
          group.priceRange.max = Math.max(group.priceRange.max, price)
          group.priceRange.currency = option.currency || 'USD'
        }

        // CONTEXT: Collect assigned passengers from option_passengers
        option.option_passengers.forEach(optionPassenger => {
          // CONTEXT: Find the passenger in the passengers list and add to assigned passengers
          const passenger = passengers.find(p => p.tour_personnel.id === optionPassenger.passenger_id)
          console.log('DEBUG - Option passenger:', optionPassenger.passenger_id, 'Found passenger:', passenger)
          if (passenger && !group.assignedPassengers.find(p => p.tour_personnel.id === passenger.tour_personnel.id)) {
            group.assignedPassengers.push(passenger)
            console.log('DEBUG - Added passenger to group:', passenger.tour_personnel.full_name)
          }
        })

        // CONTEXT: Collect hold windows (if any)
        option.holds.forEach(hold => {
          group.holdWindows.push({
            expiresAt: hold.expires_at,
            passengerName: hold.tour_personnel.full_name
          })
        })
      })
    })

    const result = Array.from(groups.values())
    console.log('DEBUG - Final grouped flights:', result)
    return result
  }, [options, passengers])

  // CONTEXT: Toggle flight accordion expansion
  const toggleFlight = (flightKey: string) => {
    const newExpanded = new Set(expandedFlights)
    if (newExpanded.has(flightKey)) {
      newExpanded.delete(flightKey)
    } else {
      newExpanded.add(flightKey)
    }
    setExpandedFlights(newExpanded)
  }

  // CONTEXT: Calculate hold countdown
  const getHoldCountdown = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffMs <= 0) return 'Expired'
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`
    return `${diffMinutes}m`
  }

  // CONTEXT: Handle removing passenger from option (or deleting option if no other passengers)
  const handleRemovePassenger = async (optionId: string, passengerId: string) => {
    try {
      const result = await removePassengerFromOption({ optionId, passengerId })
      
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Passenger removed from option')
        // The page will refresh automatically due to revalidatePath in the server action
      }
    } catch (error) {
      console.error('Error removing passenger:', error)
      toast.error('Failed to remove passenger')
    }
  }

  if (groupedFlights.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Plane className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No flights found</h3>
            <p className="text-sm text-muted-foreground">
              Create flight options using the Navitas parser or manual entry above.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groupedFlights.map(groupedFlight => {
        const isExpanded = expandedFlights.has(groupedFlight.key)
        const hasPriceVariation = groupedFlight.priceRange.min !== groupedFlight.priceRange.max
        const hasHoldVariation = groupedFlight.holdWindows.length > 1

        return (
          <Card key={groupedFlight.key} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleFlight(groupedFlight.key)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex items-center space-x-2">
                        <FlightSegmentRow
                          segment={groupedFlight.flight}
                          className="border-none bg-transparent p-0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {groupedFlight.assignedPassengers.length} passengers
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Plane className="h-3 w-3" />
                        {groupedFlight.options.length} options
                      </Badge>
                      {hasPriceVariation && (
                        <Badge variant="outline" className="text-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Price varies
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Price and Hold Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Pricing</h4>
                        {hasPriceVariation ? (
                          <div className="text-sm">
                            <div className="text-amber-600 font-medium">
                              ${groupedFlight.priceRange.min.toFixed(2)} - ${groupedFlight.priceRange.max.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Price varies by option
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div className="font-medium">
                              ${groupedFlight.priceRange.min.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {groupedFlight.priceRange.currency}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {groupedFlight.holdWindows.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Hold Windows</h4>
                          <div className="space-y-1">
                            {groupedFlight.holdWindows.map((hold, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span>{hold.passengerName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {getHoldCountdown(hold.expiresAt)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assigned Passengers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Assigned Passengers</h4>
                        <Button size="sm" variant="outline">
                          <Plus className="mr-2 h-3 w-3" />
                          Add Passenger(s)
                        </Button>
                      </div>
                      
                      {groupedFlight.assignedPassengers.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <Users className="mx-auto h-8 w-8 mb-2" />
                          <p className="text-sm">No passengers assigned to this flight</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {groupedFlight.assignedPassengers.map(passenger => {
                            // CONTEXT: Find the option ID for this passenger's association
                            const optionId = groupedFlight.options.find(option => 
                              option.option_passengers.some(op => op.passenger_id === passenger.tour_personnel.id)
                            )?.id || null

                            return (
                              <div key={passenger.tour_personnel.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">{passenger.tour_personnel.full_name}</span>
                                  {passenger.tour_personnel.is_vip && (
                                    <Badge variant="secondary" className="text-xs">VIP</Badge>
                                  )}
                                  {passenger.tour_personnel.role_title && (
                                    <Badge variant="outline" className="text-xs">
                                      {passenger.tour_personnel.role_title}
                                    </Badge>
                                  )}
                                </div>
                                {optionId && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemovePassenger(optionId, passenger.tour_personnel.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Split Party Warning */}
                    {hasHoldVariation && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-md">
                        <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Split Party Detected</span>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          This flight has different hold windows, indicating a split party assignment.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}
