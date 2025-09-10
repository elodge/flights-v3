/**
 * @fileoverview Add Person dialog component for tour personnel management
 * 
 * @description Dialog component for adding new personnel to a tour with form validation
 * @access Employee only (agent/admin)
 * @security Validates input data and calls server actions
 * @database tour_personnel table operations
 * @business_rule Personnel must be assigned to parties and have valid contact information
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Accordion component not available, using simple div structure instead
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { Plus } from "lucide-react";
import { addPersonSchema, type AddPersonInput } from "@/lib/validation/personnel";
import { addTourPerson } from "@/app/(employee)/a/tour/[id]/_actions/personnel";

interface AddPersonDialogProps {
  projectId: string;
}

/**
 * Add Person Dialog Component
 * @description Provides a form dialog for adding new personnel to a tour
 * @param projectId - UUID of the tour/project
 * @returns JSX.Element - Dialog component with form
 * @access Employee only (agent/admin)
 * @security Validates input and calls server actions
 * @database Creates records in tour_personnel table
 * @business_rule Personnel must have name and party assignment
 */
export function AddPersonDialog({ projectId }: AddPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<AddPersonInput>({
    resolver: zodResolver(addPersonSchema),
    defaultValues: {
      full_name: "",
      party: "A Party",
      email: "",
      phone: "",
      seat_pref: "",
      ff_numbers: "",
      notes: "",
    },
  });

  /**
   * Handle form submission
   * @description Validates form data and calls server action to add personnel
   * @param data - Form data validated by Zod schema
   * @security Calls server action with validated data
   * @database Inserts new record into tour_personnel table
   */
  const onSubmit = async (data: AddPersonInput) => {
    setIsSubmitting(true);
    
    try {
      const result = await addTourPerson(projectId, data);
      
      if (result.success === false) {
        // CONTEXT: Handle validation or server errors
        toast.error(result.error || "Failed to add person");
        return;
      }

      // CONTEXT: Success - close dialog and refresh page
      toast.success("Person added successfully");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Error adding person:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Person to Tour</DialogTitle>
          <DialogDescription>
            Add a new person to this tour. All fields except name and party are optional.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="party"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select party" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A Party">A Party</SelectItem>
                        <SelectItem value="B Party">B Party</SelectItem>
                        <SelectItem value="C Party">C Party</SelectItem>
                        <SelectItem value="D Party">D Party</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="email@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <PhoneNumberInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="Enter phone number"
                          error={!!form.formState.errors.phone}
                          errorMessage={form.formState.errors.phone?.message}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Travel Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Travel Profile (Optional)</h3>
              
              <FormField
                control={form.control}
                name="seat_pref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seat Preference</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Window, Aisle, Exit Row" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ff_numbers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequent Flyer Numbers</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., AA123456, UA789012" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes or special requirements..." 
                      className="min-h-[100px]"
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Person"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
