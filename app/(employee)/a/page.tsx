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
import { getSelectedArtistIdFromSearchParams } from '@/lib/employeeArtist'
import { getSelectedArtistIdFromCookie } from '@/lib/actions/artist-selection-actions'
import { CreateTourDialog } from '@/components/employee/create-tour-dialog'

type TourWithStats = Database['public']['Tables']['projects']['Row'] & {
  artists: {
    id: string
    name: string
    description: string | null
  }
  legs: Array<{
    id: string
    label: string | null
    origin_city: string | null
    destination_city: string
    departure_date: string | null
  }>
  _counts: {
    legs: number
    unconfirmed_selections: number
    expiring_holds: number
  }
}

async function getEmployeeTours(artistId?: string | null): Promise<TourWithStats[]> {
  const user = await getServerUser()
  if (!user || user.role === 'client') return []

  const supabase = await createServerClient()

  // Get all tours/events for employees (no RLS restriction)
  let query = supabase
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

  // Apply artist filter if provided
  if (artistId) {
    query = query.eq('artist_id', artistId)
  }

  const { data: tours } = await query.order('created_at', { ascending: false })

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
export default async function EmployeePortalPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const awaited = await searchParams
  // Get selected artist from URL params or cookies
  const urlArtistId = getSelectedArtistIdFromSearchParams(awaited)
  const cookieArtistId = await getSelectedArtistIdFromCookie()
  const selectedArtistId = urlArtistId || cookieArtistId
  
  const tours = await getEmployeeTours(selectedArtistId)
  
  // Get artist name for display if filtering
  let selectedArtistName: string | null = null
  if (selectedArtistId && tours.length > 0) {
    selectedArtistName = tours[0].artists.name
  }
  
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
    <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-6">
      <div className="space-y-2 mb-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">Tour Management Dashboard</h1>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Manage flights, tours, events, and crew coordination across all artists
            </p>
            {selectedArtistName && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-2">
                  <Eye className="h-3 w-3" />
                  Viewing: {selectedArtistName}
                </Badge>
                <Link href="/a" className="text-xs text-muted-foreground hover:text-foreground">
                  Clear filter
                </Link>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <CreateTourDialog />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card-muted p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Active Tours</h3>
          </div>
          <div className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{totalTours}</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Tours and events</p>
        </div>

        <div className="card-muted p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Total Legs</h3>
          </div>
          <div className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{totalLegs}</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Flight segments</p>
        </div>

        <div className="card-muted p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Unconfirmed</h3>
          </div>
          <div className="text-4xl font-bold tabular-nums text-amber-600">
            {totalUnconfirmed > 0 ? totalUnconfirmed : '—'}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Pending selections</p>
        </div>

        <div className="card-muted p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Expiring Holds</h3>
          </div>
          <div className="text-4xl font-bold tabular-nums text-red-600">
            {totalExpiring > 0 ? totalExpiring : '—'}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Next 24 hours</p>
        </div>
      </div>

      {/* Tours by Artist */}
      <div className="space-y-6">
        {Object.keys(toursByArtist).length === 0 ? (
          <div className="card-muted p-6">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No active tours</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tours and events will appear here once they are created.
              </p>
            </div>
          </div>
        ) : (
          Object.entries(toursByArtist).map(([artistName, artistTours]) => (
            <div key={artistName} className="space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <h2 className="text-lg font-medium">{artistName}</h2>
                {artistTours.length > 1 && (
                  <Badge variant="secondary">{artistTours.length} tours</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {artistTours.map((tour) => (
                  <Link key={tour.id} href={`/a/tour/${tour.id}`} className="group">
                    <div className="card-muted p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {tour.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={tour.type === 'tour' ? 'default' : 'secondary'} className="text-xs">
                                {tour.type === 'tour' ? 'Tour' : 'Event'}
                              </Badge>
                              {tour._counts.unconfirmed_selections > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {tour._counts.unconfirmed_selections} pending
                                </Badge>
                              )}
                              {tour._counts.expiring_holds > 0 && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                                  {tour._counts.expiring_holds} expiring
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="ml-2 shrink-0">
                            Manage
                          </Button>
                        </div>
                        
                        {tour.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {tour.description}
                          </p>
                        )}
                        
                        <div className="space-y-1">
                          {/* Tour dates */}
                          {tour.start_date && (
                            <div className="text-sm text-muted-foreground">
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
                          <div className="text-sm text-muted-foreground">
                            {tour._counts.legs} leg{tour._counts.legs !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}