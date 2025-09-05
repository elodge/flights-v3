/**
 * @fileoverview Add Leg dialog component for tour management
 * 
 * @description Provides a form dialog for creating new flight legs within tours.
 * Includes validation, error handling, and integration with server actions.
 * 
 * @access Employee only (agent, admin roles)
 * @security Uses server actions with employee role enforcement
 * @database Creates new legs via createLeg server action
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Plus, Loader2 } from 'lucide-react'
import { createLeg } from '@/lib/actions/leg-actions'

/**
 * Zod schema for leg creation form validation
 * 
 * @description Validates form data with proper constraints for destination,
 * dates, and optional fields. Enforces business rules for date ordering.
 * 
 * @business_rule Destination is required, 2-80 characters
 * @business_rule If both dates provided, arrival_date >= departure_date
 */
const addLegSchema = z.object({
  destination: z.string()
    .min(2, 'Destination must be at least 2 characters')
    .max(80, 'Destination must be less than 80 characters'),
  origin: z.string().optional(),
  departure_date: z.string().optional(),
  arrival_date: z.string().optional(),
  label: z.string().optional()
}).refine((data) => {
  // CONTEXT: Validate date order if both dates are provided
  if (data.departure_date && data.arrival_date) {
    const departure = new Date(data.departure_date)
    const arrival = new Date(data.arrival_date)
    return arrival >= departure
  }
  return true
}, {
  message: 'Arrival date must be on or after departure date',
  path: ['arrival_date']
})

type AddLegFormData = z.infer<typeof addLegSchema>

interface AddLegDialogProps {
  /** Project/tour ID to add the leg to */
  projectId: string
}

/**
 * Add Leg dialog component
 * 
 * @description Form dialog for creating new flight legs with validation,
 * error handling, and server action integration. Provides user feedback
 * and handles form state management.
 * 
 * @param props - Component props
 * @returns JSX.Element - Dialog with form for leg creation
 * 
 * @security Uses createLeg server action with employee role enforcement
 * @database Creates new legs via server action
 * @business_rule Validates form data and enforces date ordering
 * 
 * @example
 * ```tsx
 * <AddLegDialog projectId="tour-uuid" />
 * ```
 */
export function AddLegDialog({ projectId }: AddLegDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<AddLegFormData>({
    resolver: zodResolver(addLegSchema),
    defaultValues: {
      destination: '',
      origin: '',
      departure_date: '',
      arrival_date: '',
      label: ''
    }
  })

  /**
   * Handles form submission and leg creation
   * 
   * @description Validates form data, calls server action, and provides
   * user feedback. Closes dialog on success and refreshes the page.
   * 
   * @param data - Form data from react-hook-form
   */
  const onSubmit = async (data: AddLegFormData) => {
    try {
      setIsSubmitting(true)
      
      // CONTEXT: Clean up empty strings to null for optional fields
      const payload = {
        destination: data.destination,
        origin: data.origin || undefined,
        departure_date: data.departure_date || undefined,
        arrival_date: data.arrival_date || undefined,
        label: data.label || undefined
      }
      
      const result = await createLeg(projectId, payload)
      
      if (result.success) {
        toast.success('Leg created successfully')
        setOpen(false)
        form.reset()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create leg')
      }
    } catch (error) {
      console.error('Error creating leg:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Leg
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Flight Leg</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Destination Field */}
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., New York, NY or PHL" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Origin Field */}
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Los Angeles, CA or LAX" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Departure Date Field */}
            <FormField
              control={form.control}
              name="departure_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Arrival Date Field */}
            <FormField
              control={form.control}
              name="arrival_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrival Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Label Field */}
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., E2E Test Leg or Festival" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Leg'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
