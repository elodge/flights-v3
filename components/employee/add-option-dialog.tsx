/**
 * @fileoverview Add Option Dialog with Navitas and Manual tabs
 * 
 * @description Dialog component for adding flight options with two methods:
 * - Navitas: Paste and parse existing flight data
 * - Manual: Create options manually with segment editor and AviationStack enrichment
 * 
 * @access Employee only (agent/admin)
 * @security Role-based access control enforced by server actions
 * @database Creates records via server actions
 * @business_rule Supports both automated and manual option creation
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Edit3 } from 'lucide-react';
import { NavitasParser } from './navitas-parser';
import { ManualOptionForm } from '@/components/flight/ManualOptionForm';

interface AddOptionDialogProps {
  legId: string;
}

/**
 * Add Option Dialog Component
 * 
 * @description Renders a dialog with tabs for adding flight options via Navitas parsing
 * or manual entry with AviationStack enrichment capabilities.
 * 
 * @param legId - UUID of the leg this option belongs to
 * @param onSuccess - Callback when option is successfully created
 * @returns JSX.Element - Dialog with Navitas and Manual tabs
 * 
 * @access Employee only (agent/admin)
 * @security Server actions enforce role-based access control
 * @database Creates options and option_components records
 * @business_rule Supports both automated and manual option creation
 * 
 * @example
 * ```tsx
 * <AddOptionDialog 
 *   legId="leg-uuid" 
 *   onSuccess={() => router.refresh()} 
 * />
 * ```
 */
export function AddOptionDialog({ legId }: AddOptionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('navitas');
  const router = useRouter();

  const handleSuccess = () => {
    setIsOpen(false);
    setActiveTab('navitas'); // Reset to default tab
    router.refresh(); // Refresh the page to show new options
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Option
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Flight Option
          </DialogTitle>
          <DialogDescription>
            Create a new flight option using Navitas parsing or manual entry with real-time flight data enrichment.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="navitas" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Navitas
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="navitas" className="mt-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Paste flight data from Navitas to automatically create flight options with parsed segments.
              </div>
              <NavitasParser legId={legId} onOptionCreated={handleSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Create flight options manually with segment-by-segment entry and optional AviationStack enrichment for real-time flight data.
              </div>
              <ManualOptionForm legId={legId} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
