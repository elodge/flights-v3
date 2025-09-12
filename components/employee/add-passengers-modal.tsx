/**
 * @fileoverview Add passengers modal for flight options
 * 
 * @description Modal component for selecting and adding multiple passengers to a specific
 * flight option. Includes search, filtering, individual pricing, and bulk option creation.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses existing RLS/RBAC through server actions
 * @database Creates individual options via createOptionsForPassengers action
 */

'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Users, Star, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { createOptionsForPassengers } from '@/lib/actions/compact-leg-actions'

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
 * Flight group data from FlightGrid
 */
interface FlightGroup {
  key: string
  flight: {
    airline: string
    flightNumber: string
    origin: string
    destination: string
    depTimeRaw: string
    arrTimeRaw: string
  }
  assignedPassengers: Array<{
    tour_personnel: {
      id: string
      full_name: string
      is_vip: boolean
      role_title: string | null
      party: string
    }
  }>
  priceRange: {
    min: number
    max: number
    currency: string
  }
}

/**
 * Selected passenger with custom pricing
 */
interface SelectedPassenger {
  passenger: ModalPassenger
  price: number
  priceString: string // Raw string for input field
}

interface AddPassengersModalProps {
  isOpen: boolean
  onClose: () => void
  flightGroup: FlightGroup
  allPassengers: ModalPassenger[]
  legId: string
  defaultPrice?: number
}

/**
 * Add passengers modal component
 * 
 * @description Allows selecting multiple passengers for a flight option with individual
 * pricing and role-based filtering. Creates separate options for each passenger.
 * 
 * @param isOpen - Whether modal is visible
 * @param onClose - Callback when modal is closed
 * @param flightGroup - Flight group data from FlightGrid
 * @param allPassengers - All tour personnel available for selection
 * @param legId - Leg UUID for option creation
 * @param defaultPrice - Default price in cents (e.g., 45000 for $450.00)
 * @returns JSX.Element - Modal for passenger selection
 * 
 * @security Uses existing server actions with proper authentication
 * @database Creates individual options for each selected passenger
 * @business_rule Maintains one-passenger-per-option model
 * 
 * @example
 * ```tsx
 * <AddPassengersModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   flightGroup={selectedFlight}
 *   allPassengers={tourPersonnel}
 *   legId="leg-uuid"
 *   defaultPrice={45000}
 * />
 * ```
 */
