/**
 * @fileoverview Navitas entry panel for compact leg management
 * 
 * @description Inline panel for pasting Navitas text, parsing flight data, and
 * previewing options before attaching to selected passengers. Reuses existing
 * Navitas parser and enrichment services.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions
 * @database Creates options via server actions
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, Plane } from 'lucide-react'
import { parseNavitasText, NavitasOption } from '@/lib/navitas'
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow'
import { createOptionsForPassengers } from '@/lib/actions/compact-leg-actions'
import { toast } from 'sonner'

interface NavitasPanelProps {
  selectedPassengers: string[]
  legId: string
  onSuccess: () => void
}

/**
 * Navitas entry panel component
 * 
 * @description Provides textarea for Navitas text input, parsing functionality,
 * and preview of flight segments before creating options for selected passengers.
 * 
 * @param selectedPassengers - Array of passenger IDs to attach options to
 * @param legId - Leg UUID for option creation
 * @param onSuccess - Callback when options are successfully created
 * @returns JSX.Element - Navitas entry panel with preview
 * 
 * @security Uses existing RLS/RBAC through server actions
 * @database Creates options via server actions
 * @business_rule Maintains one-passenger-per-PNR selection model
 * 
 * @example
 * ```tsx
 * <NavitasPanel
 *   selectedPassengers={['passenger-1', 'passenger-2']}
 *   legId="leg-uuid"
 *   onSuccess={() => setShowPanel(false)}
 * />
 * ```
 */
export function NavitasPanel({ selectedPassengers, legId, onSuccess }: NavitasPanelProps) {
  const [navitasText, setNavitasText] = useState('')
  const [parsedOptions, setParsedOptions] = useState<NavitasOption[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // CONTEXT: Parse Navitas text and preview options
  const handleParse = async () => {
    if (!navitasText.trim()) {
      toast.error('Please enter Navitas text to parse')
      return
    }

    setIsParsing(true)
    setErrors([])
    
    try {
      const result = parseNavitasText(navitasText)
      setParsedOptions(result.options)
      setErrors(result.errors)
      
      if (result.options.length === 0) {
        toast.error('No valid flight options found in the text')
      } else {
        toast.success(`Parsed ${result.options.length} flight option(s)`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse Navitas text'
      toast.error(errorMessage)
      setErrors([errorMessage])
    } finally {
      setIsParsing(false)
    }
  }

  // CONTEXT: Create options for selected passengers
  const handleCreateOptions = async () => {
    if (parsedOptions.length === 0) {
      toast.error('No parsed options to create')
      return
    }

    if (selectedPassengers.length === 0) {
      toast.error('No passengers selected')
      return
    }

    setIsCreating(true)
    
    try {
      const result = await createOptionsForPassengers({
        legId,
        passengerIds: selectedPassengers,
        options: parsedOptions
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Created ${result.count} option(s) for ${selectedPassengers.length} passenger(s)`)
        setNavitasText('')
        setParsedOptions([])
        setErrors([])
        onSuccess()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create options'
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
          <span>Navitas Entry</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Textarea */}
        <div className="space-y-2">
          <label htmlFor="navitas-text" className="text-sm font-medium">
            Paste Navitas text here:
          </label>
          <Textarea
            id="navitas-text"
            placeholder="Paste your Navitas flight booking text here..."
            value={navitasText}
            onChange={(e) => setNavitasText(e.target.value)}
            className="min-h-32 font-mono text-sm"
          />
        </div>

        {/* Parse Button */}
        <Button
          onClick={handleParse}
          disabled={!navitasText.trim() || isParsing}
          className="w-full"
        >
          {isParsing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing...
            </>
          ) : (
            'Parse & Preview'
          )}
        </Button>

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
        {parsedOptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Preview ({parsedOptions.length} options)</h4>
              <Badge variant="secondary">
                {selectedPassengers.length} passengers selected
              </Badge>
            </div>
            
            <div className="space-y-3">
              {parsedOptions.map((option, index) => (
                <Card key={index} className="border-dashed">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Option Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Option {index + 1}</Badge>
                          {option.passenger && (
                            <span className="text-sm text-muted-foreground">
                              {option.passenger}
                            </span>
                          )}
                        </div>
                        {option.totalFare && (
                          <div className="text-right">
                            <div className="font-semibold">
                              ${option.totalFare.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {option.currency || 'USD'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Flight Segments */}
                      <div className="space-y-2">
                        {option.segments.map((segment, segIndex) => (
                          <FlightSegmentRow
                            key={segIndex}
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

                      {/* Reference */}
                      {option.reference && (
                        <div className="text-xs text-muted-foreground">
                          Reference: {option.reference}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Create Options Button */}
            <Button
              onClick={handleCreateOptions}
              disabled={isCreating || selectedPassengers.length === 0}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Options...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Add {parsedOptions.length} option(s) to {selectedPassengers.length} selected passengers
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
