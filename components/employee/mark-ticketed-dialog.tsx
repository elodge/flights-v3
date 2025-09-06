/**
 * @fileoverview Mark Ticketed Dialog component
 * 
 * @description Modal dialog for agents to mark passengers as ticketed with PNR and pricing.
 * Supports partial ticketing for groups.
 * @param isOpen - Whether the dialog is open
 * @param onClose - Function to call when dialog closes
 * @param onSuccess - Function to call when ticketing is successfully recorded
 * @param queueItem - Queue item containing passenger and option details
 * @returns JSX.Element
 * @access Employees only
 * @example
 * ```typescript
 * <MarkTicketedDialog
 *   isOpen={true}
 *   onClose={() => setOpen(false)}
 *   onSuccess={() => refetchData()}
 *   queueItem={selectedQueueItem}
 * />
 * ```
 */

'use client';

import { useState, useTransition } from 'react';
import { Plane, AlertCircle, Check } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { markTicketed } from '@/app/(employee)/a/actions/queue';

// CONTEXT: Type for queue item structure
interface QueueItem {
  id: string;
  option_id: string;
  price_snapshot: number;
  currency: string;
  selection_groups: {
    passenger_ids: string[];
    legs: {
      id: string;
    };
  };
  options: {
    name: string;
  };
  ticketed_count: number;
  total_passengers: number;
}

interface MarkTicketedDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Function to call when dialog closes */
  onClose: () => void;
  /** Function to call when ticketing is successfully recorded */
  onSuccess: () => void;
  /** Queue item containing passenger and option details */
  queueItem: QueueItem;
}

// CONTEXT: Interface for passenger ticketing form
interface PassengerTicketing {
  passengerId: string;
  selected: boolean;
  pnr: string;
  pricePaid: number;
}

/**
 * Mark Ticketed Dialog component
 * 
 * @description Modal interface for agents to record passenger ticketing with PNRs
 * and actual pricing paid. Supports partial ticketing for groups.
 * @param props - Component props
 * @returns JSX.Element
 * @access Employees only
 * @security Server action handles role authorization
 * @database Creates ticketing records and deactivates selections
 * @business_rule One passenger per PNR, unique per leg+passenger
 * @example
 * ```typescript
 * <MarkTicketedDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onSuccess={handleSuccess}
 *   queueItem={selectedItem}
 * />
 * ```
 */
