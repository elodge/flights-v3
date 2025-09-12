/**
 * @fileoverview Compact Leg Management Page - High-density flight option interface
 * 
 * @description Server-side page component for the compact leg management interface that
 * provides a high-density workflow for agents to manage flight options on tour legs.
 * Features passenger filtering, Navitas parsing, dual view modes (By Passenger/By Flight),
 * and integrated option creation. Replaces the existing leg workflow while maintaining
 * the old page for reference. Integrates with the EnhancedNavitasModal for streamlined
 * multi-option creation.
 * 
 * @route /a/tour/[id]/leg/[legId]/manage
 * @access Employee only (agent, admin roles)
 * @security Requires authenticated employee via getServerUser with non-client role
 * @database Reads from legs, projects, artists, leg_passengers, tour_personnel, options, option_components, option_passengers tables
 * @business_rule Provides 404 for non-existent legs or unauthorized access
 * @business_rule Merges option_passengers data with options for complete passenger associations
 * @business_rule Supports both legacy holds-based and new option_passengers-based data structures
 * 
 * @example
 * ```tsx
 * // Automatically rendered for route /a/tour/[id]/leg/[legId]/manage
 * // where [id] is tour UUID and [legId] is leg UUID
 * <CompactLegPage params={Promise.resolve({ id: 'tour-uuid', legId: 'leg-uuid' })} />
 * ```
 */

import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'
import { CompactLegManager } from '@/components/employee/compact-leg-manager'

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
      party: string | null
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
        id: string
        full_name: string
      }
    }>
    option_passengers: Array<{
      id: string
      passenger_id: string
      tour_personnel: {
        id: string
        full_name: string
        is_vip: boolean
        role_title: string | null
        party: string | null
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

/**
 * Fetches leg details with all related data for the compact manager
 * 
 * @description Retrieves leg information including project, artist, assigned passengers,
 * and existing options with their components and holds. Used for the compact management interface.
 * 
 * @param projectId - Tour/project UUID
 * @param legId - Leg UUID
 * @returns Promise<LegWithDetails | null> - Complete leg data or null if not found
 * 
 * @security Requires authenticated employee (non-client role)
 * @database Queries legs, projects, artists, leg_passengers, tour_personnel, options tables
 * @business_rule Returns null for unauthorized access or non-existent legs
 */
async function getLegDetails(projectId: string, legId: string): Promise<LegWithDetails | null> {
  const user = await getServerUser()
  if (!user || user.role === 'client') return null

  const supabase = await createServerClient()

  // CONTEXT: First get the basic leg data
  const { data: leg } = await supabase
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
          is_vip,
          party
        )
      ),
      options (
        id,
        name,
        description,
        total_cost,
        currency,
        is_recommended,
        is_available,
        holds (
          id,
          expires_at,
          tour_personnel (
            id,
            full_name
          )
        ),
        option_components (
          id,
          component_order,
          navitas_text,
          flight_number,
          airline,
          airline_iata,
          airline_name,
          dep_iata,
          arr_iata,
          departure_time,
          arrival_time,
          dep_time_local,
          arr_time_local,
          day_offset,
          duration_minutes,
          stops,
          enriched_terminal_gate
        )
      )
    `)
    .eq('id', legId)
    .eq('project_id', projectId)
    .single()

  if (!leg) return null

  // CONTEXT: Separately fetch option_passengers data and merge it
  const { data: optionPassengers, error: optionPassengersError } = await supabase
    .from('option_passengers' as any)
    .select('id, option_id, passenger_id')
    .in('option_id', leg.options.map(o => o.id))

  // CONTEXT: Separately fetch tour_personnel data for the passengers
  let tourPersonnelData: any[] = []
  if (optionPassengers && optionPassengers.length > 0) {
    const { data: personnelData } = await supabase
      .from('tour_personnel')
      .select('id, full_name, is_vip, role_title, party')
      .in('id', (optionPassengers as any[]).map(op => op.passenger_id))
    
    tourPersonnelData = personnelData || []
  }

  // CONTEXT: Merge personnel data into option_passengers
  const enrichedOptionPassengers = optionPassengers?.map((op: any) => ({
    ...op,
    tour_personnel: tourPersonnelData.find(tp => tp.id === op.passenger_id)
  })) || []

  // CONTEXT: Merge option_passengers into options
  leg.options = leg.options.map(option => ({
    ...option,
    option_passengers: enrichedOptionPassengers.filter(op => op.option_id === option.id)
  } as any))


  return leg as any
}

interface PageProps {
  params: Promise<{
    id: string
    legId: string
  }>
}

/**
 * Compact leg management page component
 * 
 * @description High-density interface for agents to manage flight options on tour legs.
 * Provides passenger filtering, Navitas parsing, and dual view modes. Fixed Next.js 15
 * async params compatibility.
 * 
 * @param params - Promise containing route parameters (id: tour UUID, legId: leg UUID)
 * @returns Promise<JSX.Element> - Compact leg management interface
 * 
 * @security Requires authenticated employee
 * @database Fetches leg and related data via single query
 * @business_rule Shows 404 for non-existent legs or unauthorized access
 * 
 * @nextjs_15_fix Awaits params before accessing id/legId properties
 * 
 * @example
 * ```tsx
 * // Automatically rendered for route /a/tour/[id]/leg/[legId]/manage
 * <CompactLegPage params={Promise.resolve({ id: 'tour-uuid', legId: 'leg-uuid' })} />
 * ```
 */
export default async function CompactLegPage({ params }: PageProps) {
  // NEXTJS_15_FIX: Await params before accessing properties to prevent 404 errors
  const { id, legId } = await params
  const leg = await getLegDetails(id, legId)

  if (!leg) {
    notFound()
  }

  return (
    <CompactLegManager 
      leg={leg}
      projectId={id}
      legId={legId}
    />
  )
}
