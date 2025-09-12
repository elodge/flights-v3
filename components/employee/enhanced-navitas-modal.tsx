/**
 * @fileoverview Enhanced Navitas Modal - Multi-option flight creation interface
 * 
 * @description Advanced modal component for creating multiple flight options simultaneously
 * with integrated passenger selection, Navitas parsing, detailed flight previews, and
 * batch creation capabilities. Replaces the simple top-of-page Navitas entry with a
 * comprehensive workflow that allows agents to parse multiple Navitas texts, preview
 * flight details, and create all options with a single action.
 * 
 * @route Used within /a/tour/[id]/leg/[legId]/manage compact leg manager
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through createOptionsForPassengers server action
 * @database Creates records in options, option_components, and option_passengers tables
 * @business_rule Supports multi-passenger assignment to multiple flight options
 * @business_rule Maintains Navitas parsing history to prevent duplicate entries
 * @business_rule Provides detailed flight segment previews using FlightSegmentRow component
 * 
 * @example
 * ```tsx
 * <EnhancedNavitasModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   allPassengers={legPassengers}
 *   legId="leg-uuid"
 * />
 * ```
 */

'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Users, Star, Plane, RotateCcw, Zap, CheckCircle, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { parseNavitasText } from '@/lib/navitas'
import { createOptionsForPassengers } from '@/lib/actions/compact-leg-actions'
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow'

/**
 * Passenger data structure for modal selection
 */
interface ModalPassenger {
  id: string
  full_name: string
  role_title: string | null
  is_vip: boolean
  party: string | null
}

/**
 * Parsed flight option with selection state
 */
interface SelectableFlightOption {
  option: any // NavitasOption
  selected: boolean
}

interface EnhancedNavitasModalProps {
  isOpen: boolean
  onClose: () => void
  allPassengers: ModalPassenger[]
  legId: string
}

/**
 * Enhanced Navitas Modal Component
 * 
 * @description Comprehensive modal interface for creating multiple flight options simultaneously
 * with integrated passenger selection, Navitas parsing, detailed flight previews, and batch
 * creation capabilities. Provides a streamlined workflow for agents to parse multiple Navitas
 * texts, preview flight details using FlightSegmentRow components, and create all options
 * with a single action. Supports both "Create & Close" and "Create & Continue" workflows.
 * 
 * @param isOpen - Whether the modal is currently visible
 * @param onClose - Callback function called when modal is closed
 * @param allPassengers - Array of passengers available for assignment to flight options
 * @param legId - UUID of the leg for which options are being created
 * @returns JSX.Element - Modal dialog with passenger selection, Navitas parsing, and flight preview
 * @access Employee only (agent, admin roles)
 * @security Uses createOptionsForPassengers server action with existing RLS/RBAC
 * @database Creates records in options, option_components, and option_passengers tables
 * @business_rule Maintains parsing history to prevent duplicate Navitas text entries
 * @business_rule Supports multi-passenger assignment to multiple flight options
 * @business_rule Provides detailed flight segment previews with airline logos and timing
 * @throws Displays toast notifications for parsing errors and creation failures
 * 
 * @example
 * ```tsx
 * const [showModal, setShowModal] = useState(false)
 * 
 * <EnhancedNavitasModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   allPassengers={legPassengers}
 *   legId={legId}
 * />
 * ```
 */
