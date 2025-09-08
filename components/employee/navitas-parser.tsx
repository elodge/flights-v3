/**
 * @fileoverview Navitas flight text parser component for employee portal
 * 
 * @description Allows agents to paste Navitas flight information and convert
 * it into structured flight options with preview and save functionality.
 * Handles both single and multi-segment flights.
 * 
 * @access Employee only (agent, admin roles)
 * @database Creates records in options and option_components tables
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Star, Plane } from 'lucide-react'
import { parseNavitasText, type NavitasOption } from '@/lib/navitas'
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow'
import { createFlightOption } from '@/lib/actions/employee-actions'
import { toast } from 'sonner'

/**
 * Props for the Navitas parser component
 * 
 * @description Configuration for flight option creation from Navitas text
 */
interface NavitasParserProps {
  /** UUID of the leg to create options for */
  legId: string
  /** Callback fired when a new option is successfully created */
  onOptionCreated?: () => void
}


/**
 * Flight option creation component using Navitas text parsing
 * 
 * @description Provides a workflow for agents to create flight options by:
 * 1. Pasting Navitas flight text
 * 2. Previewing parsed flight information
 * 3. Setting recommendation status
 * 4. Saving as a new flight option
 * 
 * @param props - Component properties
 * @param props.legId - UUID of the flight leg to create options for
 * @param props.onOptionCreated - Callback when option is successfully created
 * 
 * @access Employee only (used in leg management page)
 * 
 * @example
 * ```tsx
 * <NavitasParser 
 *   legId="leg-uuid-here"
 *   onOptionCreated={() => {
 *     console.log('New option created!')
 *     // Refresh options list
 *   }}
 * />
 * ```
 */
