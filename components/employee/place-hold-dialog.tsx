/**
 * @fileoverview Place Hold Dialog component
 * 
 * @description Modal dialog for agents to place time-limited holds on flight options.
 * Includes confirmation and duration selection.
 * @param isOpen - Whether the dialog is open
 * @param onClose - Function to call when dialog closes
 * @param onSuccess - Function to call when hold is successfully placed
 * @param optionId - UUID of the option to place hold on
 * @param legId - UUID of the leg containing the option
 * @param optionName - Display name of the option
 * @returns JSX.Element
 * @access Employees only
 * @example
 * ```typescript
 * <PlaceHoldDialog
 *   isOpen={true}
 *   onClose={() => setOpen(false)}
 *   onSuccess={() => refetchData()}
 *   optionId="option-123"
 *   legId="leg-456"
 *   optionName="American Airlines - Nonstop"
 * />
 * ```
 */

'use client';

import { useState, useTransition } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

import { placeHold } from '@/app/(employee)/a/actions/queue';

interface PlaceHoldDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Function to call when dialog closes */
  onClose: () => void;
  /** Function to call when hold is successfully placed */
  onSuccess: () => void;
  /** UUID of the option to place hold on */
  optionId: string;
  /** UUID of the leg containing the option */
  legId: string;
  /** Display name of the option */
  optionName: string;
}

/**
 * Place Hold Dialog component
 * 
 * @description Modal interface for agents to place holds on flight options with
 * duration selection and confirmation. Prevents pricing changes and secures availability.
 * @param props - Component props
 * @returns JSX.Element
 * @access Employees only
 * @security Server action handles role authorization
 * @database Creates hold record with expiration
 * @business_rule Holds cannot be extended once placed
 * @example
 * ```typescript
 * <PlaceHoldDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onSuccess={handleSuccess}
 *   optionId="option-123"
 *   legId="leg-456"
 *   optionName="Delta Air Lines - Connection"
 * />
 * ```
 */
export function PlaceHoldDialog({
  isOpen,
  onClose,
  onSuccess,
  optionId,
  legId,
  optionName
}: PlaceHoldDialogProps) {
  const [duration, setDuration] = useState<string>('24');
  const [isPending, startTransition] = useTransition();

  // CONTEXT: Handle hold placement
  const handlePlaceHold = () => {
    startTransition(async () => {
      try {
        const hours = parseInt(duration);
        await placeHold(optionId, legId, hours);
        
        toast.success(`Hold placed for ${hours} hours`);
        onSuccess();
      } catch (error) {
        console.error('Failed to place hold:', error);
        
        let errorMessage = 'Failed to place hold';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      }
    });
  };

  // CONTEXT: Calculate expiration time for display
  const getExpirationTime = () => {
    const hours = parseInt(duration);
    const expiry = new Date(Date.now() + hours * 3600 * 1000);
    return expiry.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-orange-500" />
            Place Hold
          </DialogTitle>
          <DialogDescription>
            Place a time-limited hold on this flight option to secure pricing and availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CONTEXT: Option details */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">Option</h4>
            <p className="text-sm text-gray-600 mt-1">{optionName}</p>
          </div>

          {/* CONTEXT: Duration selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hold Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours (Standard)</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours (Maximum)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Hold will expire on {getExpirationTime()}
            </p>
          </div>

          {/* CONTEXT: Important notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Important:</strong> Holds cannot be extended once placed. 
              You'll need to ticket passengers before expiration or place a new hold.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePlaceHold}
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Placing Hold...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Place {duration}h Hold
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
