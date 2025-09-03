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
import { getSelectedArtistIdServer } from '@/lib/employeeArtist'
import { getSelectedArtistIdFromCookie } from '@/lib/actions/artist-selection-actions'
import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'
import Link from 'next/link'

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
 * Fetches all client-confirmed selections for the booking queue
 * 
 * @returns Promise<QueueData> Queue selections with related data
 */
async function getQueueSelections(artistId?: string | null): Promise<QueueData> {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('selections')
    .select(`
      id,
      passenger_id,
      option_id,
      status,
      created_at,
      passenger:tour_personnel!passenger_id (
        id,
        full_name,
        party_tag
      ),
      option:options!option_id (
        id,
        airline,
        flight_number,
        route,
        departure_date,
        price_per_pax,
        is_recommended
      ),
      leg:legs!leg_id (
        id,
        origin,
        destination,
        departure_date,
        label,
        project:projects!project_id (
          id,
          name,
          type,
          artist:artists!artist_id (
            id,
            name
          )
        )
      ),
      holds (
        id,
        expires_at
      ),
      pnr:pnrs!passenger_id (
        id,
        code
      )
    `)
    .not('status', 'eq', 'expired')

  // Apply artist filter through join if provided
  if (artistId) {
    // Filter through the nested relationship
    query = query.eq('leg.project.artist_id', artistId)
  }

  const { data: selections, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching queue selections:', error)
    return { selections: [], totalCount: 0 }
  }

  return {
    selections: selections || [],
    totalCount: selections?.length || 0
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
  const urlArtistId = getSelectedArtistIdServer(
    new URLSearchParams(searchParams as Record<string, string>)
  )
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

      <BookingQueue 
        selections={queueData.selections}
        totalCount={queueData.totalCount}
      />
    </div>
  )
}
