/**
 * @fileoverview Selection confirmation component for finalizing flight choices
 * 
 * @description Sticky footer component that allows clients to confirm their
 * group selections. Provides idempotent confirmation action and displays
 * current selection status with clear call-to-action.
 * 
 * @access Client-side component
 * @security Uses RLS-protected confirmation actions
 * @database Updates selection status via confirmGroupSelection action
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { confirmGroupSelection } from '@/lib/actions/selection-actions'

interface SelectionConfirmationProps {
  legId: string
  hasGroupSelections: boolean
  hasIndividualSelections: boolean
}

/**
 * Selection confirmation component with sticky footer
 * 
 * @description Provides interface for confirming group flight selections.
 * Shows current selection status and allows idempotent confirmation of
 * all group selections for non-individual passengers.
 * 
 * @param legId - UUID of the leg to confirm selections for
 * @param hasGroupSelections - Whether there are passengers in group selection mode
 * @param hasIndividualSelections - Whether there are passengers in individual mode
 * @returns JSX.Element - Sticky footer with confirmation interface
 * 
 * @security Uses RLS-protected confirmGroupSelection action
 * @business_rule Idempotent operation - safe to call multiple times
 * @business_rule Only affects group selections, not individual choices
 * 
 * @example
 * ```tsx
 * <SelectionConfirmation
 *   legId="leg-uuid"
 *   hasGroupSelections={true}
 *   hasIndividualSelections={false}
 * />
 * ```
 */
export function SelectionConfirmation({ 
  legId, 
  hasGroupSelections, 
  hasIndividualSelections 
}: SelectionConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  
  /**
   * Handles group selection confirmation
   * 
   * @description Calls the confirmation action to ensure all group passengers
   * have client_choice selection records. Provides user feedback via toasts
   * and manages loading state during the operation.
   * 
   * @security Uses RLS-protected confirmGroupSelection action
   * @business_rule Idempotent - creates missing selections without duplicating
   */
  const handleConfirmSelection = async () => {
    if (!hasGroupSelections) return
    
    setIsConfirming(true)
    
    try {
      // CONTEXT: Confirm group selections for all non-individual passengers
      // BUSINESS_RULE: Idempotent operation that ensures selections exist
      const result = await confirmGroupSelection(legId)
      
      if (result.success) {
        toast.success('Group selections confirmed successfully')
      } else {
        toast.error(result.error || 'Failed to confirm selections')
      }
    } catch (error) {
      console.error('Confirmation error:', error)
      toast.error('An error occurred while confirming selections')
    } finally {
      setIsConfirming(false)
    }
  }
  
  // CONTEXT: Don't show confirmation if no group selections exist
  if (!hasGroupSelections && !hasIndividualSelections) {
    return null
  }
  
  return (
    <div className="sticky bottom-0 bg-background border-t p-4 mt-8">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Selection Status Indicators */}
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Flight Selections</p>
                  <p className="text-xs text-muted-foreground">
                    {hasGroupSelections && hasIndividualSelections ? (
                      'Group and individual selections available'
                    ) : hasGroupSelections ? (
                      'Group selection mode'
                    ) : (
                      'Individual selection mode'
                    )}
                  </p>
                </div>
              </div>
              
              {/* Status Badges */}
              <div className="flex gap-2">
                {hasGroupSelections && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Group pending
                  </Badge>
                )}
                
                {hasIndividualSelections && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Individual choices
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Confirmation Action */}
            {hasGroupSelections && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">Ready to confirm?</p>
                  <p className="text-xs text-muted-foreground">
                    Finalizes group selections
                  </p>
                </div>
                
                <Button 
                  onClick={handleConfirmSelection}
                  disabled={isConfirming}
                  size="lg"
                  className="px-6"
                >
                  {isConfirming ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Group Selection
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {/* Additional Information */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>
                {hasGroupSelections ? (
                  'You can change your selections until they are ticketed by the agent.'
                ) : (
                  'Individual selections are managed separately for each passenger.'
                )}
                {hasIndividualSelections && hasGroupSelections && (
                  ' Individual choices override group selections.'
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
