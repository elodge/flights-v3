import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plane, Settings } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { Database } from '@/lib/database.types'

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
  }>
}

async function getLeg(projectId: string, legId: string): Promise<LegWithDetails | null> {
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
        is_available
      )
    `)
    .eq('id', legId)
    .eq('project_id', projectId)
    .in('projects.artist_id', artistIds)
    .single()

  return leg
}

interface PageProps {
  params: {
    id: string
    legId: string
  }
}

export default async function LegPage({ params }: PageProps) {
  const leg = await getLeg(params.id, params.legId)

  if (!leg) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/c/project/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {leg.projects.name}
          </Link>
        </Button>
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
          </div>
        </div>
      </div>

      {/* Flight Selection Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Flight Selection</span>
          </CardTitle>
          <CardDescription>
            Choose your preferred flight option for this leg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Plane className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Flight selection coming soon</h3>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              You&apos;ll be able to view and select from available flight options for this leg once the flight selection feature is implemented.
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Available options:</strong> {leg.options.length}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Passengers:</strong> {leg.leg_passengers.length}
              </p>
              {leg.departure_date && (
                <p className="text-sm text-muted-foreground">
                  <strong>Departure:</strong> {new Date(leg.departure_date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
