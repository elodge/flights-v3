import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Plane, Eye, Music, Mic } from 'lucide-react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'

type Project = Database['public']['Tables']['projects']['Row'] & {
  artists: {
    id: string
    name: string
    description: string | null
  }
  legs: Array<{
    id: string
    label: string | null
    origin_city: string
    destination_city: string
    departure_date: string | null
  }>
  _count: {
    pending_selections: number
  }
}

async function getClientProjects(): Promise<Project[]> {
  const user = await getServerUser()
  if (!user) return []

  const supabase = await createServerClient()

  // Get user's assigned artist IDs
  const { data: artistAssignments } = await supabase
    .from('artist_assignments')
    .select('artist_id')
    .eq('user_id', user.id)

  if (!artistAssignments || artistAssignments.length === 0) {
    return []
  }

  const artistIds = artistAssignments.map(a => a.artist_id)

  // Get projects for assigned artists with related data
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      artists!inner (
        id,
        name,
        description
      ),
      legs (
        id,
        label,
        origin_city,
        destination_city,
        departure_date
      )
    `)
    .in('artist_id', artistIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!projects) return []

  // For now, mock the pending selections count
  // In a real app, this would be a complex query joining selections, holds, etc.
  const projectsWithCounts: Project[] = projects.map(project => ({
    ...project,
    _count: {
      pending_selections: Math.floor(Math.random() * 5) // Mock data
    }
  }))

  return projectsWithCounts
}

export default async function ClientPortalPage() {
  const projects = await getClientProjects()
  
  // Group projects by artist
  const projectsByArtist = projects.reduce((acc, project) => {
    const artistName = project.artists.name
    if (!acc[artistName]) {
      acc[artistName] = []
    }
    acc[artistName].push(project)
    return acc
  }, {} as Record<string, Project[]>)

  const totalUpcomingFlights = projects.reduce((sum, project) => sum + project.legs.length, 0)
  const nextFlight = projects
    .flatMap(p => p.legs)
    .filter(leg => leg.departure_date && new Date(leg.departure_date) > new Date())
    .sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime())[0]

  return (
    <div className="space-y-6">
      {/* Client Portal Header */}
              <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Portal</h1>
          <p className="text-muted-foreground">Manage your flight bookings and tour details</p>
        </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Tours and events</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Flights</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUpcomingFlights}</div>
            <p className="text-xs text-muted-foreground">Total legs scheduled</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Flight</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextFlight ? new Date(nextFlight.departure_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextFlight ? `${nextFlight.origin_city} to ${nextFlight.destination_city}` : 'No upcoming flights'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Artists</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(projectsByArtist).length}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects by Artist */}
      <div className="space-y-8">
        {Object.keys(projectsByArtist).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Music className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
                <p className="mt-2 text-muted-foreground">
                  You haven&apos;t been assigned to any artists yet. Contact your administrator to get access.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(projectsByArtist).map(([artistName, artistProjects]) => (
            <div key={artistName} className="space-y-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold tracking-tight">{artistName}</h2>
                <Badge variant="secondary">{artistProjects.length} projects</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artistProjects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant={project.type === 'tour' ? 'default' : 'secondary'}>
                              {project.type === 'tour' ? 'Tour' : 'Event'}
                            </Badge>
                            {project._count.pending_selections > 0 && (
                              <Badge variant="destructive">
                                {project._count.pending_selections} pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.description || `${project.type === 'tour' ? 'Multi-city tour' : 'Special event'} with ${project.legs.length} flight${project.legs.length !== 1 ? 's' : ''} scheduled.`}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        {/* Project dates */}
                        {project.start_date && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            {new Date(project.start_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {project.end_date && project.end_date !== project.start_date && (
                              <> - {new Date(project.end_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}</>
                            )}
                          </div>
                        )}
                        
                        {/* Flight count */}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Plane className="mr-2 h-4 w-4" />
                          {project.legs.length} flight{project.legs.length !== 1 ? 's' : ''}
                        </div>
                        
                        {/* Next flight */}
                        {project.legs.length > 0 && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-2 h-4 w-4" />
                            <span className="truncate">
                              {project.legs[0].origin_city} → {project.legs[0].destination_city}
                            </span>
                          </div>
                        )}
                        
                        <Button asChild className="w-full mt-4">
                          <Link href={`/c/project/${project.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Project
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
