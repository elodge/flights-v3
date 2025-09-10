import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Calendar, Plane, Users, FileText } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'
// Temporarily disabled budget features for authentication fix
// import { BudgetSummary } from '@/components/client/budget-summary'
// import { getBudgetSnapshot } from '@/lib/actions/budget-actions'

type ProjectWithDetails = Database['public']['Tables']['projects']['Row'] & {
  actualBudget?: number
  artists: {
    id: string
    name: string
    description: string | null
    contact_email: string | null
  }
  legs: Array<{
    id: string
    label: string | null
    origin_city: string | null
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
        email: string | null
        role_title: string | null
        is_vip: boolean
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

async function getProject(projectId: string): Promise<ProjectWithDetails | null> {
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

  // Get user's assigned artist IDs to verify access
  const { data: artistAssignments } = await supabase
    .from('artist_assignments')
    .select('artist_id')
    .eq('user_id', user.id)

  if (!artistAssignments || artistAssignments.length === 0) {
    return null
  }

  const artistIds = artistAssignments.map(a => a.artist_id)

  // Get project with related data
  const { data: project } = await supabase
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
            full_name,
            email,
            role_title,
            is_vip
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
    .eq('id', projectId)
    .in('artist_id', artistIds)
    .eq('is_active', true)
    .single()

  if (!project) return null

  // Get tour-level budget from budgets table
  const { data: tourBudget } = await supabase
    .from('budgets')
    .select('amount_cents')
    .eq('project_id', projectId)
    .eq('level', 'tour')
    .single()

  // Use budget from budgets table if available, otherwise fall back to project.budget_amount
  const actualBudget = tourBudget?.amount_cents || project.budget_amount || undefined

  return { ...project, actualBudget }
}

interface PageProps {
  params: {
    id: string
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    notFound()
  }

  // Temporarily disabled budget features for authentication fix
  // const budgetSnapshot = await getBudgetSnapshot(id)

  // Sort legs by order
  const sortedLegs = project.legs.sort((a, b) => a.leg_order - b.leg_order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Button variant="outline" size="sm" asChild>
        <Link href="/c">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </Button>

      {/* Project Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant={project.type === 'tour' ? 'default' : 'secondary'}>
                {project.type === 'tour' ? 'Tour' : 'Event'}
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">{project.artists.name}</p>
            {project.description && (
              <p className="text-muted-foreground max-w-2xl">{project.description}</p>
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
                {project.start_date && project.end_date
                  ? Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                {project.start_date && project.end_date ? 'days' : 'Duration unknown'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flights</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.legs.length}</div>
              <p className="text-xs text-muted-foreground">Total legs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personnel</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.tour_personnel.length}</div>
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
                {project.actualBudget 
                  ? `$${(project.actualBudget / 100).toLocaleString()}`
                  : '—'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {project.budget_currency || 'USD'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content with Budget Summary Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {/* Tabs */}
          <Tabs defaultValue="legs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="legs">Legs</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

        <TabsContent value="legs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flight Legs</CardTitle>
              <CardDescription>
                {sortedLegs.length} flight{sortedLegs.length !== 1 ? 's' : ''} scheduled for this {project.type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedLegs.length === 0 ? (
                <div className="text-center py-8">
                  <Plane className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No flights scheduled</h3>
                  <p className="mt-2 text-muted-foreground">
                    Flight legs will appear here once they are added to this project.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedLegs.map((leg) => (
                    <Card key={leg.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">Leg {leg.leg_order}</Badge>
                              {leg.label && <span className="font-medium">{leg.label}</span>}
                            </div>
                            <div className="flex items-center space-x-2 text-lg">
                              <span className="font-semibold">{leg.origin_city}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-semibold">{leg.destination_city}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/c/project/${project.id}/legs/${leg.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-muted-foreground">Departure</p>
                            <p>
                              {leg.departure_date 
                                ? new Date(leg.departure_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : 'TBD'
                              }
                              {leg.departure_time && (
                                <span className="ml-2 text-muted-foreground">
                                  {leg.departure_time}
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">Arrival</p>
                            <p>
                              {leg.arrival_date 
                                ? new Date(leg.arrival_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : 'TBD'
                              }
                              {leg.arrival_time && (
                                <span className="ml-2 text-muted-foreground">
                                  {leg.arrival_time}
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">Passengers</p>
                            <p>{leg.leg_passengers.length} travelers</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Itineraries, invoices, and other project documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">View Documents</h3>
                <p className="mt-2 text-muted-foreground mb-4">
                  View and download tour documents.
                </p>
                <Button asChild>
                  <Link href={`/tour/${project.id}/documents`}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Documents
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </div>
        
        {/* Budget Summary Sidebar */}
        <div className="lg:col-span-1">
          {/* <BudgetSummary snapshot={budgetSnapshot} /> */}
        </div>
      </div>
    </div>
  )
}
