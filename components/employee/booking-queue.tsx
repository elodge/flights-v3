/**
 * @fileoverview Booking queue interface for processing client selections
 * 
 * @description Interactive queue component for managing client flight selections,
 * holds, ticketing, and document management. Provides filtering, sorting,
 * and batch processing capabilities.
 */

'use client'

import { useState, useMemo, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, Plane, Users, FileText, AlertTriangle, Loader2 } from 'lucide-react'
import { formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { markHeld, markTicketed, revertToClientChoice } from '@/lib/actions/booking-actions'
import { DocumentUpload } from './document-upload'
import { toast } from 'sonner'

interface Selection {
  id: string
  passenger_id: string
  option_id: string
  selection_type: 'group' | 'individual'
  status: 'pending' | 'held' | 'ticketed' | 'cancelled'
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

interface BookingQueueProps {
  selections: Selection[]
  totalCount: number
}

/**
 * Gets the urgency level and remaining time for a selection's hold
 * 
 * @param holds - Array of holds for the selection
 * @returns Object with urgency level and time remaining
 */
function getHoldUrgency(holds: Selection['holds']) {
  if (!holds || holds.length === 0) {
    return { urgency: 'none', remaining: null, expired: false }
  }

  const latestHold = holds[0] // Assuming sorted by latest
  const expiresAt = parseISO(latestHold.expires_at)
  const now = new Date()
  const expired = isAfter(now, expiresAt)

  if (expired) {
    return { urgency: 'expired', remaining: null, expired: true }
  }

  const remaining = formatDistanceToNow(expiresAt, { addSuffix: true })
  const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

  let urgency: 'low' | 'medium' | 'high' = 'low'
  if (hoursRemaining <= 2) urgency = 'high'
  else if (hoursRemaining <= 6) urgency = 'medium'

  return { urgency, remaining, expired }
}

/**
 * Groups selections by tour and leg for organized display
 * 
 * @param selections - Array of selections to group
 * @returns Grouped selections by tour then by leg
 */
function groupSelectionsByTourAndLeg(selections: Selection[]) {
  const grouped = selections.reduce((acc, selection) => {
    const tourKey = `${selection.leg.project.artist.name} - ${selection.leg.project.name}`
    const legKey = `${selection.leg.origin} → ${selection.leg.destination}`
    
    if (!acc[tourKey]) acc[tourKey] = {}
    if (!acc[tourKey][legKey]) acc[tourKey][legKey] = []
    
    acc[tourKey][legKey].push(selection)
    return acc
  }, {} as Record<string, Record<string, Selection[]>>)

  return grouped
}

/**
 * Booking queue component for processing client flight selections
 * 
 * @description Main interface for employees to process client selections,
 * manage holds, create tickets, and handle document uploads. Includes
 * filtering, sorting, and urgency-based prioritization.
 * 
 * @param selections - Array of client selections to process
 * @param totalCount - Total number of selections in queue
 */
export function BookingQueue({ selections, totalCount }: BookingQueueProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all')
  const [selectedSelection, setSelectedSelection] = useState<Selection | null>(null)
  const [pnrCode, setPnrCode] = useState('')
  const [isPending, startTransition] = useTransition()

  // Filter and sort selections
  const filteredSelections = useMemo(() => {
    let filtered = selections.filter(selection => {
      const matchesSearch = 
        selection.passenger.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        selection.leg.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        selection.leg.project.artist.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || selection.status === statusFilter
      
      const { urgency } = getHoldUrgency(selection.holds)
      const matchesUrgency = urgencyFilter === 'all' || urgency === urgencyFilter

      return matchesSearch && matchesStatus && matchesUrgency
    })

    // Sort by urgency (expired first, then by time remaining)
    filtered.sort((a, b) => {
      const urgencyA = getHoldUrgency(a.holds)
      const urgencyB = getHoldUrgency(b.holds)
      
      if (urgencyA.expired && !urgencyB.expired) return -1
      if (!urgencyA.expired && urgencyB.expired) return 1
      
      const urgencyOrder = { high: 3, medium: 2, low: 1, none: 0, expired: 4 }
      return urgencyOrder[urgencyB.urgency] - urgencyOrder[urgencyA.urgency]
    })

    return filtered
  }, [selections, searchTerm, statusFilter, urgencyFilter])

  const groupedSelections = groupSelectionsByTourAndLeg(filteredSelections)

  // Action handlers
  const handleMarkHeld = async (selectionId: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('selection_id', selectionId)
      
      const result = await markHeld(formData)
      
      if (result.success) {
        toast.success('Selection marked as held')
        // Force page refresh to update data
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to mark selection as held')
      }
    })
  }

  const handleMarkTicketed = async (selectionId: string, pnrCode: string) => {
    if (!pnrCode.trim()) {
      toast.error('PNR code is required')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('selection_id', selectionId)
      formData.append('pnr_code', pnrCode.trim())
      
      const result = await markTicketed(formData)
      
      if (result.success) {
        toast.success(`Selection ticketed with PNR: ${result.data.pnr_code}`)
        setPnrCode('')
        // Force page refresh to update data
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to mark selection as ticketed')
      }
    })
  }

  const handleRevert = async (selectionId: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('selection_id', selectionId)
      
      const result = await revertToClientChoice(formData)
      
      if (result.success) {
        toast.success('Selection reverted to pending')
        // Force page refresh to update data
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to revert selection')
      }
    })
  }

  const getStatusBadge = (status: Selection['status']) => {
    const variants = {
      pending: 'secondary',
      held: 'outline',
      ticketed: 'default',
      cancelled: 'destructive'
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  const getUrgencyBadge = (urgency: string, expired: boolean) => {
    if (expired) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      )
    }

    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
      none: 'outline'
    } as const

    const labels = {
      high: 'Urgent',
      medium: 'Soon',
      low: 'OK',
      none: 'No Hold'
    }

    return (
      <Badge variant={variants[urgency as keyof typeof variants]} className="gap-1">
        <Clock className="h-3 w-3" />
        {labels[urgency as keyof typeof labels]}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Queue Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search passengers, tours, artists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="held">Held</SelectItem>
              <SelectItem value="ticketed">Ticketed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgency</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="high">High (≤2h)</SelectItem>
              <SelectItem value="medium">Medium (≤6h)</SelectItem>
              <SelectItem value="low">Low (>6h)</SelectItem>
              <SelectItem value="none">No Hold</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground flex items-center">
            {filteredSelections.length} of {totalCount} selections
          </div>
        </CardContent>
      </Card>

      {/* Queue Results */}
      <div className="space-y-6">
        {Object.entries(groupedSelections).map(([tourName, legs]) => (
          <Card key={tourName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                {tourName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(legs).map(([legName, legSelections]) => (
                <div key={legName} className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">
                    {legName} ({legSelections[0].leg.departure_date})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Option</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hold Status</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {legSelections.map((selection) => {
                        const { urgency, remaining, expired } = getHoldUrgency(selection.holds)
                        
                        return (
                          <TableRow key={selection.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{selection.passenger.full_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {selection.passenger.party_tag}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {selection.option.airline} {selection.option.flight_number}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {selection.option.route}
                                </div>
                                {selection.option.is_recommended && (
                                  <Badge variant="outline" className="text-xs mt-1">⭐ Recommended</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(selection.status)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {getUrgencyBadge(urgency, expired)}
                                {remaining && (
                                  <div className="text-xs text-muted-foreground">
                                    {remaining}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {selection.option.price_per_pax ? (
                                <span className="font-medium">
                                  ${selection.option.price_per_pax}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedSelection(selection)}
                                  >
                                    Process
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Process Selection - {selection.passenger.full_name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-3 gap-6 p-4">
                                    {/* Selection Details */}
                                    <div className="space-y-4">
                                      <h3 className="font-semibold">Selection Details</h3>
                                      <div className="space-y-2 text-sm">
                                        <div><strong>Flight:</strong> {selection.option.airline} {selection.option.flight_number}</div>
                                        <div><strong>Route:</strong> {selection.option.route}</div>
                                        <div><strong>Date:</strong> {selection.option.departure_date}</div>
                                        <div><strong>Price:</strong> ${selection.option.price_per_pax || 'TBD'}</div>
                                        <div><strong>Type:</strong> {selection.selection_type}</div>
                                      </div>
                                      {remaining && (
                                        <div className="p-3 bg-muted rounded-lg">
                                          <div className="text-sm">
                                            <strong>Hold expires:</strong> {remaining}
                                          </div>
                                        </div>
                                      )}
                                      {expired && (
                                        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
                                          <div className="text-sm">
                                            <strong>Hold expired:</strong> Price/seat not guaranteed
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* PNR Section */}
                                    <div className="space-y-4">
                                      <h3 className="font-semibold">PNR Management</h3>
                                      {selection.pnr ? (
                                        <div className="p-3 bg-muted rounded-lg">
                                          <div className="text-sm">
                                            <strong>PNR Code:</strong> {selection.pnr.code}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">
                                            Enter PNR code when ticketing
                                          </p>
                                          <Input
                                            placeholder="PNR code (e.g. ABC123)"
                                            value={pnrCode}
                                            onChange={(e) => setPnrCode(e.target.value.toUpperCase())}
                                            className="font-mono text-sm"
                                            maxLength={10}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Documents Section */}
                                    <div className="space-y-4">
                                      <h3 className="font-semibold">Documents</h3>
                                      <DocumentUpload
                                        passengerId={selection.passenger_id}
                                        projectId={selection.leg.project.id}
                                        onUploadComplete={() => {
                                          toast.success('Documents uploaded successfully')
                                          // Optionally refresh or update UI
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex justify-between items-center pt-4 border-t">
                                    <div className="flex space-x-2">
                                      {selection.status !== 'pending' && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleRevert(selection.id)}
                                          disabled={isPending}
                                        >
                                          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                          Revert to Pending
                                        </Button>
                                      )}
                                    </div>
                                    <div className="flex space-x-2">
                                      {selection.status === 'pending' && (
                                        <Button 
                                          variant="outline"
                                          onClick={() => handleMarkHeld(selection.id)}
                                          disabled={isPending}
                                        >
                                          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                          Mark Held
                                        </Button>
                                      )}
                                      {['pending', 'held'].includes(selection.status) && (
                                        <Button 
                                          onClick={() => handleMarkTicketed(selection.id, pnrCode)}
                                          disabled={isPending || (!selection.pnr && !pnrCode.trim())}
                                        >
                                          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                          Mark Ticketed
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSelections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No selections found</h3>
            <p className="text-muted-foreground text-center">
              No client selections match your current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