export function AddPassengersModal({
  isOpen,
  onClose,
  flightGroup,
  allPassengers,
  legId,
  defaultPrice = 0
}: AddPassengersModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedPassengers, setSelectedPassengers] = useState<Map<string, SelectedPassenger>>(new Map())
  const [isCreating, setIsCreating] = useState(false)

  // CONTEXT: Filter out passengers already assigned to this flight
  const availablePassengers = useMemo(() => {
    const assignedIds = new Set(flightGroup.assignedPassengers.map(p => p.tour_personnel.id))
    return allPassengers.filter(passenger => !assignedIds.has(passenger.id))
  }, [allPassengers, flightGroup.assignedPassengers])

  // CONTEXT: Apply search and role filtering
  const filteredPassengers = useMemo(() => {
    let filtered = availablePassengers

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
  }, [availablePassengers, searchTerm, selectedFilter])

  // CONTEXT: Handle passenger selection toggle
  const handlePassengerToggle = (passenger: ModalPassenger, checked: boolean) => {
    const newSelected = new Map(selectedPassengers)
    
    if (checked) {
      const defaultPriceString = (defaultPrice / 100).toFixed(2)
      newSelected.set(passenger.id, {
        passenger,
        price: defaultPrice,
        priceString: defaultPriceString
      })
    } else {
      newSelected.delete(passenger.id)
    }
    
    setSelectedPassengers(newSelected)
  }

  // CONTEXT: Handle price change for selected passenger
  const handlePriceChange = (passengerId: string, priceString: string) => {
    const selected = selectedPassengers.get(passengerId)
    if (!selected) return

    // CONTEXT: Always update the string immediately for responsive typing
    const price = parseFloat(priceString) * 100 // Convert to cents
    // CONTEXT: Allow empty string or invalid numbers for better UX while typing
    const finalPrice = isNaN(price) ? 0 : price

    const newSelected = new Map(selectedPassengers)
    newSelected.set(passengerId, { 
      ...selected, 
      price: finalPrice,
      priceString: priceString // Store raw string for input field
    })
    setSelectedPassengers(newSelected)
  }

  // CONTEXT: Create options for all selected passengers
  const handleCreateOptions = async () => {
    if (selectedPassengers.size === 0) return

    setIsCreating(true)
    try {
      // CONTEXT: Convert flight group back to NavitasOption format
      const navitasOption = {
        passenger: `${flightGroup.flight.airline} ${flightGroup.flight.flightNumber}`,
        source: 'navitas' as const,
        segments: [{
          airline: flightGroup.flight.airline,
          flightNumber: flightGroup.flight.flightNumber,
          dateRaw: '01MAR', // Default date - this should ideally come from the flight data
          origin: flightGroup.flight.origin,
          destination: flightGroup.flight.destination,
          depTimeRaw: flightGroup.flight.depTimeRaw || '',
          arrTimeRaw: flightGroup.flight.arrTimeRaw || ''
        }],
        totalFare: 0, // Will be set per passenger
        currency: flightGroup.priceRange.currency,
        reference: null,
        raw: `${flightGroup.flight.airline} ${flightGroup.flight.flightNumber} ${flightGroup.flight.origin}-${flightGroup.flight.destination}`,
        errors: []
      }

      // CONTEXT: Create options for each passenger with individual pricing
      for (const [passengerId, selected] of selectedPassengers) {
        const passengerOption = {
          ...navitasOption,
          totalFare: selected.price / 100, // Convert back to dollars
          passenger: selected.passenger.full_name
        }

        const result = await createOptionsForPassengers({
          legId,
          passengerIds: [passengerId],
          options: [passengerOption]
        })

        if (!result.success) {
          throw new Error(result.error || 'Failed to create option')
        }
      }

      toast.success(`Created options for ${selectedPassengers.size} passenger(s)`)
      
      // CONTEXT: Reset modal state and close
      setSelectedPassengers(new Map())
      setSearchTerm('')
      setSelectedFilter('all')
      onClose()
      
    } catch (error) {
      console.error('Error creating options:', error)
      toast.error('Failed to create options. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  // CONTEXT: Reset state when modal opens/closes
  const handleClose = () => {
    setSelectedPassengers(new Map())
    setSearchTerm('')
    setSelectedFilter('all')
    onClose()
  }

  const selectedCount = selectedPassengers.size
  const flightLabel = `${flightGroup.flight.airline} ${flightGroup.flight.flightNumber} (${flightGroup.flight.origin} → ${flightGroup.flight.destination})`

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Passengers to {flightLabel}
          </DialogTitle>
          <DialogDescription>
            Select passengers to create individual flight options. Each passenger will get their own option with customizable pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search passengers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Role Filter Tabs */}
          <Tabs value={selectedFilter} onValueChange={setSelectedFilter}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({availablePassengers.length})</TabsTrigger>
              <TabsTrigger value="artists">Artists</TabsTrigger>
              <TabsTrigger value="band">Band</TabsTrigger>
              <TabsTrigger value="crew">Crew</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Passenger List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <div className="p-2 space-y-2">
              {filteredPassengers.map((passenger) => {
                const isSelected = selectedPassengers.has(passenger.id)
                const selectedData = selectedPassengers.get(passenger.id)
                
                return (
                  <div
                    key={passenger.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handlePassengerToggle(passenger, checked as boolean)}
                    />
                    
                    <Avatar className="h-10 w-10">
                      <div className="h-full w-full bg-muted flex items-center justify-center text-sm font-medium">
                        {passenger.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{passenger.full_name}</p>
                        {passenger.is_vip && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            VIP
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {passenger.role_title || 'No role'} • Party: {passenger.party || 'Unknown'}
                      </p>
                    </div>
                    
                    {/* Price Input */}
                    {isSelected && (
                      <div className="flex items-center gap-2 w-32">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={selectedData?.priceString || '0.00'}
                          onChange={(e) => handlePriceChange(passenger.id, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              
              {filteredPassengers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No available passengers found</p>
                  {searchTerm && <p className="text-sm">Try adjusting your search or filter</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 && (
              <span>{selectedCount} passenger{selectedCount !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOptions}
              disabled={selectedCount === 0 || isCreating}
            >
              {isCreating ? 'Creating...' : `Create ${selectedCount} Option${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
