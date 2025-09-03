/**
 * @fileoverview Booking queue page for processing client flight selections
 * 
 * @description Employee portal page for managing client-confirmed selections,
 * processing holds, ticketing, PNR creation, and document management.
 * Shows selections grouped by Tour → Leg with urgency-based sorting.
 * 
 * @route /a/queue
 * @access Employee only (agent, admin roles)
 * @database selections, options, legs, projects, artists, tour_personnel, holds, pnrs, documents
 */

import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { BookingQueue } from '@/components/employee/booking-queue'
import { BookingQueueSkeleton } from '@/components/employee/booking-queue-skeleton'
import { getSelectedArtistIdFromSearchParams } from '@/lib/employeeArtist'
import { getSelectedArtistIdFromCookie } from '@/lib/actions/artist-selection-actions'
import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

interface Selection {
  id: string
  passenger_id: string
  option_id: string
  status: 'client_choice' | 'held' | 'ticketed' | 'expired'
  created_at: string
  passenger: {
    id: string
    full_name: string
    party_tag: string
  }
  option: {
    id: string
    airline: string
    flight_number: string
    route: string
    departure_date: string
    price_per_pax: number | null
    is_recommended: boolean
  }
  leg: {
    id: string
    origin: string
    destination: string
    departure_date: string
    label: string | null
    project: {
      id: string
      name: string
      type: 'tour' | 'event'
      artist: {
        id: string
        name: string
      }
    }
  }
  holds: Array<{
    id: string
    expires_at: string
  }>
  pnr: {
    id: string
    code: string
  } | null
}

interface QueueData {
  selections: Selection[]
  totalCount: number
}

/**
 * Fetches client-confirmed selections for the booking queue with pagination
 * 
 * @param artistId - Optional artist ID for filtering
 * @param page - Page number (0-based)
 * @param limit - Items per page (default 50)
 * @returns Promise<QueueData> Queue selections with related data
 */
async function getQueueSelections(
  artistId?: string | null, 
  page: number = 0, 
  limit: number = 50
): Promise<QueueData> {
  const supabase = await createServerClient()
  
  // First, get the selections with basic data and filtering
  let selectionsQuery = supabase
    .from('selections')
    .select(`
      id,
      passenger_id,
      option_id,
      leg_id,
      status,
      created_at
    `, { count: 'exact' })
    .not('status', 'eq', 'expired')

  // Apply artist filter if provided - we'll filter after fetching legs
  // Supabase doesn't support deep filtering on this complex join efficiently

  const { data: baseSelections, error: selectionsError, count } = await selectionsQuery
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (selectionsError) {
    console.error('Error fetching queue selections:', selectionsError)
    return { selections: [], totalCount: 0 }
  }

  if (!baseSelections || baseSelections.length === 0) {
    return { selections: [], totalCount: count || 0 }
  }

  // Now fetch the related data separately for better performance
  const selectionIds = baseSelections.map(s => s.id)
  const passengerIds = baseSelections.map(s => s.passenger_id)
  const optionIds = baseSelections.map(s => s.option_id)
  const legIds = baseSelections.map(s => s.leg_id)

  // Fetch related data in parallel
  const [
    { data: passengers },
    { data: options },
    { data: legs },
    { data: holds },
    { data: pnrs }
  ] = await Promise.all([
    // Passengers
    supabase
      .from('tour_personnel')
      .select('id, full_name, party_tag')
      .in('id', passengerIds),
    
    // Options
    supabase
      .from('options')
      .select('id, airline, flight_number, route, departure_date, price_per_pax, is_recommended')
      .in('id', optionIds),
    
    // Legs with projects and artists
    supabase
      .from('legs')
      .select(`
        id, origin, destination, departure_date, label,
        project:projects!project_id (
          id, name, type,
          artist:artists!artist_id (id, name)
        )
      `)
      .in('id', legIds),
    
    // Holds
    supabase
      .from('holds')
      .select('id, expires_at, option_id, passenger_id')
      .in('option_id', optionIds)
      .in('passenger_id', passengerIds),
    
    // PNRs
    supabase
      .from('pnrs')
      .select('id, code, passenger_id')
      .in('passenger_id', passengerIds)
  ])

  // Create lookup maps for efficient joining
  const passengerMap = new Map(passengers?.map(p => [p.id, p]) || [])
  const optionMap = new Map(options?.map(o => [o.id, o]) || [])
  const legMap = new Map(legs?.map(l => [l.id, l]) || [])
  const holdsMap = new Map()
  const pnrMap = new Map(pnrs?.map(p => [p.passenger_id, p]) || [])

  // Group holds by option_id and passenger_id
  holds?.forEach(hold => {
    const key = `${hold.option_id}-${hold.passenger_id}`
    if (!holdsMap.has(key)) {
      holdsMap.set(key, [])
    }
    holdsMap.get(key).push(hold)
  })

  // Combine the data
  const enrichedSelections: Selection[] = baseSelections.map(selection => {
    const holdsKey = `${selection.option_id}-${selection.passenger_id}`
    return {
      ...selection,
      passenger: passengerMap.get(selection.passenger_id) || { id: selection.passenger_id, full_name: 'Unknown', party_tag: '' },
      option: optionMap.get(selection.option_id) || { 
        id: selection.option_id, 
        airline: '', 
        flight_number: '', 
        route: '', 
        departure_date: '', 
        price_per_pax: null, 
        is_recommended: false 
      },
      leg: legMap.get(selection.leg_id) || { 
        id: selection.leg_id, 
        origin: '', 
        destination: '', 
        departure_date: '', 
        label: null,
        project: { id: '', name: '', type: 'tour' as const, artist: { id: '', name: '' } }
      },
      holds: holdsMap.get(holdsKey) || [],
      pnr: pnrMap.get(selection.passenger_id) || null
    }
  })

  // Apply artist filter after enriching data if needed
  const filteredSelections = artistId 
    ? enrichedSelections.filter(selection => 
        selection.leg.project.artist.id === artistId
      )
    : enrichedSelections

  return {
    selections: filteredSelections,
    totalCount: artistId ? filteredSelections.length : (count || 0)
  }
}