export function NavitasParser({ legId, onOptionCreated }: NavitasParserProps) {
  const [navitasText, setNavitasText] = useState('')
  const [isRecommended, setIsRecommended] = useState(false)
  const [parsedOptions, setParsedOptions] = useState<NavitasOption[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const handlePreview = async () => {
    const result = parseNavitasText(navitasText)
    setParsedOptions(result.options)
    setParseErrors(result.errors)
    
    if (result.options.length > 0) {
      toast.success(`Parsed ${result.options.length} flight option${result.options.length > 1 ? 's' : ''} successfully`)
    } else {
      toast.error('No valid flight options found. Please check the format.')
    }
    
    if (result.errors.length > 0) {
      toast.warning(`${result.errors.length} parsing warning${result.errors.length > 1 ? 's' : ''} found`)
    }
  }

  const handleSave = async () => {
    if (parsedOptions.length === 0) {
      toast.error('Please preview the options first')
      return
    }

    setIsCreating(true)
    try {
      // CONTEXT: Save each parsed option as a separate flight option
      // BUSINESS_RULE: Each Navitas block becomes one flight option
      for (const option of parsedOptions) {
        const formData = new FormData()
        formData.append('leg_id', legId)
        
        // Generate name from first segment or passenger name
        const name = option.passenger || 
          (option.segments.length > 0 ? 
            `${option.segments[0].airline} ${option.segments[0].flightNumber}` : 
            'Navitas Option')
        formData.append('name', name)
        
        // Add description with segment details
        const description = option.segments.map(seg => 
          `${seg.airline} ${seg.flightNumber} ${seg.origin}-${seg.destination}`
        ).join(', ')
        formData.append('description', description)
        
        // Add fare information
        if (option.totalFare) {
          formData.append('total_cost', (option.totalFare * 100).toString()) // Convert to cents
        }
        formData.append('currency', option.currency || 'USD')
        formData.append('is_recommended', isRecommended.toString())
        
        // Add segments as components
        const components = option.segments.map((seg, index) => ({
          description: `${seg.airline} ${seg.flightNumber} ${seg.origin}-${seg.destination} ${seg.dateRaw} ${seg.depTimeRaw}-${seg.arrTimeRaw}${seg.dayOffset ? ` +${seg.dayOffset}` : ''}`,
          component_order: index + 1
        }))
        formData.append('components', JSON.stringify(components))

        const result = await createFlightOption(formData)
        
        if (result.error) {
          toast.error(`Failed to create option: ${result.error}`)
          return
        }
      }
      
      toast.success(`Created ${parsedOptions.length} flight option${parsedOptions.length > 1 ? 's' : ''} successfully`)
      setNavitasText('')
      setParsedOptions([])
      setParseErrors([])
      setIsRecommended(false)
      onOptionCreated?.()
    } catch (error) {
      console.error('Error creating flight options:', error)
      toast.error('Failed to create flight options')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClear = () => {
    setNavitasText('')
    setParsedOptions([])
    setParseErrors([])
    setIsRecommended(false)
  }

  return (
    <div className="space-y-4">
      <div className="card-muted">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-lg font-medium">Flight Option Entry</h3>
          <p className="text-sm text-muted-foreground">
            Paste Navitas text to create flight options
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Navitas Flight Details</label>
            <Textarea 
              value={navitasText}
              onChange={(e) => setNavitasText(e.target.value)}
              placeholder="Paste Navitas flight text here...

Example:
Evan Lodge
AA 2689 10Aug PHX LAX  10:15A 11:43A
AA 8453 10Aug LAX HND  2:15P 5:25P +1
AA 170  15Aug HND LAX 11:55A 6:00A
AA 1668 15Aug LAX PHX 10:00A 11:26A
TOTAL FARE INC TAX  USD5790.81
Reference: UCWYOJ"
              className="min-h-[120px] font-mono text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="recommended" 
              checked={isRecommended}
              onCheckedChange={setIsRecommended}
            />
            <label htmlFor="recommended" className="text-sm font-medium flex items-center space-x-1">
              <Star className="h-4 w-4" />
              <span>Mark as Recommended</span>
            </label>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handlePreview}
              disabled={!navitasText.trim()}
              className="flex-1"
            >
              <Plus className="mr-2 h-4 w-4" />
              Preview Option
            </Button>
            <Button 
              onClick={handleSave}
              disabled={parsedOptions.length === 0 || isCreating}
              variant="outline"
            >
              {isCreating ? 'Saving...' : `Save ${parsedOptions.length} Option${parsedOptions.length > 1 ? 's' : ''}`}
            </Button>
            <Button 
              onClick={handleClear}
              variant="ghost"
              disabled={!navitasText && parsedOptions.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {parsedOptions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Preview: {parsedOptions.length} Option{parsedOptions.length > 1 ? 's' : ''}</h3>
            {isRecommended && (
              <Badge variant="default" className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>Recommended</span>
              </Badge>
            )}
          </div>
          
          {parsedOptions.map((option, optionIndex) => (
            <Card key={optionIndex} className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{option.passenger || `${option.segments[0]?.airline} ${option.segments[0]?.flightNumber}` || 'Navitas Option'}</span>
                    </CardTitle>
                    <CardDescription>
                      {option.segments.map(seg => 
                        `${seg.airline} ${seg.flightNumber} ${seg.origin}-${seg.destination}`
                      ).join(', ')}
                    </CardDescription>
                  </div>
                  {option.totalFare && (
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${option.totalFare.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {option.currency || 'USD'}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {option.segments.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Flight Segments</h5>
                    <div className="space-y-2">
                      {option.segments.map((segment, index) => (
                        <FlightSegmentRow key={index} segment={segment} />
                      ))}
                    </div>
                  </div>
                )}
                {option.reference && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Reference: {option.reference}
                  </div>
                )}
                {option.errors.length > 0 && (
                  <div className="mt-2">
                    <h6 className="text-sm font-medium text-amber-600">Warnings:</h6>
                    <ul className="text-sm text-amber-600">
                      {option.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {parseErrors.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <CardHeader>
                <CardTitle className="text-amber-800 dark:text-amber-200">Parse Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-amber-700 dark:text-amber-300">
                  {parseErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
