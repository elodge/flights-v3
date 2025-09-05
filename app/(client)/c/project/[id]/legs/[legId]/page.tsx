/**
 * @fileoverview Client leg detail page for flight option selection
 * 
 * @description Client-facing leg management interface allowing group and individual
 * flight option selection with real-time status updates and budget tracking.
 * Implements MVP flight selection with budget sidebar and realtime sync.
 * 
 * @route /c/project/[id]/legs/[legId]
 * @access Client only (authenticated clients assigned to this project's artist)
 * @security RLS enforced - clients can only see their assigned projects
 * @database Reads from legs, projects, artists, leg_passengers, tour_personnel, options, selections, holds
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ArrowLeft, Clock, MapPin, Plane, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'
import { FlightOptionCard } from '@/components/client/flight-option-card'
import { IndividualSelectionTable } from '@/components/client/individual-selection-table'
import { BudgetSidebar } from '@/components/client/budget-sidebar'
import { SelectionConfirmation } from '@/components/client/selection-confirmation'
import { LegChat } from '@/components/chat/LegChat'
import { ChatButton } from '@/components/chat/ChatButton'

type ClientLegWithDetails = Database['public']['Tables']['legs']['Row'] & {
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
    option_components: Array<{
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
    }>
    selections: Array<{
      id: string
      status: string
      passenger_id: string
      selected_at: string
      expires_at: string | null
      notes: string | null
    }>
    holds: Array<{
      id: string
      passenger_id: string
      expires_at: string
      notes: string | null
      created_by: string | null
    }>
  }>
}

/**
 * Fetches leg details with options and current selections for client view
 * 
 * @description Retrieves comprehensive leg data including available options,
 * current selections, holds, and passenger assignments. RLS ensures clients
 * only see data for projects where they're assigned to the artist.
 * 
 * @param projectId - UUID of the project
 * @param legId - UUID of the leg to fetch
 * @returns Promise<ClientLegWithDetails | null> - Leg data or null if not found/unauthorized
 * 
 * @security RLS enforced - clients can only access their assigned projects
 * @database Queries legs with joins to projects, artists, options, selections, holds
 * @business_rule Only returns legs for active projects with client assignment
 * 
 * @throws {Error} Database query errors or authentication failures
 * 
 * @example
 * ```typescript
 * const leg = await getClientLegDetails('project-uuid', 'leg-uuid')
 * if (!leg) {
 *   notFound()
 * }
 * ```
 */
async function getClientLegDetails(projectId: string, legId: string): Promise<ClientLegWithDetails | null> {
  const user = await getServerUser()
  if (!user || user.role !== 'client') return null

  const supabase = await createServerClient()

  // CONTEXT: Client leg query with comprehensive option and selection data
  // SECURITY: RLS ensures clients only see legs for their assigned artists
  // DATABASE: Complex join to get all option details, selections, and holds
  // BUSINESS_RULE: Only show available options for active projects
  const { data: leg, error } = await supabase
    .from('legs')
    .select(`
      *,
      projects!inner (
        id,
        name,
        type,
        artist_id,
        artists!inner (
          id,
          name
        )
      ),
      leg_passengers (
        treat_as_individual,
        tour_personnel (
          id,
          full_name,
          email,
          role_title,
          is_vip
        )
      ),
      options!options_leg_id_fkey (
        id,
        name,
        description,
        total_cost,
        currency,
        is_recommended,
        is_available,
        option_components (
          id,
          component_order,
          navitas_text,
          flight_number,
          airline,
          departure_time,
          arrival_time,
          aircraft_type,
          seat_configuration,
          meal_service,
          baggage_allowance,
          cost,
          currency
        ),
        selections (
          id,
          status,
          passenger_id,
          selected_at,
          expires_at,
          notes
        ),
        holds (
          id,
          passenger_id,
          expires_at,
          notes,
          created_by
        )
      )
    `)
    .eq('id', legId)
    .eq('project_id', projectId)
    .single()

  return leg
}

interface PageProps {
  params: Promise<{
    id: string
    legId: string
  }>
}

/**
 * Client leg detail page component with flight selection interface
 * 
 * @description Comprehensive client interface for reviewing and selecting flight
 * options. Supports both group selection (default) and individual overrides.
 * Includes real-time status updates and budget tracking sidebar.
 * 
 * @param params - Promise containing route parameters (id: project UUID, legId: leg UUID)
 * @returns Promise<JSX.Element> - Flight selection page with group/individual views
 * 
 * @security Requires authenticated client with access to this project
 * @database Fetches leg data via getClientLegDetails with RLS protection
 * @business_rule Shows 404 for non-existent legs or unauthorized access
 * 
 * @nextjs_15_fix Awaits params before accessing id/legId properties
 * 
 * @example
 * ```tsx
 * // Automatically rendered for route /c/project/[id]/legs/[legId]
 * <ClientLegPage params={Promise.resolve({ id: 'project-uuid', legId: 'leg-uuid' })} />
 * ```
 */
export default async function ClientLegPage({ params }: PageProps) {
  // NEXTJS_15_FIX: Await params before accessing properties
  const { id, legId } = await params
  
  const leg = await getClientLegDetails(id, legId)

  if (!leg) {
    notFound()
  }

  // CONTEXT: Separate group and individual passengers for different views
  // BUSINESS_RULE: treat_as_individual flag determines selection interface
  const groupPassengers = leg.leg_passengers.filter(p => !p.treat_as_individual)
  const individualPassengers = leg.leg_passengers.filter(p => p.treat_as_individual)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/c/project/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {leg.label || `${leg.origin_city} → ${leg.destination_city}`}
            </h1>
            <p className="text-muted-foreground">
              {leg.projects.name} • {leg.projects.artists.name}
            </p>
          </div>

          <ChatButton legId={legId} variant="outline" size="sm" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Flight Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Flight Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{leg.origin_city}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{leg.destination_city}</span>
                  </div>
                  
                  {leg.departure_date && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(leg.departure_date).toLocaleDateString()}</span>
                      {leg.departure_time && (
                        <span className="text-muted-foreground">
                          at {leg.departure_time}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {leg.leg_passengers.length} passenger{leg.leg_passengers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selection Interface */}
            <Tabs defaultValue="group" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="group">
                  Group Selection ({groupPassengers.length})
                </TabsTrigger>
                <TabsTrigger value="individual" disabled={individualPassengers.length === 0}>
                  Individual Selection ({individualPassengers.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="group" className="space-y-4">
                {leg.options.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No flight options available yet. Please check back later.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {leg.options.map((option) => (
                      <FlightOptionCard
                        key={option.id}
                        option={option}
                        legId={legId}
                        selectionType="group"
                        passengerIds={null}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="individual" className="space-y-4">
                {individualPassengers.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No individual selections configured for this leg.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <IndividualSelectionTable
                    passengers={individualPassengers}
                    options={leg.options}
                    legId={legId}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Selection Confirmation */}
            <SelectionConfirmation
              legId={legId}
              hasGroupSelections={groupPassengers.length > 0}
              hasIndividualSelections={individualPassengers.length > 0}
            />
          </div>

          {/* Budget Sidebar */}
          <div className="lg:col-span-1">
            <BudgetSidebar projectId={id} />
          </div>
        </div>
      </div>
    </div>
  )
}