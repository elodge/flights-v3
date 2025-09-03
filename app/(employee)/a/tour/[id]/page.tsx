import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Calendar, Plane, Users, FileText, Settings, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'

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
  tour_personnel: Array<{
    id: string
    full_name: string
    email: string | null
    role_title: string | null
    is_vip: boolean
    passport_number: string | null
    nationality: string | null
  }>
}

async function getEmployeeTour(tourId: string): Promise<TourWithDetails | null> {
  const user = await getServerUser()
  if (!user || user.role === 'client') return null

  const supabase = await createServerClient()

  // Get tour with related data (employees can see all)
  const { data: tour } = await supabase
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
        role_title,
        is_vip,
        passport_number,
        nationality
      )
    `)
    .eq('id', tourId)
    .eq('is_active', true)
    .single()

  return tour
}

interface PageProps {
  params: {
    id: string
  }
}

export default async function EmployeeTourPage({ params }: PageProps) {
  const tour = await getEmployeeTour(params.id)

  if (!tour) {
    notFound()
  }

  // Sort legs by order
  const sortedLegs = tour.legs.sort((a, b) => a.leg_order - b.leg_order)

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
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="legs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Flight Legs</CardTitle>
                  <CardDescription>
                    Manage {sortedLegs.length} flight{sortedLegs.length !== 1 ? 's' : ''} for this {tour.type}
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Leg
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tour Personnel</CardTitle>
                  <CardDescription>
                    Manage {tour.tour_personnel.length} person{tour.tour_personnel.length !== 1 ? 's' : ''} in this {tour.type}
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Person
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tour.tour_personnel.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No personnel assigned</h3>
                  <p className="mt-2 text-muted-foreground">
                    Tour personnel will appear here once they are added to this tour.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Travel Info</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tour.tour_personnel.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{person.full_name}</span>
                            {person.is_vip && (
                              <Badge variant="secondary" className="text-xs">VIP</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{person.role_title || 'Traveler'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {person.email || 'No email'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {person.nationality && (
                              <div>Nationality: {person.nationality}</div>
                            )}
                            {person.passport_number && (
                              <div>Passport: {person.passport_number}</div>
                            )}
                            {!person.nationality && !person.passport_number && (
                              <span>No travel info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Settings className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Itineraries, invoices, and other tour documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Documents coming soon</h3>
                <p className="mt-2 text-muted-foreground">
                  Document management features will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