export function EnhancedNavitasModal({
  isOpen,
  onClose,
  allPassengers,
  legId
}: EnhancedNavitasModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedPassengers, setSelectedPassengers] = useState<Set<string>>(new Set())
  const [navitasText, setNavitasText] = useState('')
  const [parsedFlights, setParsedFlights] = useState<SelectableFlightOption[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [navitasHistory, setNavitasHistory] = useState<string[]>([])

  // CONTEXT: Apply search and role filtering to passengers
  const filteredPassengers = useMemo(() => {
    // DEBUG: Log all available passengers
    console.log('DEBUG Modal - All passengers:', allPassengers.map(p => ({ id: p.id, name: p.full_name })))
    
    // DEBUG: Specifically log Tree Paine's details
    const treePaine = allPassengers.find(p => p.full_name.toLowerCase().includes('tree'))
    if (treePaine) {
      console.log('DEBUG Modal - Tree Paine details:', treePaine)
    }
    
    let filtered = allPassengers

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(passenger =>
        passenger.full_name.toLowerCase().includes(term) ||
        (passenger.role_title?.toLowerCase() || '').includes(term) ||
        (passenger.party?.toLowerCase() || '').includes(term)
      )
    }

    // Role filter
    if (selectedFilter !== 'all') {
      switch (selectedFilter) {
        case 'artists':
          filtered = filtered.filter(p => {
            const role = p.role_title?.toLowerCase() || ''
            return role.includes('artist') || role.includes('performer')
          })
          break
        case 'band':
          filtered = filtered.filter(p => {
            const role = p.role_title?.toLowerCase() || ''
            return role.includes('band') || role.includes('musician')
          })
          break
        case 'crew':
          filtered = filtered.filter(p => {
            const role = p.role_title?.toLowerCase() || ''
            return !role.includes('artist') && !role.includes('performer') && !role.includes('band') && !role.includes('musician')
          })
          break
      }
    }

    return filtered
  }, [allPassengers, searchTerm, selectedFilter])

  // CONTEXT: Handle passenger selection toggle
  const handlePassengerToggle = (passengerId: string, checked: boolean) => {
    const newSelected = new Set(selectedPassengers)
    
    if (checked) {
      newSelected.add(passengerId)
    } else {
      newSelected.delete(passengerId)
    }
    
    setSelectedPassengers(newSelected)
  }

  // CONTEXT: Reset passenger selection
  const handleResetPassengers = () => {
    setSelectedPassengers(new Set())
  }

  // CONTEXT: Parse Navitas text and add to accumulated flight options
  // BUSINESS_RULE: Prevent duplicate parsing of same Navitas text
  // ALGORITHM: Parse text, validate, add to preview, clear input, update history
  const handleParseNavitas = async () => {
    if (!navitasText.trim()) {
      toast.error('Please enter Navitas text to parse')
      return
    }

    // BUSINESS_RULE: Check if this exact text has already been parsed
    if (navitasHistory.includes(navitasText.trim())) {
      toast.error('This Navitas text has already been parsed')
      return
    }

    setIsParsing(true)
    try {
      const result = parseNavitasText(navitasText)
      
      if (result.errors.length > 0) {
        toast.error(`Parsing errors: ${result.errors.join(', ')}`)
      }

      if (result.options.length === 0) {
        toast.error('No valid flight options found in the text')
      } else {
        // Add new flights to existing ones (all start as selected)
        const newSelectableFlights = result.options.map((option, index) => ({
          option: {
            ...option,
            // Add unique identifier to distinguish multiple entries
            entryId: `${Date.now()}-${index}`,
            sourceText: navitasText.trim()
          },
          selected: true
        }))
        
        setParsedFlights(prev => [...prev, ...newSelectableFlights])
        setNavitasHistory(prev => [...prev, navitasText.trim()])
        setNavitasText('') // Clear the input for next entry
        toast.success(`Added ${result.options.length} flight option(s). Total: ${parsedFlights.length + result.options.length}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse Navitas text'
      toast.error(errorMessage)
    } finally {
      setIsParsing(false)
    }
  }

  // CONTEXT: Toggle flight selection
  const handleFlightToggle = (index: number, checked: boolean) => {
    const newFlights = [...parsedFlights]
    newFlights[index] = { ...newFlights[index], selected: checked }
    setParsedFlights(newFlights)
  }

  // CONTEXT: Remove a specific flight from the list
  const handleRemoveFlight = (index: number) => {
    const newFlights = [...parsedFlights]
    newFlights.splice(index, 1)
    setParsedFlights(newFlights)
    toast.success('Flight option removed')
  }

  // CONTEXT: Clear all parsed flights
  const handleClearAllFlights = () => {
    setParsedFlights([])
    setNavitasHistory([])
    toast.success('All flight options cleared')
  }

  // CONTEXT: Create flight options for selected passengers and flights
  // SECURITY: Uses createOptionsForPassengers server action with existing RLS/RBAC
  // DATABASE: Creates records in options, option_components, and option_passengers tables
  // BUSINESS_RULE: Validates passenger and flight selection before creation
  // ALGORITHM: Clean data, call server action, handle success/error, optionally continue
  const handleCreateOptions = async (continueAfter: boolean = false) => {
    if (selectedPassengers.size === 0) {
      toast.error('Please select at least one passenger')
      return
    }

    const selectedFlights = parsedFlights.filter(f => f.selected)
    if (selectedFlights.length === 0) {
      toast.error('Please select at least one flight')
      return
    }

    // DEBUG: Log what we're about to create
    const selectedPassengerNames = allPassengers
      .filter(p => selectedPassengers.has(p.id))
      .map(p => p.full_name)
    console.log('DEBUG Modal - Creating options for passengers:', selectedPassengerNames)
    console.log('DEBUG Modal - Selected passenger IDs:', Array.from(selectedPassengers))
    console.log('DEBUG Modal - Selected flights:', selectedFlights.length)

    setIsCreating(true)
    try {
      console.log('DEBUG Modal - About to call createOptionsForPassengers...')
      
      const requestData = {
        legId,
        passengerIds: Array.from(selectedPassengers),
        options: selectedFlights.map(f => {
          // Remove our internal tracking fields before sending to server
          // Create a clean copy to avoid reference issues with destructuring
          const cleanOption = {
            passenger: f.option.passenger,
            totalFare: f.option.totalFare,
            currency: f.option.currency,
            reference: f.option.reference,
            segments: [...f.option.segments], // Ensure we copy the array properly
            source: f.option.source,
            raw: f.option.raw,
            errors: f.option.errors || []
          }
          console.log('DEBUG Modal - Original option:', f.option)
          console.log('DEBUG Modal - Original segments:', f.option.segments)
          console.log('DEBUG Modal - Clean option:', cleanOption)
          console.log('DEBUG Modal - Clean segments:', cleanOption.segments)
          return cleanOption
        })
      }
      
      console.log('DEBUG Modal - Request data:', requestData)
      console.log('DEBUG Modal - Request options detail:', requestData.options.map(opt => ({
        passenger: opt.passenger,
        source: opt.source,
        segments: opt.segments?.length || 0,
        totalFare: opt.totalFare,
        currency: opt.currency
      })))
      
      const result = await createOptionsForPassengers(requestData)

      console.log('DEBUG Modal - Server action result:', result)

      if (result.error) {
        console.error('DEBUG Modal - Server action returned error:', result.error)
        toast.error(result.error)
      } else {
        const passengerCount = selectedPassengers.size
        const flightCount = selectedFlights.length
        const totalOptions = passengerCount * flightCount
        
        console.log('DEBUG Modal - Success! Created options:', result.count)
        toast.success(`Created ${totalOptions} option(s) for ${passengerCount} passenger(s) across ${flightCount} flight(s)`)
        
        if (continueAfter) {
          // Clear parsed flights and history, keep passengers selected
          setParsedFlights([])
          setNavitasHistory([])
          setNavitasText('')
        } else {
          // Close modal and reset everything
          handleClose()
        }
      }
    } catch (error) {
      console.error('DEBUG Modal - Exception during creation:', error)
      toast.error('Failed to create options. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  // CONTEXT: Reset modal state and close
  const handleClose = () => {
    setSelectedPassengers(new Set())
    setNavitasText('')
    setParsedFlights([])
    setNavitasHistory([])
    setSearchTerm('')
    setSelectedFilter('all')
    onClose()
  }

  const selectedPassengerCount = selectedPassengers.size
  const selectedFlightCount = parsedFlights.filter(f => f.selected).length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none !w-[95vw] max-h-[95vh] min-h-[85vh] flex flex-col p-8" style={{ width: '95vw', maxWidth: 'none' }}>
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Plane className="h-6 w-6" />
            Create Flight Options
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Select passengers and enter Navitas text to create flight options. You can preview and adjust selections before creating.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-16 px-4">
          {/* Left Panel - Passenger Selection */}
          <div className="flex flex-col space-y-6 pr-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Select Passengers</h3>
              <Button
                variant="outline"
                size="default"
                onClick={handleResetPassengers}
                disabled={selectedPassengers.size === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Selection
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search passengers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>

            {/* Role Filter Tabs */}
            <Tabs value={selectedFilter} onValueChange={setSelectedFilter}>
              <TabsList className="grid w-full grid-cols-4 h-12">
                <TabsTrigger value="all" className="text-base">All ({allPassengers.length})</TabsTrigger>
                <TabsTrigger value="artists" className="text-base">Artists</TabsTrigger>
                <TabsTrigger value="band" className="text-base">Band</TabsTrigger>
                <TabsTrigger value="crew" className="text-base">Crew</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Passenger List */}
            <div className="flex-1 overflow-y-auto border rounded-lg min-h-[400px]">
              <div className="p-4 space-y-3">
                {filteredPassengers.map((passenger) => {
                  const isSelected = selectedPassengers.has(passenger.id)
                  
                  return (
                    <div
                      key={passenger.id}
                      className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handlePassengerToggle(passenger.id, checked as boolean)}
                        className="h-5 w-5"
                      />
                      
                      <Avatar className="h-12 w-12">
                        <div className="h-full w-full bg-muted flex items-center justify-center text-sm font-medium">
                          {passenger.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-base truncate">{passenger.full_name}</p>
                          {passenger.is_vip && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4" />
                              VIP
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {passenger.role_title || 'No role'} • Party: {passenger.party || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  )
                })}
                
                {filteredPassengers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No passengers found</p>
                    {searchTerm && <p className="text-base mt-2">Try adjusting your search or filter</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Selection Summary */}
            {selectedPassengerCount > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-base font-semibold text-blue-900">
                  {selectedPassengerCount} passenger{selectedPassengerCount !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - Navitas & Preview */}
          <div className="flex flex-col space-y-6 pl-8">
            <h3 className="text-xl font-semibold">Navitas Text & Flight Preview</h3>

            {/* Navitas Input */}
            <div className="space-y-4">
              <label className="text-base font-medium">Navitas Text</label>
              <Textarea
                placeholder="Paste Navitas flight booking text here..."
                value={navitasText}
                onChange={(e) => setNavitasText(e.target.value)}
                className="min-h-48 font-mono text-base p-4"
              />
              <Button
                onClick={handleParseNavitas}
                disabled={!navitasText.trim() || isParsing}
                className="w-full h-12 text-base"
                size="lg"
              >
                {isParsing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-3" />
                    {parsedFlights.length > 0 ? 'Add Another Flight Option' : 'Parse Navitas Text'}
                  </>
                )}
              </Button>
            </div>

            {/* Flight Preview */}
            {parsedFlights.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-4 min-h-[400px]">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium">Parsed Flights ({parsedFlights.length})</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllFlights}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
                <div className="space-y-4">
                  {parsedFlights.map((flight, index) => (
                    <div key={index} className="space-y-2">
                      {/* Compact header with checkbox and remove button */}
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={flight.selected}
                            onCheckedChange={(checked) => handleFlightToggle(index, checked as boolean)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm font-medium">
                            Option {index + 1}
                          </span>
                          {flight.option.totalFare && (
                            <span className="text-sm font-semibold text-green-700">
                              ${flight.option.totalFare.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFlight(index)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Just the flight segment rows - no extra wrapper */}
                      <div className="space-y-1">
                        {flight.option.segments.map((segment: any, segIndex: number) => {
                          const segmentData = {
                            // Map Navitas fields to database field names that FlightSegmentRow expects
                            airline_iata: segment.airline,
                            flight_number: `${segment.airline}${segment.flightNumber}`,
                            dep_iata: segment.origin,
                            arr_iata: segment.destination,
                            navitas_text: `${segment.airline} ${segment.flightNumber} ${segment.origin}-${segment.destination} ${segment.dateRaw} ${segment.depTimeRaw}-${segment.arrTimeRaw}`,
                            departure_time: segment.depTimeRaw,
                            arrival_time: segment.arrTimeRaw,
                            dep_time_local: segment.depTimeRaw,
                            arr_time_local: segment.arrTimeRaw,
                            day_offset: segment.dayOffset || 0,
                            // Legacy field names for backward compatibility
                            airline: segment.airline,
                            flightNumber: segment.flightNumber,
                            origin: segment.origin,
                            destination: segment.destination,
                            depTimeRaw: segment.depTimeRaw,
                            arrTimeRaw: segment.arrTimeRaw,
                            dayOffset: segment.dayOffset
                          }
                          console.log('DEBUG Modal - Segment data for FlightSegmentRow:', segmentData)
                          return (
                            <FlightSegmentRow
                              key={segIndex}
                              segment={segmentData}
                              selected={flight.selected}
                              className={flight.selected ? 'border-green-400 bg-green-50' : ''}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between pt-8 mt-8 border-t px-4">
          <div className="text-base text-muted-foreground">
            {selectedPassengerCount > 0 && selectedFlightCount > 0 && (
              <span className="font-medium">
                Will create {selectedPassengerCount * selectedFlightCount} option{selectedPassengerCount * selectedFlightCount !== 1 ? 's' : ''} 
                ({selectedPassengerCount} passenger{selectedPassengerCount !== 1 ? 's' : ''} &times; {selectedFlightCount} flight{selectedFlightCount !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={handleClose} disabled={isCreating} className="px-6">
              Cancel
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => handleCreateOptions(true)}
              disabled={selectedPassengerCount === 0 || selectedFlightCount === 0 || isCreating}
              className="px-6"
            >
              {isCreating ? 'Creating...' : 'Create & Continue'}
            </Button>
            <Button 
              size="lg"
              onClick={() => handleCreateOptions(false)}
              disabled={selectedPassengerCount === 0 || selectedFlightCount === 0 || isCreating}
              className="px-6"
            >
              {isCreating ? 'Creating...' : 'Create & Close'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
