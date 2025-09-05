/**
 * @fileoverview Employee leg detail page for flight option management
 * 
 * @description Comprehensive leg management interface for employees including
 * passenger assignment, option management, and Navitas parsing. Fixed Next.js 15
 * async params compatibility.
 * 
 * @route /a/tour/[id]/leg/[legId]
 * @access Employee only (agent, admin roles)
 * @security Requires authenticated employee via getServerUser
 * @database Reads from legs, projects, artists, leg_passengers, tour_personnel, options
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'
import { NavitasParser } from '@/components/employee/navitas-parser'
import { PassengerAssignment } from '@/components/employee/passenger-assignment'
import { OptionManagement } from '@/components/employee/option-management'
import { ChatButton } from '@/components/chat/ChatButton'

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
        full_name: string
      }
    }>
    option_components: Array<{
      id: string
      component_order: number
      navitas_text: string
    }>
  }>
}

type ProjectPersonnel = {
  id: string
  full_name: string
  email: string | null
  role_title: string | null
  is_vip: boolean
  is_assigned: boolean
}

async function getLegDetails(projectId: string, legId: string): Promise<LegWithDetails | null> {
  const user = await getServerUser()
  if (!user || user.role === 'client') return null

  const supabase = await createServerClient()

  // Get leg with related data
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
          is_vip
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
            full_name
          )
        ),
        option_components (
          id,
          component_order,
          navitas_text
        )
      )
    `)
    .eq('id', legId)
    .eq('project_id', projectId)
    .single()

  return leg
}

async function getProjectPersonnel(projectId: string, legId: string): Promise<ProjectPersonnel[]> {
  const supabase = await createServerClient()

  // Get all project personnel
  const { data: personnel } = await supabase
    .from('tour_personnel')
    .select(`
      id,
      full_name,
      email,
      role_title,
      is_vip
    `)
    .eq('project_id', projectId)
    .order('full_name')

  if (!personnel) return []

  // Get assigned personnel for this leg
  const { data: assignments } = await supabase
    .from('leg_passengers')
    .select('passenger_id')
    .eq('leg_id', legId)

  const assignedIds = new Set(assignments?.map(a => a.passenger_id) || [])

  return personnel.map(person => ({
    ...person,
    is_assigned: assignedIds.has(person.id)
  }))
}

interface PageProps {
  params: Promise<{
    id: string
    legId: string
  }>
}

/**
 * Employee leg detail management page component
 * 
 * @description Comprehensive leg management interface with passenger assignment,
 * option management, and Navitas parsing capabilities. Fixed Next.js 15 async
 * params compatibility and proper component prop passing.
 * 
 * @param params - Promise containing route parameters (id: tour UUID, legId: leg UUID)
 * @returns Promise<JSX.Element> - Leg management page with tabbed interface
 * 
 * @security Requires authenticated employee
 * @database Fetches leg and personnel data via parallel queries
 * @business_rule Shows 404 for non-existent legs or unauthorized access
 * 
 * @nextjs_15_fix Awaits params before accessing id/legId properties
 * @component_fix Passes awaited legId to child components instead of params.legId
 * 
 * @example
 * ```tsx
 * // Automatically rendered for route /a/tour/[id]/leg/[legId]
 * <EmployeeLegPage params={Promise.resolve({ id: 'tour-uuid', legId: 'leg-uuid' })} />
 * ```
 */
export default async function EmployeeLegPage({ params }: PageProps) {
  // NEXTJS_15_FIX: Await params before accessing properties to prevent 404 errors
  const { id, legId } = await params
  const [leg, personnel] = await Promise.all([
    getLegDetails(id, legId),
    getProjectPersonnel(id, legId)
  ])

  if (!leg) {
    notFound()
  }

  const assignedPersonnel = personnel.filter(p => p.is_assigned)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/a/tour/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {leg.projects.name}
          </Link>
        </Button>

        {/* Chat Button */}
        <ChatButton legId={legId} variant="outline" size="sm" />
      </div>

      {/* Leg Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {leg.label || `Leg ${leg.leg_order}`}
              </h1>
              <Badge variant="outline">
                {leg.projects.artists.name}
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">
              {leg.origin_city} → {leg.destination_city}
            </p>
            {leg.departure_date && (
              <p className="text-muted-foreground">
                Departure: {new Date(leg.departure_date).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                {leg.departure_time && ` at ${leg.departure_time}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Passenger Assignment */}
        {/* COMPONENT_FIX: Pass awaited legId instead of params.legId */}
        <PassengerAssignment legId={legId} personnel={personnel} />

        {/* Option Entry */}
        <div>
          {/* COMPONENT_FIX: Pass awaited legId instead of params.legId */}
          <NavitasParser legId={legId} />
        </div>
      </div>

      {/* Flight Options */}
      <OptionManagement 
        options={leg.options} 
        assignedPersonnel={assignedPersonnel.map(p => ({ 
          id: p.id, 
          full_name: p.full_name, 
          is_assigned: true 
        }))} 
      />
    </div>
  )
}
