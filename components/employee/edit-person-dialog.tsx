/**
 * @fileoverview Edit Person dialog component for tour personnel management
 * 
 * @description Dialog component for editing existing personnel information with form validation
 * @access Employee only (agent/admin)
 * @security Validates input data and calls server actions
 * @database tour_personnel table operations
 * @business_rule Personnel information can be updated with partial data
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
import { Edit } from "lucide-react";
import { updatePersonSchema, type UpdatePersonInput } from "@/lib/validation/personnel";
import { updateTourPerson } from "@/app/(employee)/a/tour/[id]/_actions/personnel";

interface Personnel {
  id: string;
  full_name: string;
  party: string;
  email?: string;
  phone?: string;
  seat_pref?: string;
  ff_numbers?: string;
  notes?: string;
  status: string;
}

interface EditPersonDialogProps {
  person: Personnel;
}

/**
 * Edit Person Dialog Component
 * @description Provides a form dialog for editing existing personnel information
 * @param person - Personnel record to edit
 * @returns JSX.Element - Dialog component with pre-filled form
 * @access Employee only (agent/admin)
 * @security Validates input and calls server actions
 * @database Updates records in tour_personnel table
 * @business_rule Allows partial updates of personnel information
 */
export function EditPersonDialog({ person }: EditPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<UpdatePersonInput>({
    resolver: zodResolver(updatePersonSchema),
    defaultValues: {
      full_name: person.full_name,
      party: person.party as any,
      email: person.email || "",
      phone: person.phone || "",
      seat_pref: person.seat_pref || "",
      ff_numbers: person.ff_numbers || "",
      notes: person.notes || "",
      status: person.status as any,
    },
  });

  /**
   * Handle form submission
   * @description Validates form data and calls server action to update personnel
   * @param data - Form data validated by Zod schema
   * @security Calls server action with validated data
   * @database Updates record in tour_personnel table
   */
  const onSubmit = async (data: UpdatePersonInput) => {
    setIsSubmitting(true);
    
    try {
      const result = await updateTourPerson(person.id, data);
      
      if (result.success === false) {
        // CONTEXT: Handle validation or server errors
        toast.error(result.error || "Failed to update person");
        return;
      }

      // CONTEXT: Success - close dialog and refresh page
      toast.success("Person updated successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating person:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Person</DialogTitle>
          <DialogDescription>
            Update the information for {person.full_name}.
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="party"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('party', value as "A Party" | "B Party" | "C Party" | "D Party");
                      }} value={field.value}>
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

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('status', value as "active" | "inactive");
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                        <Input 
                          type="tel" 
                          placeholder="+1 (555) 123-4567" 
                          {...field} 
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
              <h3 className="text-lg font-medium">Travel Profile</h3>
              
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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