/**
 * Booking queue page for employee portal
 * 
 * @description Main queue interface for processing client flight selections.
 * Shows selections grouped by tour/leg with hold urgency sorting and filtering.
 * Provides booking actions, PNR management, and document upload capabilities.
 * 
 * @access Employee only (agent, admin roles)
 * @route /a/queue
 * 
 * @returns JSX.Element Booking queue interface
 */
export default async function BookingQueuePage({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  // Check authentication and role
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }
  
  if (user.role === 'client') {
    redirect('/c')
  }

  // Get selected artist from URL params or cookies
  const urlArtistId = getSelectedArtistIdFromSearchParams(searchParams)
  const cookieArtistId = await getSelectedArtistIdFromCookie()
  const selectedArtistId = urlArtistId || cookieArtistId

  // Fetch queue data with optional artist filtering
  const queueData = await getQueueSelections(selectedArtistId)
  
  // Get artist name for display if filtering
  let selectedArtistName: string | null = null
  if (selectedArtistId && queueData.selections.length > 0) {
    selectedArtistName = queueData.selections[0].leg.project.artist.name
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Booking Queue</h1>
          <p className="text-muted-foreground">
            Process client selections, manage holds, and create tickets
          </p>
          {selectedArtistName && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-2">
                <Eye className="h-3 w-3" />
                Filtered by: {selectedArtistName}
              </Badge>
              <Link href="/a/queue" className="text-xs text-muted-foreground hover:text-foreground">
                Show all artists
              </Link>
            </div>
          )}
          {!selectedArtistName && queueData.totalCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing selections from all artists
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>{queueData.totalCount} selections {selectedArtistName ? `for ${selectedArtistName}` : 'pending'}</span>
        </div>
      </div>

      <Suspense fallback={<BookingQueueSkeleton />}>
        <BookingQueue 
          selections={queueData.selections}
          totalCount={queueData.totalCount}
        />
      </Suspense>
    </div>
  )
}
