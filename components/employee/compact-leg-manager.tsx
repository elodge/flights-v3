/**
 * @fileoverview Compact Leg Manager - High-density flight option management interface
 * 
 * @description Main client component for the compact leg management interface that provides
 * a high-density workflow for agents to manage flight options on tour legs. Features
 * passenger filtering, Navitas parsing, dual view modes (By Passenger/By Flight), and
 * integrated option creation through the EnhancedNavitasModal. Designed for maximum
 * efficiency with minimal vertical space usage and streamlined user interactions.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions and authenticated user context
 * @database Reads leg data via props, creates options through createOptionsForPassengers server action
 * @business_rule Provides dual view modes for different workflow preferences
 * @business_rule Integrates EnhancedNavitasModal for streamlined multi-option creation
 * @business_rule Maintains state for active tab and modal visibility
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

'use client'

import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Users, Plane, Calendar, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/database.types'
import { PassengerGrid } from './passenger-grid'
import { FlightGrid } from './flight-grid'
import { EnhancedNavitasModal } from './enhanced-navitas-modal'
import { ChatButton } from '@/components/chat/ChatButton'

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
 * Provides passenger filtering, Navitas parsing, dual view modes with URL state persistence,
 * and integrated team chat functionality.
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
/**
 * Compact Leg Manager Component
 * 
 * @description Main client component that renders the compact leg management interface
 * with dual view modes, passenger filtering, and integrated option creation. Manages
 * state for active tabs, filters, and modal visibility while providing a streamlined
 * workflow for agents to manage flight options efficiently.
 * 
 * @param leg - Complete leg data including project, artist, passengers, and options
 * @param projectId - UUID of the tour/project for navigation and data context
 * @param legId - UUID of the leg being managed
 * @returns JSX.Element - Complete compact leg management interface
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions and authenticated user context
 * @database Reads leg data via props, creates options through server actions
 * @business_rule Provides dual view modes (By Passenger/By Flight) for different workflows
 * @business_rule Integrates EnhancedNavitasModal for streamlined multi-option creation
 * @business_rule Maintains URL state for filters and active tab persistence
 * @business_rule Supports passenger filtering by search, party, and VIP status
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
  
  // CONTEXT: URL state management for active tab and filters
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    parties: searchParams.get('parties')?.split(',').filter(Boolean) || [],
    hasOptions: searchParams.get('hasOptions') || 'all', // 'all', 'has', 'none'
    showNoParty: searchParams.get('showNoParty') === 'true'
  })
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'passenger')
  const [showEnhancedNavitasModal, setShowEnhancedNavitasModal] = useState(false)

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
        const passengerOptions = leg.options.filter(option => 
          (option as any).option_passengers?.some((op: any) => op.passenger_id === person.id)
        )
        const hasOptions = passengerOptions.length > 0
        
        if (filters.hasOptions === 'has' && !hasOptions) return false
        if (filters.hasOptions === 'none' && hasOptions) return false
      }
      
      return true
    })
  }, [leg, filters])

  // CONTEXT: Get unique parties from passengers for filter options
  const availableParties = Array.from(new Set(
    leg.leg_passengers
      .map(p => p.tour_personnel.role_title)
      .filter(Boolean)
  )) as string[]


  // CONTEXT: Update URL when filters or tab change
  const updateURL = (newFilters: typeof filters, newTab: string) => {
    const params = new URLSearchParams()
    
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.parties.length > 0) params.set('parties', newFilters.parties.join(','))
    if (newFilters.showNoParty) params.set('showNoParty', 'true')
    if (newFilters.hasOptions !== 'all') params.set('hasOptions', newFilters.hasOptions)
    if (newTab !== 'passenger') params.set('tab', newTab)
    
    const url = params.toString() ? `?${params.toString()}` : ''
    router.replace(`${window.location.pathname}${url}`, { scroll: false })
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
          <ChatButton legId={legId} variant="outline" size="sm" />
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
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowEnhancedNavitasModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Flight Options
              </Button>
              <Badge variant="outline">
                {leg.projects.artists.name}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search passengers..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Party Filter */}
            <div className="flex flex-wrap gap-2">
              <label className="text-sm font-medium text-muted-foreground">Parties:</label>
              {availableParties.map(party => (
                <Badge
                  key={party}
                  variant={filters.parties.includes(party) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newParties = filters.parties.includes(party)
                      ? filters.parties.filter(p => p !== party)
                      : [...filters.parties, party]
                    handleFilterChange({ ...filters, parties: newParties })
                  }}
                >
                  {party}
                </Badge>
              ))}
              
              {/* No Party Filter */}
              <Badge
                variant={filters.showNoParty ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleFilterChange({ ...filters, showNoParty: !filters.showNoParty })}
              >
                No party
              </Badge>
            </div>

            {/* Has Options Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Options:</label>
              <select
                value={filters.hasOptions}
                onChange={(e) => handleFilterChange({ ...filters, hasOptions: e.target.value })}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="has">Has options</option>
                <option value="none">No options</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(filters.search || filters.parties.length > 0 || filters.showNoParty || filters.hasOptions !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange({
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
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="passenger">By Passenger</TabsTrigger>
          <TabsTrigger value="flight">By Flight</TabsTrigger>
        </TabsList>
        
        <TabsContent value="passenger" className="mt-4">
          <PassengerGrid
            passengers={filteredPassengers}
            options={leg.options as any}
            legId={legId}
          />
        </TabsContent>
        
        <TabsContent value="flight" className="mt-4">
          <FlightGrid
            passengers={leg.leg_passengers}
            options={leg.options as any}
            legId={legId}
          />
        </TabsContent>
      </Tabs>

      {/* Enhanced Navitas Modal */}
      <EnhancedNavitasModal
        isOpen={showEnhancedNavitasModal}
        onClose={() => setShowEnhancedNavitasModal(false)}
        allPassengers={leg.leg_passengers.map(p => ({
          id: p.tour_personnel.id,
          full_name: p.tour_personnel.full_name,
          role_title: p.tour_personnel.role_title,
          is_vip: p.tour_personnel.is_vip,
          party: null // TODO: Add party field to tour_personnel type
        }))}
        legId={legId}
      />
    </div>
  )
}
