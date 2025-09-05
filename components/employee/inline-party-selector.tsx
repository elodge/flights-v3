/**
 * @fileoverview Inline Party Selector Component
 * 
 * @description Provides inline party selection for personnel table rows with optimistic updates
 * @access Employee only (agent/admin)
 * @security Uses existing updateTourPerson server action with role enforcement
 * @database Updates tour_personnel.party column
 * @business_rule Party changes are immediate with optimistic UI, reverts on failure
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { updateTourPerson } from '@/app/(employee)/a/tour/[id]/_actions/personnel';

// CONTEXT: Party options matching the database enum constraint
const PARTY_OPTIONS = [
  { value: 'A Party', label: 'A Party' },
  { value: 'B Party', label: 'B Party' },
  { value: 'C Party', label: 'C Party' },
  { value: 'D Party', label: 'D Party' },
] as const;

type PartyValue = typeof PARTY_OPTIONS[number]['value'];

interface InlinePartySelectorProps {
  /** Person ID for the update operation */
  personId: string;
  /** Current party value */
  currentParty: PartyValue;
  /** Person's full name for accessibility */
  fullName: string;
  /** Whether the person is inactive (disables selector) */
  isInactive?: boolean;
}

/**
 * Inline party selector with optimistic updates
 * 
 * @description Allows quick party changes directly in the personnel table
 * @param personId - Database ID of the person to update
 * @param currentParty - Current party assignment
 * @param fullName - Person's name for accessibility labels
 * @param isInactive - Whether to disable the selector
 * @returns JSX.Element - Compact select control with optimistic updates
 * @security Uses updateTourPerson server action with employee role enforcement
 * @database Updates tour_personnel.party column
 * @business_rule Optimistic UI updates immediately, reverts on server failure
 * @example
 * ```tsx
 * <InlinePartySelector
 *   personId="person-123"
 *   currentParty="A Party"
 *   fullName="John Doe"
 *   isInactive={false}
 * />
 * ```
 */
export function InlinePartySelector({
  personId,
  currentParty,
  fullName,
  isInactive = false,
}: InlinePartySelectorProps) {
  const router = useRouter();
  const [optimisticParty, setOptimisticParty] = useState<PartyValue>(currentParty);
  const [isUpdating, setIsUpdating] = useState(false);

  // CONTEXT: Handle party change with optimistic updates
  // ALGORITHM: 1) Update UI immediately, 2) Call server, 3) Revert on failure
  const handlePartyChange = async (newParty: PartyValue) => {
    // Prevent duplicate updates
    if (isUpdating) return;

    const previousParty = optimisticParty;
    
    try {
      // ALGORITHM: Step 1 - Optimistic update
      setOptimisticParty(newParty);
      setIsUpdating(true);

      // ALGORITHM: Step 2 - Server update
      const result = await updateTourPerson(personId, { party: newParty });

      if (result.success) {
        // ALGORITHM: Step 3a - Success: show toast and refresh
        toast.success('Party updated');
        // FALLBACK: Background refresh to keep dependent views in sync
        router.refresh();
      } else {
        // ALGORITHM: Step 3b - Failure: revert and show error
        setOptimisticParty(previousParty);
        toast.error(result.error || 'Failed to update party');
      }
    } catch (error) {
      // FALLBACK: Network or unexpected errors
      setOptimisticParty(previousParty);
      toast.error('Failed to update party');
      console.error('Error updating party:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // CONTEXT: Disabled state for inactive persons
  if (isInactive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs opacity-50 cursor-not-allowed">
              {optimisticParty}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Inactive person</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Select
              value={optimisticParty}
              onValueChange={handlePartyChange}
              disabled={isUpdating}
            >
              <SelectTrigger 
                className="h-6 w-20 text-xs border-0 bg-transparent p-0 hover:bg-muted/50 focus:ring-1 focus:ring-ring"
                aria-label={`Change party for ${fullName}`}
              >
                <SelectValue>
                  <Badge variant="outline" className="text-xs">
                    {optimisticParty}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PARTY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* CONTEXT: Loading spinner during updates */}
            {isUpdating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Change party for {fullName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