export function MarkTicketedDialog({
  isOpen,
  onClose,
  onSuccess,
  queueItem
}: MarkTicketedDialogProps) {
  // CONTEXT: Initialize passenger ticketing forms
  const [passengers, setPassengers] = useState<PassengerTicketing[]>(() => 
    queueItem.selection_groups.passenger_ids.map(id => ({
      passengerId: id,
      selected: true, // Default all selected
      pnr: '',
      pricePaid: queueItem.price_snapshot
    }))
  );
  
  const [isPending, startTransition] = useTransition();

  // CONTEXT: Update individual passenger form data
  const updatePassenger = (passengerId: string, updates: Partial<PassengerTicketing>) => {
    setPassengers(prev => prev.map(p => 
      p.passengerId === passengerId ? { ...p, ...updates } : p
    ));
  };

  // CONTEXT: Validate form data
  const validateForm = () => {
    const selectedPassengers = passengers.filter(p => p.selected);
    
    if (selectedPassengers.length === 0) {
      return 'Please select at least one passenger to ticket';
    }

    for (const passenger of selectedPassengers) {
      if (!passenger.pnr.trim()) {
        return 'PNR is required for all selected passengers';
      }
      if (passenger.pnr.length !== 6) {
        return 'PNR must be exactly 6 characters';
      }
      if (passenger.pricePaid <= 0) {
        return 'Price paid must be greater than 0';
      }
    }

    // Check for duplicate PNRs
    const pnrs = selectedPassengers.map(p => p.pnr.toUpperCase());
    if (new Set(pnrs).size !== pnrs.length) {
      return 'Each passenger must have a unique PNR';
    }

    return null;
  };

  // CONTEXT: Handle ticket submission
  const handleSubmit = () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    const selectedPassengers = passengers.filter(p => p.selected);

    startTransition(async () => {
      try {
        // CONTEXT: Process each selected passenger
        for (const passenger of selectedPassengers) {
          await markTicketed({
            optionId: queueItem.option_id,
            legId: queueItem.selection_groups.legs.id,
            passengerId: passenger.passengerId,
            pnr: passenger.pnr.toUpperCase(),
            pricePaid: passenger.pricePaid,
            currency: queueItem.currency
          });
        }

        toast.success(`Ticketed ${selectedPassengers.length} passenger(s)`);
        onSuccess();
      } catch (error) {
        console.error('Failed to mark ticketed:', error);
        
        let errorMessage = 'Failed to mark passengers as ticketed';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      }
    });
  };

  // CONTEXT: Auto-fill PNRs and prices
  const handleAutoFill = () => {
    const basePnr = Math.random().toString(36).substring(2, 8).toUpperCase();
    setPassengers(prev => prev.map((p, index) => ({
      ...p,
      pnr: p.selected ? `${basePnr}${index + 1}`.slice(0, 6) : p.pnr,
      pricePaid: p.selected ? queueItem.price_snapshot : p.pricePaid
    })));
    toast.info('Auto-filled PNRs and prices');
  };

  const selectedCount = passengers.filter(p => p.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plane className="h-5 w-5 mr-2 text-green-500" />
            Mark Passengers as Ticketed
          </DialogTitle>
          <DialogDescription>
            Record ticketing information for passengers. Each passenger requires a unique PNR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CONTEXT: Option details */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">Flight Option</h4>
            <p className="text-sm text-gray-600 mt-1">{queueItem.options.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {queueItem.total_passengers} passengers, {queueItem.ticketed_count} already ticketed
            </p>
          </div>

          {/* CONTEXT: Quick actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">{selectedCount}</span> of {passengers.length} passengers selected
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFill}
              disabled={isPending}
            >
              Auto-fill PNRs
            </Button>
          </div>

          <Separator />

          {/* CONTEXT: Passenger list */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {passengers.map((passenger, index) => (
              <div key={passenger.passengerId} className="p-3 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={passenger.selected}
                    onCheckedChange={(checked) => 
                      updatePassenger(passenger.passengerId, { selected: checked as boolean })
                    }
                    disabled={isPending}
                  />
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center">
                      <span className="font-medium text-sm">
                        Passenger {index + 1}
                      </span>
                      {!passenger.selected && (
                        <span className="ml-2 text-xs text-gray-500">(Not selected)</span>
                      )}
                    </div>
                    
                    {passenger.selected && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`pnr-${index}`} className="text-xs">
                            PNR (6 characters)
                          </Label>
                          <Input
                            id={`pnr-${index}`}
                            value={passenger.pnr}
                            onChange={(e) => 
                              updatePassenger(passenger.passengerId, { 
                                pnr: e.target.value.toUpperCase().slice(0, 6) 
                              })
                            }
                            placeholder="ABC123"
                            maxLength={6}
                            disabled={isPending}
                            className="text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`price-${index}`} className="text-xs">
                            Price Paid ({queueItem.currency})
                          </Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={passenger.pricePaid}
                            onChange={(e) => 
                              updatePassenger(passenger.passengerId, { 
                                pricePaid: parseFloat(e.target.value) || 0 
                              })
                            }
                            disabled={isPending}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CONTEXT: Important notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>One PNR per passenger:</strong> Each passenger must have their own unique 6-character PNR. 
              This will mark them as ticketed and remove them from the booking queue.
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
            onClick={handleSubmit}
            disabled={isPending || selectedCount === 0}
            className="bg-green-500 hover:bg-green-600"
          >
            {isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Ticket {selectedCount} Passenger{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
