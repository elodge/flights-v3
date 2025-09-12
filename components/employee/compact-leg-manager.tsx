/**
 * @fileoverview Compact leg manager component for high-density flight option management
 * 
 * @description Main component for the compact leg management interface. Provides
 * passenger filtering, Navitas parsing, and dual view modes (By Passenger/By Flight).
 * Designed for high-density workflow with minimal vertical space usage.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions
 * @database Reads leg data, creates options via server actions
 */

'use client'

import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Users, Plane, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/database.types'
import { AssignmentBar } from './assignment-bar'
import { PassengerGrid } from './passenger-grid'
import { FlightGrid } from './flight-grid'

type LegWithDetails = Database['public']['Tables']['legs']['Row'] & {
  projects: {
    id: string
    name: string
    type: 'tour' | 'event'
    artist_id: string
    artists: {
      id: string
      name: string
    }
  }
  leg_passengers: Array<{
    treat_as_individual: boolean
    tour_personnel: {
      id: string
      full_name: string
      email: string | null
      role_title: string | null
      is_vip: boolean
    }
  }>
  options: Array<{
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
    option_components: Array<{
      id: string
      component_order: number
      navitas_text: string
      flight_number: string | null
      airline: string | null
      airline_iata: string | null
      airline_name: string | null
      dep_iata: string | null
      arr_iata: string | null
      departure_time: string | null
      arrival_time: string | null
      dep_time_local: string | null
      arr_time_local: string | null
      day_offset: number | null
      duration_minutes: number | null
      stops: number | null
      enriched_terminal_gate: any | null
    }>
  }>
}

interface CompactLegManagerProps {
  leg: LegWithDetails
  projectId: string
  legId: string
}

/**
 * Compact leg manager component
 * 
 * @description High-density interface for managing flight options on tour legs.
 * Provides passenger filtering, Navitas parsing, and dual view modes with URL state persistence.
 * 
 * @param leg - Complete leg data with passengers and options
 * @param projectId - Tour/project UUID for navigation
 * @param legId - Leg UUID for operations
 * @returns JSX.Element - Compact management interface
 * 
 * @security Uses existing RLS/RBAC through server actions
 * @database Reads leg data, creates options via server actions
 * @business_rule Maintains one-passenger-per-PNR selection model
 * 
 * @example
 * ```tsx
 * <CompactLegManager 
 *   leg={legData} 
 *   projectId="tour-uuid" 
 *   legId="leg-uuid" 
 * />
 * ```
 */
export function CompactLegManager({ leg, projectId, legId }: CompactLegManagerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // CONTEXT: URL state management for filters and active tab
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    parties: searchParams.get('parties')?.split(',') || [],
    showNoParty: searchParams.get('showNoParty') === 'true',
    hasOptions: searchParams.get('hasOptions') || 'all' // 'all', 'has', 'none'
  })
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'passenger')
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([])

  // CONTEXT: Filter passengers based on current filter state
  const filteredPassengers = useMemo(() => {
    return leg.leg_passengers.filter(passenger => {
      const person = passenger.tour_personnel
      
      // Search filter
      if (filters.search && !person.full_name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      // Party filter (using role_title as party indicator)
      if (filters.parties.length > 0 && person.role_title && !filters.parties.includes(person.role_title)) {
        return false
      }
      
      // No party filter
      if (filters.showNoParty && person.role_title) {
        return false
      }
      
      // Has options filter
      if (filters.hasOptions !== 'all') {
        const hasOptions = leg.options.some(option => 
          option.option_components.some(component => 
            // This is a simplified check - in reality you'd need to check if this passenger has this option
            true // For now, assume all passengers can have options
          )
        )
        
        if (filters.hasOptions === 'has' && !hasOptions) return false
        if (filters.hasOptions === 'none' && hasOptions) return false
      }
      
      return true
    })
  }, [leg, filters])

  // CONTEXT: Update URL when filters or tab change
  const updateURL = (newFilters: typeof filters, newTab: string) => {
    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.parties.length > 0) params.set('parties', newFilters.parties.join(','))
    if (newFilters.showNoParty) params.set('showNoParty', 'true')
    if (newFilters.hasOptions !== 'all') params.set('hasOptions', newFilters.hasOptions)
    if (newTab !== 'passenger') params.set('tab', newTab)
    
    const queryString = params.toString()
    const newURL = queryString ? `?${queryString}` : ''
    router.replace(newURL, { scroll: false })
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    updateURL(newFilters, activeTab)
  }

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    updateURL(filters, newTab)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/a/tour/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {leg.projects.name}
          </Link>
        </Button>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="gap-2">
            <Users className="h-3 w-3" />
            {leg.leg_passengers.length} passengers
          </Badge>
          <Badge variant="secondary" className="gap-2">
            <Plane className="h-3 w-3" />
            {leg.options.length} options
          </Badge>
        </div>
      </div>

      {/* Leg Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">
                {leg.label || `Leg ${leg.leg_order}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {leg.origin_city} → {leg.destination_city}
              </p>
              {leg.departure_date && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(leg.departure_date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    {leg.departure_time && ` at ${leg.departure_time}`}
                  </span>
                </div>
              )}
            </div>
            <Badge variant="outline">
              {leg.projects.artists.name}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Assignment Bar */}
      <AssignmentBar
        passengers={leg.leg_passengers}
        selectedPassengers={selectedPassengers}
        onSelectionChange={setSelectedPassengers}
        filters={filters}
        onFiltersChange={handleFilterChange}
        legId={legId}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="passenger">By Passenger</TabsTrigger>
          <TabsTrigger value="flight">By Flight</TabsTrigger>
        </TabsList>
        
        <TabsContent value="passenger" className="mt-4">
          <PassengerGrid
            passengers={filteredPassengers}
            options={leg.options}
            legId={legId}
          />
        </TabsContent>
        
        <TabsContent value="flight" className="mt-4">
          <FlightGrid
            passengers={leg.leg_passengers}
            options={leg.options}
            legId={legId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
