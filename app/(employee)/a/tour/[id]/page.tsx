/**
 * @fileoverview Employee tour detail page with leg management
 * 
 * @description Displays comprehensive tour information for employees including
 * leg details, personnel assignments, and navigation to leg management.
 * Fixed Next.js 15 async params compatibility and database schema issues.
 * 
 * @route /a/tour/[id]
 * @access Employee only (agent, admin roles)
 * @security Requires authenticated employee via getServerUser
 * @database Reads from projects, artists, legs, tour_personnel, leg_passengers
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Calendar, Plane, Users, FileText, Settings, Plus, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'
import { AddLegDialog } from '@/components/employee/add-leg-dialog'
import { PersonnelTab } from '@/components/employee/personnel-tab'
// Temporarily disabled budget features for authentication fix
// import { BudgetManagement } from '@/components/employee/budget-management'
// import { getProjectBudgets, getBudgetSnapshot } from '@/lib/actions/budget-actions'

type TourWithDetails = Database['public']['Tables']['projects']['Row'] & {
  artists: {
    id: string
    name: string
    description: string | null
    contact_email: string | null
  }
  legs: Array<{
    id: string
    label: string | null
    origin_city: string
    destination_city: string
    departure_date: string | null
    arrival_date: string | null
    departure_time: string | null
    arrival_time: string | null
    leg_order: number
    leg_passengers: Array<{
      tour_personnel: {
        id: string
        full_name: string
      }
    }>
  }>
  tour_personnel: Array<Database['public']['Tables']['tour_personnel']['Row']>
}

/**
 * Fetches comprehensive tour data for employee portal
 * 
 * @description Retrieves tour details including artists, legs, and personnel.
 * Fixed database schema issue by removing non-existent 'party' column from
 * tour_personnel query that was causing 404 errors.
 * 
 * @param tourId - UUID of the tour to fetch
 * @returns Promise<TourWithDetails | null> - Tour data or null if not found/unauthorized
 * 
 * @security Requires authenticated employee (agent/admin)
 * @database Queries projects with joins to artists, legs, tour_personnel, leg_passengers
 * @business_rule Only returns active tours (is_active = true)
 * 
 * @throws {Error} Database query errors or authentication failures
 * 
 * @example
 * ```typescript
 * const tour = await getEmployeeTour('tour-uuid')
 * if (!tour) {
 *   notFound()
 * }
 * ```
 */
