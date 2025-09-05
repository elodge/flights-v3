/**
 * @fileoverview Invite User Dialog Component
 * 
 * @description Dialog component for creating user invitations with role and artist assignments.
 * Allows admins to invite new users via tokenized links with 7-day expiry.
 * 
 * @access Admin users only
 * @security Uses admin server actions with role enforcement
 * @database Creates invites with secure tokens and artist assignments
 * @business_rule Admins can invite clients, agents, and other admins; agents can only invite clients
 * 
 * @example
 * ```tsx
 * <InviteUserDialog>
 *   <Button>Invite User</Button>
 * </InviteUserDialog>
 * ```
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Check, X } from 'lucide-react'
import { adminCreateInvite, adminGetArtists } from '@/app/(admin)/admin/users/_actions/user-actions'
import { toast } from 'sonner'

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['client', 'agent', 'admin']),
  artistIds: z.array(z.string()).default([])
})

type InviteUserForm = z.infer<typeof inviteUserSchema>

interface Artist {
  id: string
  name: string
}

interface InviteUserDialogProps {
  children: React.ReactNode
}

export function InviteUserDialog({ children }: InviteUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [artists, setArtists] = useState<Artist[]>([])
  const [inviteResult, setInviteResult] = useState<{
    success: boolean
    message: string
    userId?: string
    email: string
  } | null>(null)

  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      role: 'client',
      artistIds: []
    }
  })

  const selectedRole = form.watch('role')

  // CONTEXT: Fetch artists for assignment selection
  // ALGORITHM: Load all artists for client assignment or agent coverage
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const artists = await adminGetArtists()
        setArtists(artists)
      } catch (error) {
        console.error('Error fetching artists:', error)
        toast.error('Failed to load artists')
      }
    }

    if (isOpen) {
      fetchArtists()
    }
  }, [isOpen])

  // CONTEXT: Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      form.reset()
      setError(null)
      setInviteResult(null)
    }
  }, [isOpen, form])

  const onSubmit = async (data: InviteUserForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await adminCreateInvite({
        email: data.email,
        role: data.role,
        artistIds: data.artistIds
      })

      setInviteResult(result)
      toast.success(result.message)
    } catch (error: any) {
      console.error('Error creating invite:', error)
      setError(error.message || 'Failed to create invite')
    } finally {
      setIsLoading(false)
    }
  }


  const handleArtistToggle = (artistId: string, checked: boolean) => {
    const currentIds = form.getValues('artistIds')
    if (checked) {
      form.setValue('artistIds', [...currentIds, artistId])
    } else {
      form.setValue('artistIds', currentIds.filter(id => id !== artistId))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Create an invitation for a new user. They will receive a secure link to set up their account.
          </DialogDescription>
        </DialogHeader>

        {inviteResult ? (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                {inviteResult.message}
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Email:</strong> {inviteResult.email}</p>
              {inviteResult.userId && (
                <p><strong>User ID:</strong> {inviteResult.userId}</p>
              )}
              <p className="text-xs">
                The user will receive an email with instructions to set up their account.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
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

              {/* Artist Assignments */}
              <div className="space-y-2">
                <Label>
                  Artist Assignments
                  {selectedRole === 'client' && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Required for clients)
                    </span>
                  )}
                </Label>
                
                {selectedRole === 'agent' && (
                  <p className="text-sm text-muted-foreground">
                    Agents can access all artists. Select specific artists to set as defaults.
                  </p>
                )}
                
                {selectedRole === 'admin' && (
                  <p className="text-sm text-muted-foreground">
                    Admins have full access to all artists and system functions. Artist assignments are optional.
                  </p>
                )}

                <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                  {artists.map((artist) => (
                    <div key={artist.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={artist.id}
                        checked={form.watch('artistIds').includes(artist.id)}
                        onCheckedChange={(checked) => 
                          handleArtistToggle(artist.id, checked as boolean)
                        }
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor={artist.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {artist.name}
                      </Label>
                    </div>
                  ))}
                </div>

                {form.watch('artistIds').length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.watch('artistIds').map((artistId) => {
                      const artist = artists.find(a => a.id === artistId)
                      return artist ? (
                        <Badge key={artistId} variant="secondary" className="text-xs">
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
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Invite
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
