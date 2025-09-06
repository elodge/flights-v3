/**
 * @fileoverview Confirmation dialog for deleting tour personnel
 * 
 * @description Provides a safe confirmation dialog for removing personnel from tours
 * @access agent, admin
 * @security Requires agent or admin role to access
 * @database tour_personnel table operations
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteTourPerson } from '@/app/(admin)/admin/users/_actions/delete-personnel';

interface DeletePersonDialogProps {
  personId: string;
  personName: string;
  disabled?: boolean;
}

/**
 * Delete person confirmation dialog component
 * 
 * @description Renders a confirmation dialog for safely deleting personnel from tours
 * @param personId - UUID of the person to delete
 * @param personName - Display name of the person for confirmation message
 * @param disabled - Whether the delete button should be disabled
 * @returns JSX.Element - Alert dialog with confirmation UI
 * @access agent, admin
 * @security Validates user permissions before allowing deletion
 * @example
 * ```tsx
 * <DeletePersonDialog 
 *   personId="550e8400-e29b-41d4-a716-446655440000"
 *   personName="Taylor Swift"
 *   disabled={false}
 * />
 * ```
 */
export function DeletePersonDialog({ 
  personId, 
  personName, 
  disabled = false 
}: DeletePersonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // CONTEXT: Handle person deletion with proper error handling
  const handleDelete = () => {
    startTransition(async () => {
      try {
        // SECURITY: Call server action with role enforcement
        await deleteTourPerson(personId);
        
        // SUCCESS: Show success toast and refresh data
        toast.success(`Removed ${personName} from tour`);
        setIsOpen(false);
        router.refresh();
      } catch (error) {
        // ERROR: Show error toast with details
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete person';
        toast.error(`Failed to remove ${personName}: ${errorMessage}`);
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || isPending}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete person</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Person</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{personName}</strong> from this tour? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Removing...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
