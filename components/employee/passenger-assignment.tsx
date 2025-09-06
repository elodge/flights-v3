'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, X, Shuffle } from 'lucide-react'
import { assignPassengersToLeg, removePassengerFromLeg } from '@/lib/actions/employee-actions'
import { seedSelectionGroups } from '@/app/(employee)/a/actions/seed-selection-groups'
import { toast } from 'sonner'

interface Personnel {
  id: string
  full_name: string
  email: string | null
  role_title: string | null
  is_vip: boolean
  is_assigned: boolean
}

interface PassengerAssignmentProps {
  legId: string
  personnel: Personnel[]
}

export function PassengerAssignment({ legId, personnel }: PassengerAssignmentProps) {
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [isGeneratingGroups, setIsGeneratingGroups] = useState(false)

  const assignedPersonnel = personnel.filter(p => p.is_assigned)
  const unassignedPersonnel = personnel.filter(p => !p.is_assigned)

  const handleSelectPersonnel = (personnelId: string) => {
    setSelectedPersonnel(prev => 
      prev.includes(personnelId)
        ? prev.filter(id => id !== personnelId)
        : [...prev, personnelId]
    )
  }

  const handleAssign = async () => {
    if (selectedPersonnel.length === 0) {
      toast.error('Please select personnel to assign')
      return
    }

    setIsAssigning(true)
    try {
      const formData = new FormData()
      formData.append('leg_id', legId)
      selectedPersonnel.forEach(id => formData.append('passenger_ids', id))

      const result = await assignPassengersToLeg(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Assigned ${selectedPersonnel.length} personnel to leg`)
        setSelectedPersonnel([])
      }
    } catch (error) {
      toast.error('Failed to assign personnel')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemove = async (personnelId: string, fullName: string) => {
    try {
      const formData = new FormData()
      formData.append('leg_id', legId)
      formData.append('passenger_id', personnelId)

      const result = await removePassengerFromLeg(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Removed ${fullName} from leg`)
      }
  } catch (error) {
    toast.error('Failed to remove personnel')
  }
}

const handleGenerateSelectionGroups = async () => {
  if (assignedPersonnel.length === 0) {
    toast.error('No passengers assigned to this leg')
    return
  }

  setIsGeneratingGroups(true)
  try {
    const result = await seedSelectionGroups(legId)
    
    const message = result.details.individuals > 0 && result.details.grouped > 0
      ? `Created ${result.details.individuals} individual groups and 1 group with ${assignedPersonnel.length - result.details.individuals} passengers`
      : result.details.individuals > 0
      ? `Created ${result.details.individuals} individual groups`
      : `Created 1 group with ${result.details.totalPassengers} passengers`
    
    toast.success(message)
  } catch (error) {
    console.error('Failed to generate selection groups:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate selection groups'
    toast.error(errorMessage)
  } finally {
    setIsGeneratingGroups(false)
  }
}

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Passenger Assignment</span>
            </CardTitle>
            <CardDescription>
              Assign personnel to this leg ({assignedPersonnel.length} assigned)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {assignedPersonnel.length > 0 && (
              <Button 
                variant="outline"
                size="sm" 
                onClick={handleGenerateSelectionGroups}
                disabled={isGeneratingGroups}
              >
                <Shuffle className="mr-2 h-4 w-4" />
                {isGeneratingGroups ? 'Generating...' : 'Generate Selection Groups'}
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleAssign}
              disabled={selectedPersonnel.length === 0 || isAssigning}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isAssigning ? 'Assigning...' : `Assign Selected (${selectedPersonnel.length})`}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currently Assigned */}
        {assignedPersonnel.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Currently Assigned</h4>
            <div className="space-y-1">
              {assignedPersonnel.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded-md">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{person.full_name}</span>
                    {person.is_vip && (
                      <Badge variant="secondary" className="text-xs">VIP</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {person.role_title || 'Traveler'}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemove(person.id, person.full_name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Personnel */}
        {unassignedPersonnel.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Available Personnel</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {unassignedPersonnel.map((person) => (
                <div key={person.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md">
                  <input 
                    type="checkbox" 
                    className="rounded" 
                    checked={selectedPersonnel.includes(person.id)}
                    onChange={() => handleSelectPersonnel(person.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{person.full_name}</span>
                      {person.is_vip && (
                        <Badge variant="secondary" className="text-xs">VIP</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{person.role_title || 'Traveler'}</span>
                      {person.email && <span>• {person.email}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {personnel.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No personnel in this project</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
