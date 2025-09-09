/**
 * @fileoverview User Detail Tabs Component
 * 
 * @description Tabbed interface for user management including overview,
 * artist assignments, and security settings.
 * 
 * @access Admin users only
 * @security Uses admin server actions with role enforcement
 * @database Manages users, artist_assignments, and invites tables
 * @business_rule Admins can modify all user properties and assignments
 */

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Loader2, Save, X, Trash2, Shield, Users } from 'lucide-react'
import { adminUpdateUserProfile, adminSetUserArtists, adminSuspendUser, adminReactivateUser, adminGetArtists } from '@/app/(admin)/admin/users/_actions/user-actions'
import { toast } from 'sonner'
import type { UserDetail } from '@/types/app'

const updateUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  role: z.enum(['client', 'agent', 'admin']),
  is_active: z.boolean()
})

type UpdateUserForm = z.infer<typeof updateUserSchema>

interface UserDetailTabsProps {
  user: UserDetail
}

export function UserDetailTabs({ user }: UserDetailTabsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingArtists, setIsLoadingArtists] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artists, setArtists] = useState<Array<{ id: string; name: string }>>([])
  // CONTEXT: Initialize selected artists with validation
  // ALGORITHM: Filter out invalid UUIDs to prevent Zod validation errors
  const [selectedArtists, setSelectedArtists] = useState<string[]>(() => {
    // Use the exact same UUID pattern that Zod uses, plus allow test UUIDs
    const zodUuidPattern = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/
    
    // CONTEXT: Allow test UUIDs that are used in the database
    // BUSINESS_RULE: Test data uses non-standard UUIDs that should be allowed
    const testUuidPattern = /^(11111111-1111-1111-1111-111111111111|22222222-2222-2222-2222-222222222222)$/
    
    const validArtistIds = user.artistAssignments
      .map(a => a.artist_id)
      .filter(id => {
        return zodUuidPattern.test(id) || testUuidPattern.test(id)
      })
    
    // Debug logging to help identify invalid UUIDs
    if (user.artistAssignments.length !== validArtistIds.length) {
      const invalidIds = user.artistAssignments
        .map(a => a.artist_id)
        .filter(id => !zodUuidPattern.test(id) && !testUuidPattern.test(id))
      
      console.warn('Filtered out invalid artist IDs:', invalidIds)
      console.warn('User artist assignments:', user.artistAssignments)
    }
    
    return validArtistIds
  })

  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: user.full_name || '',
      email: user.email,
      role: user.role,
      is_active: user.is_active
    }
  })

  // CONTEXT: Fetch artists for assignment management
  const fetchArtists = async () => {
    try {
      setIsLoadingArtists(true)
      const artists = await adminGetArtists()
      setArtists(artists)
    } catch (error) {
      console.error('Error fetching artists:', error)
      toast.error('Failed to load artists')
    } finally {
      setIsLoadingArtists(false)
    }
  }

  // CONTEXT: Automatically load artists when component mounts
  // ALGORITHM: Load artists immediately for better UX
  useEffect(() => {
    fetchArtists()
  }, [])

  const onSubmit = async (data: UpdateUserForm) => {
    setIsLoading(true)
    setError(null)

    try {
      await adminUpdateUserProfile({
        userId: user.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        is_active: data.is_active
      })

      toast.success('User profile updated successfully')
    } catch (error: any) {
      console.error('Error updating user:', error)
      setError(error.message || 'Failed to update user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleArtistToggle = async (artistId: string, checked: boolean) => {
    // CONTEXT: Validate artist ID before processing
    // ALGORITHM: Use same UUID pattern as Zod to prevent validation errors
    const zodUuidPattern = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/
    
    // CONTEXT: Allow test UUIDs that are used in the database
    // BUSINESS_RULE: Test data uses non-standard UUIDs that should be allowed
    const testUuidPattern = /^(11111111-1111-1111-1111-111111111111|22222222-2222-2222-2222-222222222222)$/
    
    if (!zodUuidPattern.test(artistId) && !testUuidPattern.test(artistId)) {
      console.error('Invalid artist ID format:', artistId)
      toast.error('Invalid artist ID format')
      return
    }

    const newSelectedArtists = checked
      ? [...selectedArtists, artistId]
      : selectedArtists.filter(id => id !== artistId)

    // CONTEXT: Final validation before sending to server
    // ALGORITHM: Filter out any invalid UUIDs that might have slipped through
    const validSelectedArtists = newSelectedArtists.filter(id => 
      zodUuidPattern.test(id) || testUuidPattern.test(id)
    )
    
    if (validSelectedArtists.length !== newSelectedArtists.length) {
      console.warn('Filtered out invalid UUIDs before server call:', 
        newSelectedArtists.filter(id => !zodUuidPattern.test(id) && !testUuidPattern.test(id))
      )
    }

    setSelectedArtists(validSelectedArtists)

    // CONTEXT: Debug logging for artist assignment updates
    // ALGORITHM: Log the data being sent to help identify validation issues
    console.log('Updating artist assignments:', {
      userId: user.id,
      artistIds: validSelectedArtists,
      artistIdBeingToggled: artistId,
      checked
    })

    try {
      await adminSetUserArtists({
        userId: user.id,
        artistIds: validSelectedArtists
      })

      toast.success('Artist assignments updated')
    } catch (error: any) {
      console.error('Error updating artist assignments:', error)
      console.error('Failed data:', {
        userId: user.id,
        artistIds: validSelectedArtists
      })
      toast.error('Failed to update artist assignments')
      // Revert the change
      setSelectedArtists(selectedArtists)
    }
  }

  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    try {
      if (newStatus === 'inactive') {
        await adminSuspendUser(user.id)
      } else {
        await adminReactivateUser(user.id)
      }
      toast.success(`User ${newStatus === 'inactive' ? 'suspended' : 'reactivated'} successfully`)
    } catch (error: any) {
      console.error('Error changing user status:', error)
      toast.error('Failed to change user status')
    }
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="artists">Artists</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Account</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        User can access the system
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="artists" className="space-y-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Artist Assignments</h3>
            <p className="text-sm text-muted-foreground">
              {user.role === 'client' 
                ? 'Clients can only access their assigned artists.'
                : 'Agents can access all artists. Select specific artists to set as defaults.'
              }
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto border rounded-md p-4 space-y-2">
            {isLoadingArtists ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading artists...</span>
              </div>
            ) : artists.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No artists available
              </div>
            ) : (
              artists.map((artist) => (
                <div key={artist.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={artist.id}
                    checked={selectedArtists.includes(artist.id)}
                    onCheckedChange={(checked) => 
                      handleArtistToggle(artist.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={artist.id}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {artist.name}
                  </Label>
                </div>
              ))
            )}
          </div>

          {selectedArtists.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Artists</Label>
              <div className="flex flex-wrap gap-2">
                {selectedArtists.map((artistId) => {
                  const artist = artists.find(a => a.id === artistId)
                  return artist ? (
                    <Badge key={artistId} variant="secondary">
                      {artist.name}
                      <button
                        type="button"
                        onClick={() => handleArtistToggle(artistId, false)}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Security Settings</h3>
            <p className="text-sm text-muted-foreground">
              Manage user account security and access controls.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h4 className="font-medium">Account Status</h4>
                <p className="text-sm text-muted-foreground">
                  {user.is_active 
                    ? 'User has access to the system'
                    : 'User access is inactive'
                  }
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant={user.is_active ? 'destructive' : 'default'}>
                    {user.is_active ? 'Suspend User' : 'Reactivate User'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {user.is_active ? 'Suspend User' : 'Reactivate User'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {user.is_active 
                        ? 'Are you sure you want to suspend this user? They will lose access to the system.'
                        : 'Are you sure you want to reactivate this user? They will regain access to the system.'
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange(user.is_active ? 'inactive' : 'active')}
                    >
                      {user.is_active ? 'Suspend' : 'Reactivate'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h4 className="font-medium">Authentication Status</h4>
                <p className="text-sm text-muted-foreground">
                  {user.is_active 
                    ? 'User has an active account'
                    : 'User has an inactive account'
                  }
                </p>
              </div>
              <Badge variant={user.is_active ? 'default' : 'secondary'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {user.pendingInvite && (
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md">
                <h4 className="font-medium text-yellow-800">Pending Invitation</h4>
                <p className="text-sm text-yellow-700">
                  This user has a pending invitation that expires on{' '}
                  {new Date(user.pendingInvite.expires_at).toLocaleString()}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Token: {user.pendingInvite.token}
                </p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
