/**
 * @fileoverview Passenger grid component for compact leg management
 * 
 * @description Displays passengers in a grid with accordion-style expansion to show
 * their flight options. Each passenger row shows basic info and expands to display
 * all assigned flight options with management actions.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions
 * @database Reads options and components data
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Users, Plane, Clock, Star, Trash2, Edit, Copy, MessageCircle } from 'lucide-react'
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow'
import { getAirlineName } from '@/lib/airlines'
import { normalizeSegment } from '@/lib/segmentAdapter'
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

interface PassengerGridProps {
  passengers: Passenger[]
  options: Option[]
  legId: string
}

/**
 * Passenger grid component for compact leg management
 * 
 * @description Displays passengers in a grid with accordion-style expansion to show
 * their flight options. Each passenger row shows basic info and expands to display
 * all assigned flight options with management actions.
 * 
 * @param passengers - List of passengers assigned to the leg
 * @param options - List of all flight options for the leg
 * @param legId - Leg UUID for operations
 * @returns JSX.Element - Passenger grid with accordion expansion
 * 
 * @security Uses existing RLS/RBAC through server actions
 * @database Reads options and components data
 * @business_rule Shows options that are assigned to each passenger
 * 
 * @example
 * ```tsx
 * <PassengerGrid
 *   passengers={legPassengers}
 *   options={legOptions}
 *   legId="leg-uuid"
 * />
 * ```
 */
export function PassengerGrid({ passengers, options, legId }: PassengerGridProps) {
  const [expandedPassengers, setExpandedPassengers] = useState<Set<string>>(new Set())

  // CONTEXT: Handle removing passenger from option
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

  // CONTEXT: Toggle passenger accordion expansion
  const togglePassenger = (passengerId: string) => {
    const newExpanded = new Set(expandedPassengers)
    if (newExpanded.has(passengerId)) {
      newExpanded.delete(passengerId)
    } else {
      newExpanded.add(passengerId)
    }
    setExpandedPassengers(newExpanded)
  }

  // CONTEXT: Get options for a specific passenger using option_passengers table
  const getPassengerOptions = (passengerId: string) => {
    return options.filter(option => 
      option.option_passengers?.some(op => op.passenger_id === passengerId)
    )
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

  if (passengers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No passengers found</h3>
            <p className="text-sm text-muted-foreground">
              Adjust your filters or assign passengers to this leg to see them here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {passengers.map(passenger => {
        const person = passenger.tour_personnel
        const passengerOptions = getPassengerOptions(person.id)
        const isExpanded = expandedPassengers.has(person.id)

        return (
          <Card key={person.id} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => togglePassenger(person.id)}>
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
                        <span className="font-medium">{person.full_name}</span>
                        {person.is_vip && (
                          <Badge variant="secondary" className="text-xs">VIP</Badge>
                        )}
                        {person.role_title && (
                          <Badge variant="outline" className="text-xs">
                            {person.role_title}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="gap-1">
                        <Plane className="h-3 w-3" />
                        {passengerOptions.length} options
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {passengerOptions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Plane className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">No flight options assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {passengerOptions.map(option => (
                        <Card key={option.id} className="border-dashed">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Option Header */}
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium">{option.name}</h4>
                                    {option.is_recommended && (
                                      <Badge variant="default" className="flex items-center space-x-1">
                                        <Star className="h-3 w-3" />
                                        <span>Recommended</span>
                                      </Badge>
                                    )}
                                    {!option.is_available && (
                                      <Badge variant="destructive">Unavailable</Badge>
                                    )}
                                  </div>
                                  {option.description && (
                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                  )}
                                </div>
                                {option.total_cost && (
                                  <div className="text-right">
                                    <div className="font-semibold">
                                      ${(option.total_cost / 100).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {option.currency || 'USD'}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Flight Segments */}
                              <div className="space-y-2">
                                {option.option_components
                                  .sort((a, b) => a.component_order - b.component_order)
                                  .map(component => {
                                    // CONTEXT: Enhance component data with times for FlightSegmentRow display
                                    // BUSINESS_RULE: Use saved times first, then parse from navitas_text as fallback
                                    let enhancedComponent = { ...component }
                                    
                                    // ALGORITHM: Priority order - saved times, parsed Navitas times, then fallback
                                    if (component.departure_time && component.arrival_time) {
                                      // Use saved times from database
                                      enhancedComponent = {
                                        ...component,
                                        depTimeRaw: component.departure_time,
                                        arrTimeRaw: component.arrival_time
                                      }
                                    } else if (component.navitas_text && (!component.departure_time || !component.arrival_time)) {
                                      // Parse times from complete navitas_text as fallback
                                      const navitasMatch = component.navitas_text.match(/([A-Z]{2})\s*(\d+)\s+([A-Z]{3})-([A-Z]{3})(?:\s+\d{2}[A-Z]{3}\s+([\d:]+[AP]?)-([\d:]+[AP]?))?/i)
                                      if (navitasMatch && navitasMatch[5] && navitasMatch[6]) {
                                        enhancedComponent = {
                                          ...component,
                                          depTimeRaw: navitasMatch[5],
                                          arrTimeRaw: navitasMatch[6],
                                          departure_time: navitasMatch[5],
                                          arrival_time: navitasMatch[6]
                                        }
                                      }
                                    }
                                    
                                    console.log('DEBUG PassengerGrid - Component data for FlightSegmentRow:', enhancedComponent)
                                    return (
                                      <FlightSegmentRow
                                        key={component.id}
                                        segment={enhancedComponent}
                                      />
                                    )
                                  })}
                              </div>

                              {/* Active Holds */}
                              {option.holds.length > 0 && (
                                <div className="space-y-1">
                                  <h5 className="text-sm font-medium">Active Holds</h5>
                                  {option.holds.map(hold => (
                                    <div key={hold.id} className="flex items-center justify-between text-sm p-2 bg-amber-50 dark:bg-amber-950 rounded-md">
                                      <span>{hold.tour_personnel.full_name}</span>
                                      <Badge variant="outline" className="flex items-center space-x-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{getHoldCountdown(hold.expires_at)}</span>
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center space-x-2 pt-2">
                                <Button size="sm" variant="outline">
                                  <Edit className="mr-2 h-3 w-3" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Copy className="mr-2 h-3 w-3" />
                                  Duplicate
                                </Button>
                                <Button size="sm" variant="outline">
                                  <MessageCircle className="mr-2 h-3 w-3" />
                                  Chat
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRemovePassenger(option.id, person.id)}
                                >
                                  <Trash2 className="mr-2 h-3 w-3" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}
