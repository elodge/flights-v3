/**
 * @fileoverview Manual entry panel for compact leg management
 * 
 * @description Collapsible form for manually entering flight options that produces
 * the same data shape as Navitas parser output. Provides fallback when Navitas
 * parsing is not available or fails.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions
 * @database Creates options via server actions
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Trash2, AlertCircle, Plane } from 'lucide-react'
import { NavitasOption, NavitasSegment } from '@/lib/navitas'
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow'
import { createOptionsForPassengers } from '@/lib/actions/compact-leg-actions'
import { toast } from 'sonner'

interface ManualEntryPanelProps {
  selectedPassengers: string[]
  legId: string
  onSuccess: () => void
}

interface ManualSegment {
  airline: string
  flightNumber: string
  dateRaw: string
  origin: string
  destination: string
  depTimeRaw: string
  arrTimeRaw: string
  dayOffset: number
}

interface ManualOption {
  passenger?: string
  totalFare?: number
  currency?: string
  reference?: string
  segments: ManualSegment[]
}

/**
 * Manual entry panel component
 * 
 * @description Provides form fields for manually entering flight options that
 * produce the same data shape as Navitas parser output. Handles multiple segments
 * per option and creates options for selected passengers.
 * 
 * @param selectedPassengers - Array of passenger IDs to attach options to
 * @param legId - Leg UUID for option creation
 * @param onSuccess - Callback when options are successfully created
 * @returns JSX.Element - Manual entry form with preview
 * 
 * @security Uses existing RLS/RBAC through server actions
 * @database Creates options via server actions
 * @business_rule Maintains one-passenger-per-PNR selection model
 * 
 * @example
 * ```tsx
 * <ManualEntryPanel
 *   selectedPassengers={['passenger-1', 'passenger-2']}
 *   legId="leg-uuid"
 *   onSuccess={() => setShowPanel(false)}
 * />
 * ```
 */
