/**
 * @fileoverview Employee dashboard for tour management
 * 
 * @description Main dashboard page for agents and admins to view and manage
 * all tours/events across artists. Shows statistics and provides navigation
 * to detailed tour management pages.
 * 
 * @route /a
 * @access Employee only (agent, admin roles)
 * @database projects, artists, legs, leg_passengers, selections, holds
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plane, Users, AlertTriangle, Clock, Eye } from 'lucide-react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'

type TourWithStats = Database['public']['Tables']['projects']['Row'] & {
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
  _counts: {
    legs: number
    unconfirmed_selections: number
    expiring_holds: number
  }
}

async function getEmployeeTours(): Promise<TourWithStats[]> {
  const user = await getServerUser()
  if (!user || user.role === 'client') return []

  const supabase = await createServerClient()

  // Get all tours/events for employees (no RLS restriction)
  const { data: tours } = await supabase
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
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!tours) return []

  // Add computed counts (mock for now - would be complex queries in production)
  const toursWithStats: TourWithStats[] = tours.map(tour => ({
    ...tour,
    _counts: {
      legs: tour.legs.length,
      unconfirmed_selections: Math.floor(Math.random() * 5), // Mock
      expiring_holds: Math.floor(Math.random() * 3), // Mock
    }
  }))

  return toursWithStats
}

/**
 * Employee dashboard showing all tours grouped by artist with statistics
 * 
 * @description Main landing page for agents and admins. Displays all tours/events
 * organized by artist with key metrics: legs count, unconfirmed selections,
 * and expiring holds. Provides quick navigation to detailed tour management.
 * 
 * @access Employee only (agent, admin roles)
 * @route /a
 * 
 * @returns JSX.Element Dashboard with tour cards grouped by artist
 * 
 * @example
 * ```tsx
 * // Rendered automatically for authenticated employees at /a
 * <EmployeePortalPage />
 * ```
 */
export default async function EmployeePortalPage() {
  const tours = await getEmployeeTours()
  
  // Group tours by artist
  const toursByArtist = tours.reduce((acc, tour) => {
    const artistName = tour.artists.name
    if (!acc[artistName]) {
      acc[artistName] = []
    }
    acc[artistName].push(tour)
    return acc
  }, {} as Record<string, TourWithStats[]>)

  const totalTours = tours.length
  const totalLegs = tours.reduce((sum, t) => sum + t._counts.legs, 0)
  const totalUnconfirmed = tours.reduce((sum, t) => sum + t._counts.unconfirmed_selections, 0)
  const totalExpiring = tours.reduce((sum, t) => sum + t._counts.expiring_holds, 0)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Tour Management Dashboard</h1>
        <p className="text-muted-foreground">
          Manage flights, tours, events, and crew coordination across all artists
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tours</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTours}</div>
            <p className="text-xs text-muted-foreground">Tours and events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Legs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLegs}</div>
            <p className="text-xs text-muted-foreground">Flight segments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unconfirmed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalUnconfirmed}</div>
            <p className="text-xs text-muted-foreground">Pending selections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Holds</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalExpiring}</div>
            <p className="text-xs text-muted-foreground">Next 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Tours by Artist */}
      <div className="space-y-8">
        {Object.keys(toursByArtist).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Plane className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No active tours</h3>
                <p className="mt-2 text-muted-foreground">
                  Tours and events will appear here once they are created.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(toursByArtist).map(([artistName, artistTours]) => (
            <div key={artistName} className="space-y-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold tracking-tight">{artistName}</h2>
                <Badge variant="secondary">{artistTours.length} tours</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artistTours.map((tour) => (
                  <Card key={tour.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{tour.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant={tour.type === 'tour' ? 'default' : 'secondary'}>
                              {tour.type === 'tour' ? 'Tour' : 'Event'}
                            </Badge>
                            {tour._counts.unconfirmed_selections > 0 && (
                              <Badge variant="destructive">
                                {tour._counts.unconfirmed_selections} pending
                              </Badge>
                            )}
                            {tour._counts.expiring_holds > 0 && (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                {tour._counts.expiring_holds} expiring
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {tour.description || `${tour.type === 'tour' ? 'Multi-city tour' : 'Special event'} with ${tour._counts.legs} leg${tour._counts.legs !== 1 ? 's' : ''} scheduled.`}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        {/* Tour dates */}
                        {tour.start_date && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            {new Date(tour.start_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {tour.end_date && tour.end_date !== tour.start_date && (
                              <> - {new Date(tour.end_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}</>
                            )}
                          </div>
                        )}
                        
                        {/* Stats */}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Plane className="mr-2 h-4 w-4" />
                          {tour._counts.legs} leg{tour._counts.legs !== 1 ? 's' : ''}
                        </div>
                        
                        <Button asChild className="w-full mt-4">
                          <Link href={`/a/tour/${tour.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Manage Tour
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