async function getEmployeeTour(tourId: string): Promise<TourWithDetails | null> {
  const user = await getServerUser()
  if (!user || user.role === 'client') return null

  const supabase = await createServerClient()

  // CONTEXT: Comprehensive tour query for employee portal
  // DATABASE_FIX: Removed 'party' column from tour_personnel (doesn't exist in schema)
  // BUSINESS_RULE: Only fetch active tours, require artist association
  const { data: tour, error } = await supabase
    .from('projects')
    .select(`
      *,
      artists!inner (
        id,
        name,
        description,
        contact_email
      ),
      legs (
        id,
        label,
        origin_city,
        destination_city,
        departure_date,
        arrival_date,
        departure_time,
        arrival_time,
        leg_order,
        leg_passengers (
          tour_personnel (
            id,
            full_name
          )
        )
      ),
      tour_personnel (
        id,
        full_name,
        email,
        phone,
        role_title,
        is_vip,
        passport_number,
        nationality,
        date_of_birth,
        dietary_requirements,
        emergency_contact_name,
        emergency_contact_phone,
        special_requests,
        is_active,
        created_at,
        created_by,
        project_id,
        updated_at
      )
    `)
    .eq('id', tourId)
    .eq('is_active', true)
    .single()

  // VERCEL_DEBUG: Log tour query results for debugging 404s
  if (error) {
    console.error('Tour query error:', error, 'for tourId:', tourId)
  }
  if (!tour) {
    console.warn('No tour found for tourId:', tourId, 'user:', user.role)
  }

  return tour
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Employee tour detail page component
 * 
 * @description Main tour management page for employees with tabbed interface
 * for overview, legs, personnel, and budget management. Fixed Next.js 15
 * async params compatibility.
 * 
 * @param params - Promise containing route parameters (id: tour UUID)
 * @returns Promise<JSX.Element> - Tour detail page with management interface
 * 
 * @security Requires authenticated employee
 * @database Fetches tour data via getEmployeeTour
 * @business_rule Shows 404 for inactive tours or access denied
 * 
 * @nextjs_15_fix Awaits params before accessing id property
 * 
 * @example
 * ```tsx
 * // Automatically rendered for route /a/tour/[id]
 * <EmployeeTourPage params={Promise.resolve({ id: 'tour-uuid' })} />
 * ```
 */
export default async function EmployeeTourPage({ params }: PageProps) {
  // NEXTJS_15_FIX: Await params before accessing properties to prevent 404 errors
  const { id } = await params
  const tour = await getEmployeeTour(id)

  if (!tour) {
    notFound()
  }

  // Sort legs by order
  const sortedLegs = tour.legs.sort((a, b) => a.leg_order - b.leg_order)

  // Get budget data
  // Temporarily disabled budget features for authentication fix
  // const budgets = await getProjectBudgets(id)
  // const budgetSnapshot = await getBudgetSnapshot(id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/a">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Tour Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <h1 className="text-3xl font-bold tracking-tight">{tour.name}</h1>
              <Badge variant={tour.type === 'tour' ? 'default' : 'secondary'}>
                {tour.type === 'tour' ? 'Tour' : 'Event'}
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">{tour.artists.name}</p>
            {tour.description && (
              <p className="text-muted-foreground max-w-2xl">{tour.description}</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tour.start_date && tour.end_date
                  ? Math.ceil((new Date(tour.end_date).getTime() - new Date(tour.start_date).getTime()) / (1000 * 60 * 60 * 24))
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                {tour.start_date && tour.end_date ? 'days' : 'Duration unknown'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flights</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tour.legs.length}</div>
              <p className="text-xs text-muted-foreground">Total legs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personnel</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tour.tour_personnel.length}</div>
              <p className="text-xs text-muted-foreground">Travelers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tour.budget_amount 
                  ? `$${(tour.budget_amount / 1000000).toFixed(1)}M`
                  : '—'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {tour.budget_currency || 'USD'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="legs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="legs">Legs</TabsTrigger>
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          {/* <TabsTrigger value="budget">Budget</TabsTrigger> */}
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="legs" className="space-y-4">
          <div className="card-muted">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Flight Legs</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage {sortedLegs.length} flight{sortedLegs.length !== 1 ? 's' : ''} for this {tour.type}
                  </p>
                </div>
                <AddLegDialog projectId={tour.id} />
              </div>
            </div>
            <div className="p-4">
              {sortedLegs.length === 0 ? (
                <div className="text-center py-8">
                  <Plane className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No flights scheduled</h3>
                  <p className="mt-2 text-muted-foreground">
                    Flight legs will appear here once they are added to this tour.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leg</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Arrival</TableHead>
                      <TableHead>Passengers</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLegs.map((leg) => (
                      <TableRow key={leg.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">Leg {leg.leg_order}</Badge>
                            {leg.label && <span className="font-medium">{leg.label}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{leg.origin_city}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{leg.destination_city}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {leg.departure_date 
                              ? new Date(leg.departure_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'TBD'
                            }
                            {leg.departure_time && (
                              <div className="text-sm text-muted-foreground">
                                {leg.departure_time}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {leg.arrival_date 
                              ? new Date(leg.arrival_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'TBD'
                            }
                            {leg.arrival_time && (
                              <div className="text-sm text-muted-foreground">
                                {leg.arrival_time}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{leg.leg_passengers.length}</span>
                            <span className="text-muted-foreground"> assigned</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/a/tour/${tour.id}/leg/${leg.id}`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Manage
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <PersonnelTab 
            projectId={tour.id} 
            personnel={tour.tour_personnel} 
          />
        </TabsContent>

        {/* Temporarily disabled budget tab for authentication fix */}
        {/* <TabsContent value="budget" className="space-y-4">
          <BudgetManagement 
            projectId={params.id}
            budgets={budgets}
            snapshot={budgetSnapshot}
            tourPersonnel={tour.tour_personnel.map(p => ({
              id: p.id,
              full_name: p.full_name,
              party: p.party
            }))}
          />
        </TabsContent> */}

        <TabsContent value="documents" className="space-y-4">
          <div className="card-muted">
            <div className="p-4 border-b border-border/50">
              <h3 className="text-lg font-medium">Documents</h3>
              <p className="text-sm text-muted-foreground">
                Itineraries, invoices, and other tour documents
              </p>
            </div>
            <div className="p-4">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium">Document Management</h3>
                <p className="mt-2 text-sm text-muted-foreground mb-4">
                  Upload, manage, and organize tour documents.
                </p>
                <Button asChild>
                  <Link href={`/a/tour/${tour.id}/documents`}>
                    Manage Documents
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