export function ManualEntryPanel({ selectedPassengers, legId, onSuccess }: ManualEntryPanelProps) {
  const [option, setOption] = useState<ManualOption>({
    passenger: '',
    totalFare: undefined,
    currency: 'USD',
    reference: '',
    segments: [{
      airline: '',
      flightNumber: '',
      dateRaw: '',
      origin: '',
      destination: '',
      depTimeRaw: '',
      arrTimeRaw: '',
      dayOffset: 0
    }]
  })
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // CONTEXT: Add new segment to the option
  const addSegment = () => {
    setOption(prev => ({
      ...prev,
      segments: [...prev.segments, {
        airline: '',
        flightNumber: '',
        dateRaw: '',
        origin: '',
        destination: '',
        depTimeRaw: '',
        arrTimeRaw: '',
        dayOffset: 0
      }]
    }))
  }

  // CONTEXT: Remove segment from the option
  const removeSegment = (index: number) => {
    if (option.segments.length > 1) {
      setOption(prev => ({
        ...prev,
        segments: prev.segments.filter((_, i) => i !== index)
      }))
    }
  }

  // CONTEXT: Update segment data
  const updateSegment = (index: number, field: keyof ManualSegment, value: string | number) => {
    setOption(prev => ({
      ...prev,
      segments: prev.segments.map((seg, i) => 
        i === index ? { ...seg, [field]: value } : seg
      )
    }))
  }

  // CONTEXT: Validate the manual option
  const validateOption = (): string[] => {
    const errors: string[] = []
    
    if (option.segments.length === 0) {
      errors.push('At least one flight segment is required')
    }
    
    option.segments.forEach((segment, index) => {
      if (!segment.airline) errors.push(`Segment ${index + 1}: Airline is required`)
      if (!segment.flightNumber) errors.push(`Segment ${index + 1}: Flight number is required`)
      if (!segment.origin) errors.push(`Segment ${index + 1}: Origin airport is required`)
      if (!segment.destination) errors.push(`Segment ${index + 1}: Destination airport is required`)
      if (!segment.depTimeRaw) errors.push(`Segment ${index + 1}: Departure time is required`)
      if (!segment.arrTimeRaw) errors.push(`Segment ${index + 1}: Arrival time is required`)
    })
    
    return errors
  }

  // CONTEXT: Convert manual option to NavitasOption format
  const convertToNavitasOption = (): NavitasOption => {
    const navitasSegments: NavitasSegment[] = option.segments.map(seg => ({
      airline: seg.airline,
      flightNumber: seg.flightNumber,
      dateRaw: seg.dateRaw,
      origin: seg.origin,
      destination: seg.destination,
      depTimeRaw: seg.depTimeRaw,
      arrTimeRaw: seg.arrTimeRaw,
      dayOffset: seg.dayOffset
    }))

    return {
      passenger: option.passenger || null,
      totalFare: option.totalFare || null,
      currency: option.currency || null,
      reference: option.reference || null,
      segments: navitasSegments,
      source: "manual",
      raw: "Manual entry",
      errors: []
    }
  }

  // CONTEXT: Create options for selected passengers
  const handleCreateOptions = async () => {
    const validationErrors = validateOption()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    if (selectedPassengers.length === 0) {
      toast.error('No passengers selected')
      return
    }

    setIsCreating(true)
    setErrors([])
    
    try {
      const navitasOption = convertToNavitasOption()
      
      const result = await createOptionsForPassengers({
        legId,
        passengerIds: selectedPassengers,
        options: [navitasOption]
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Created option for ${selectedPassengers.length} passenger(s)`)
        setOption({
          passenger: '',
          totalFare: undefined,
          currency: 'USD',
          reference: '',
          segments: [{
            airline: '',
            flightNumber: '',
            dateRaw: '',
            origin: '',
            destination: '',
            depTimeRaw: '',
            arrTimeRaw: '',
            dayOffset: 0
          }]
        })
        onSuccess()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create option'
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Plane className="h-5 w-5" />
          <span>Manual Entry</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Option Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passenger">Passenger Name (Optional)</Label>
            <Input
              id="passenger"
              value={option.passenger || ''}
              onChange={(e) => setOption(prev => ({ ...prev, passenger: e.target.value }))}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              value={option.reference || ''}
              onChange={(e) => setOption(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="ABC123"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalFare">Total Fare (Optional)</Label>
            <Input
              id="totalFare"
              type="number"
              step="0.01"
              value={option.totalFare || ''}
              onChange={(e) => setOption(prev => ({ 
                ...prev, 
                totalFare: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              placeholder="450.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={option.currency || 'USD'}
              onChange={(e) => setOption(prev => ({ ...prev, currency: e.target.value }))}
              placeholder="USD"
            />
          </div>
        </div>

        {/* Flight Segments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Flight Segments</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSegment}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Segment
            </Button>
          </div>
          
          {option.segments.map((segment, index) => (
            <Card key={index} className="border-dashed">
              <CardContent className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Segment {index + 1}</Badge>
                    {option.segments.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSegment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`airline-${index}`}>Airline</Label>
                      <Input
                        id={`airline-${index}`}
                        value={segment.airline}
                        onChange={(e) => updateSegment(index, 'airline', e.target.value)}
                        placeholder="AA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`flightNumber-${index}`}>Flight Number</Label>
                      <Input
                        id={`flightNumber-${index}`}
                        value={segment.flightNumber}
                        onChange={(e) => updateSegment(index, 'flightNumber', e.target.value)}
                        placeholder="1234"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`origin-${index}`}>Origin</Label>
                      <Input
                        id={`origin-${index}`}
                        value={segment.origin}
                        onChange={(e) => updateSegment(index, 'origin', e.target.value)}
                        placeholder="LAX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`destination-${index}`}>Destination</Label>
                      <Input
                        id={`destination-${index}`}
                        value={segment.destination}
                        onChange={(e) => updateSegment(index, 'destination', e.target.value)}
                        placeholder="JFK"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`dayOffset-${index}`}>Day Offset</Label>
                      <Input
                        id={`dayOffset-${index}`}
                        type="number"
                        min="0"
                        value={segment.dayOffset}
                        onChange={(e) => updateSegment(index, 'dayOffset', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`depTime-${index}`}>Departure Time</Label>
                      <Input
                        id={`depTime-${index}`}
                        value={segment.depTimeRaw}
                        onChange={(e) => updateSegment(index, 'depTimeRaw', e.target.value)}
                        placeholder="10:15A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`arrTime-${index}`}>Arrival Time</Label>
                      <Input
                        id={`arrTime-${index}`}
                        value={segment.arrTimeRaw}
                        onChange={(e) => updateSegment(index, 'arrTimeRaw', e.target.value)}
                        placeholder="6:30P"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {option.segments.some(seg => seg.airline && seg.flightNumber && seg.origin && seg.destination) && (
          <div className="space-y-3">
            <h4 className="font-medium">Preview</h4>
            <div className="space-y-2">
              {option.segments
                .filter(seg => seg.airline && seg.flightNumber && seg.origin && seg.destination)
                .map((segment, index) => (
                  <FlightSegmentRow
                    key={index}
                    segment={{
                      airline: segment.airline,
                      flightNumber: segment.flightNumber,
                      origin: segment.origin,
                      destination: segment.destination,
                      depTimeRaw: segment.depTimeRaw,
                      arrTimeRaw: segment.arrTimeRaw,
                      dayOffset: segment.dayOffset
                    }}
                    className="text-sm"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Create Option Button */}
        <Button
          onClick={handleCreateOptions}
          disabled={isCreating || selectedPassengers.length === 0}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Option...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Option for {selectedPassengers.length} selected passengers
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
