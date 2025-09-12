/**
 * @fileoverview Create Tour Dialog Component
 * 
 * @description Client-side dialog component for creating new tours with form validation,
 * artist selection, and proper error handling. Integrates with tour creation server actions
 * and provides a seamless tour creation experience for employees.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses server actions for data persistence with role validation
 * @database Creates records in projects table via createTour action
 * @business_rule Requires tour name and artist selection at minimum
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Calendar, User, FileText, Loader2 } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { createTour, getAvailableArtists, CreateTourInput } from '@/lib/actions/tour-actions'

/**
 * Form validation schema
 */
const createTourFormSchema = z.object({
  name: z.string().min(1, 'Tour name is required').max(200, 'Tour name too long'),
  description: z.string().optional(),
  artist_id: z.string().min(1, 'Please select an artist'),
  type: z.enum(['tour', 'event']).default('tour'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date']
})

type CreateTourFormData = z.infer<typeof createTourFormSchema>

/**
 * Create Tour Dialog Component
 * 
 * @description Provides a form dialog for creating new tours with artist selection,
 * date inputs, and description. Handles form validation, submission, and navigation.
 * 
 * @returns JSX.Element - Dialog trigger button and modal form
 * 
 * @access Employee only (agent/admin)
 * @security Validates input and calls server actions
 * @database Creates records in projects table
 * @business_rule Tours must have name and artist assignment
 * 
 * @example
 * ```tsx
 * <CreateTourDialog />
 * ```
 */
export function CreateTourDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingArtists, setIsLoadingArtists] = useState(false)
  const [artists, setArtists] = useState<Array<{ id: string; name: string; description: string | null }>>([])
  const router = useRouter()

  const form = useForm<CreateTourFormData>({
    resolver: zodResolver(createTourFormSchema),
    defaultValues: {
      name: '',
      description: '',
      artist_id: '',
      type: 'tour',
      start_date: '',
      end_date: '',
    },
  })

  /**
   * Load available artists when dialog opens
   */
  useEffect(() => {
    if (open && artists.length === 0) {
      loadArtists()
    }
  }, [open, artists.length])

  /**
   * Fetch available artists for dropdown
   */
  const loadArtists = async () => {
    setIsLoadingArtists(true)
    try {
      const result = await getAvailableArtists()
      if (result.success && result.artists) {
        setArtists(result.artists)
      } else {
        toast.error(result.error || 'Failed to load artists')
      }
    } catch (error) {
      console.error('Error loading artists:', error)
      toast.error('Failed to load artists')
    } finally {
      setIsLoadingArtists(false)
    }
  }

  /**
   * Handle form submission
   * 
   * @description Validates form data and calls server action to create tour
   * @param data - Form data validated by Zod schema
   * @security Calls server action with validated data
   * @database Inserts new record into projects table
   */
  const onSubmit = async (data: CreateTourFormData) => {
    setIsSubmitting(true)
    
    try {
      // CONTEXT: Convert form data to server action format
      const tourData: CreateTourInput = {
        name: data.name,
        description: data.description || undefined,
        artist_id: data.artist_id,
        type: data.type,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      }

      const result = await createTour(tourData)
      
      if (!result.success) {
        toast.error(result.error || 'Failed to create tour')
        return
      }

      // CONTEXT: Success - close dialog and navigate to new tour
      toast.success('Tour created successfully!')
      setOpen(false)
      form.reset()
      
      if (result.tourId) {
        router.push(`/a/tour/${result.tourId}`)
      } else {
        router.refresh() // Fallback - just refresh the page
      }
    } catch (error) {
      console.error('Error creating tour:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Tour
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
          <DialogDescription>
            Create a new tour or event. Fill in the basic information below - you can add legs and personnel later.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Information
              </h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tour Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer 2024 Tour" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional description of the tour..."
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description of the tour or event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Artist & Type */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5" />
                Artist & Type
              </h3>
              
              <FormField
                control={form.control}
                name="artist_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingArtists ? "Loading artists..." : "Select an artist"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tour">Tour</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose whether this is a multi-city tour or single event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dates (Optional)
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingArtists}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tour
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
