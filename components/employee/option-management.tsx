'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Clock, Star, Trash2, Settings, Plane } from 'lucide-react'
import { createHold, toggleOptionRecommended, deleteOption } from '@/lib/actions/employee-actions'
import { toast } from 'sonner'

interface FlightOption {
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
}

interface Personnel {
  id: string
  full_name: string
  is_assigned: boolean
}

interface OptionManagementProps {
  options: FlightOption[]
  assignedPersonnel: Personnel[]
}

export function OptionManagement({ options, assignedPersonnel }: OptionManagementProps) {
  const [isCreatingHold, setIsCreatingHold] = useState<string | null>(null)
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Calculate hold countdown
  const getHoldCountdown = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffMs <= 0) return 'Expired'
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`
    return `${diffMinutes}m`
  }

  const handleCreateHold = async (optionId: string) => {
    if (selectedPersonnel.length === 0) {
      toast.error('Please select personnel for the hold')
      return
    }

    setIsCreatingHold(optionId)
    try {
      const formData = new FormData()
      formData.append('option_id', optionId)
      selectedPersonnel.forEach(id => formData.append('passenger_ids', id))

      const result = await createHold(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Created 24-hour hold for ${selectedPersonnel.length} passenger(s)`)
        setSelectedPersonnel([])
      }
    } catch (error) {
      toast.error('Failed to create hold')
    } finally {
      setIsCreatingHold(null)
    }
  }

  const handleToggleRecommended = async (optionId: string, isRecommended: boolean) => {
    try {
      const formData = new FormData()
      formData.append('option_id', optionId)
      formData.append('is_recommended', (!isRecommended).toString())

      const result = await toggleOptionRecommended(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Option ${!isRecommended ? 'marked as recommended' : 'recommendation removed'}`)
      }
    } catch (error) {
      toast.error('Failed to update recommendation')
    }
  }

  const handleDeleteOption = async (optionId: string, optionName: string) => {
    setIsDeleting(optionId)
    try {
      const formData = new FormData()
      formData.append('option_id', optionId)

      const result = await deleteOption(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Deleted option: ${optionName}`)
      }
    } catch (error) {
      toast.error('Failed to delete option')
    } finally {
      setIsDeleting(null)
    }
  }

  if (options.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flight Options</CardTitle>
          <CardDescription>Available flight options for this leg</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Plane className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No flight options</h3>
            <p className="mt-2 text-muted-foreground">
              Flight options will appear here once you create them using the Navitas parser above.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Flight Options</CardTitle>
            <CardDescription>
              Available flight options for this leg ({options.length} options)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {options.map((option) => (
            <Card key={option.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{option.name}</CardTitle>
                      {option.is_recommended && (
                        <Badge variant="default" className="flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>Recommended</span>
                        </Badge>
                      )}
                      {!option.is_available && (
                        <Badge variant="destructive">Unavailable</Badge>
                      )}
                    </div>
                    {option.description && (
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {option.total_cost && (
                      <div className="text-right">
                        <div className="font-semibold">
                          ${(option.total_cost / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {option.currency || 'USD'}
                        </div>
                      </div>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Flight Option</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete &quot;{option.name}&quot;? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDeleteOption(option.id, option.name)}
                            disabled={isDeleting === option.id}
                          >
                            {isDeleting === option.id ? 'Deleting...' : 'Delete Option'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Flight Components */}
                  {option.option_components.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Flight Segments</h5>
                      <div className="space-y-1">
                        {option.option_components
                          .sort((a, b) => a.component_order - b.component_order)
                          .map((component) => (
                            <div key={component.id} className="text-sm p-2 bg-muted rounded-md">
                              {component.navitas_text}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Active Holds */}
                  {option.holds.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Active Holds</h5>
                      <div className="space-y-1">
                        {option.holds.map((hold) => (
                          <div key={hold.id} className="flex items-center justify-between text-sm p-2 bg-amber-50 dark:bg-amber-950 rounded-md">
                            <span>{hold.tour_personnel.full_name}</span>
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{getHoldCountdown(hold.expires_at)}</span>
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Clock className="mr-2 h-4 w-4" />
                          Set Hold (24h)
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Hold for {option.name}</DialogTitle>
                          <DialogDescription>
                            Select passengers to place a 24-hour hold on this option.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {assignedPersonnel.map((person) => (
                            <div key={person.id} className="flex items-center space-x-2">
                              <input 
                                type="checkbox"
                                checked={selectedPersonnel.includes(person.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPersonnel(prev => [...prev, person.id])
                                  } else {
                                    setSelectedPersonnel(prev => prev.filter(id => id !== person.id))
                                  }
                                }}
                              />
                              <span className="text-sm">{person.full_name}</span>
                            </div>
                          ))}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedPersonnel([])}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => handleCreateHold(option.id)}
                            disabled={selectedPersonnel.length === 0 || isCreatingHold === option.id}
                          >
                            {isCreatingHold === option.id ? 'Creating...' : `Create Hold (${selectedPersonnel.length})`}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Button size="sm" variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Option
                    </Button>
                    
                    <div className="flex items-center space-x-2 ml-auto">
                      <Switch 
                        checked={option.is_recommended} 
                        onCheckedChange={() => handleToggleRecommended(option.id, option.is_recommended)}
                        id={`rec-${option.id}`}
                      />
                      <label htmlFor={`rec-${option.id}`} className="text-sm">
                        Recommended
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
