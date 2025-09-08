/**
 * @fileoverview Edit Option Dialog Component
 * 
 * @description Dialog component for editing existing flight options with Navitas text editing
 * and real-time preview. Pre-populates form with existing option data and handles updates.
 * 
 * @access Employee only (agent/admin)
 * @security Role-based access control enforced by server actions
 * @database Updates records via server actions
 * @business_rule Preserves existing option structure while allowing edits
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, X, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { updateFlightOption } from '@/lib/actions/employee-actions';
import { FlightSegmentRow } from '@/components/flight/FlightSegmentRow';
import { normalizeSegment } from '@/lib/segmentAdapter';

interface EditOptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  option: {
    id: string;
    name: string;
    description: string | null;
    total_cost: number | null;
    currency: string | null;
    is_recommended: boolean;
    option_components: Array<{
      id: string;
      component_order: number;
      navitas_text: string;
    }>;
  };
  onSuccess?: () => void;
}

interface ComponentData {
  component_order: number;
  description: string;
}

/**
 * Edit Option Dialog Component
 * 
 * @description Renders a dialog for editing existing flight options with pre-populated data.
 * Allows editing of option details and Navitas components with live preview.
 * 
 * @param isOpen - Whether the dialog is open
 * @param onClose - Function to close the dialog
 * @param option - Existing option data to edit
 * @param onSuccess - Callback when option is successfully updated
 * @returns JSX.Element - Edit dialog with form and preview
 * 
 * @access Employee only (agent/admin)
 * @security Server actions enforce role-based access control
 * @database Updates options and option_components records
 * @business_rule Preserves existing data structure while allowing modifications
 * 
 * @example
 * ```tsx
 * <EditOptionDialog 
 *   isOpen={showEdit}
 *   onClose={() => setShowEdit(false)}
 *   option={selectedOption}
 *   onSuccess={() => router.refresh()} 
 * />
 * ```
 */
export function EditOptionDialog({ 
  isOpen, 
  onClose, 
  option, 
  onSuccess 
}: EditOptionDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // CONTEXT: Form state with pre-populated values from existing option
  const [formData, setFormData] = useState({
    name: option.name,
    description: option.description || '',
    total_cost: option.total_cost ? (option.total_cost / 100).toString() : '', // Convert cents to dollars
    currency: option.currency || 'USD',
    is_recommended: option.is_recommended,
  });

  // CONTEXT: Components state with existing Navitas text
  const [components, setComponents] = useState<ComponentData[]>(
    option.option_components
      .sort((a, b) => a.component_order - b.component_order)
      .map(comp => ({
        component_order: comp.component_order,
        description: comp.navitas_text,
      }))
  );

  // CONTEXT: Reset form when option changes
  useEffect(() => {
    setFormData({
      name: option.name,
      description: option.description || '',
      total_cost: option.total_cost ? (option.total_cost / 100).toString() : '',
      currency: option.currency || 'USD',
      is_recommended: option.is_recommended,
    });
    setComponents(
      option.option_components
        .sort((a, b) => a.component_order - b.component_order)
        .map(comp => ({
          component_order: comp.component_order,
          description: comp.navitas_text,
        }))
    );
  }, [option]);

  // CONTEXT: Update form field values
  const updateFormField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // CONTEXT: Add new component
  const addComponent = () => {
    const newOrder = Math.max(...components.map(c => c.component_order), 0) + 1;
    setComponents(prev => [...prev, {
      component_order: newOrder,
      description: '',
    }]);
  };

  // CONTEXT: Remove component
  const removeComponent = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  // CONTEXT: Update component
  const updateComponent = (index: number, field: string, value: string | number) => {
    setComponents(prev => prev.map((comp, i) => 
      i === index ? { ...comp, [field]: value } : comp
    ));
  };

  // CONTEXT: Move component up/down
  const moveComponent = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === components.length - 1)) {
      return;
    }

    const newComponents = [...components];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newComponents[index], newComponents[targetIndex]] = [newComponents[targetIndex], newComponents[index]];
    
    // Update component orders
    newComponents.forEach((comp, i) => {
      comp.component_order = i + 1;
    });
    
    setComponents(newComponents);
  };

  // CONTEXT: Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Option name is required');
      return;
    }

    if (components.length === 0) {
      toast.error('At least one flight component is required');
      return;
    }

    // CONTEXT: Validate components have descriptions
    const invalidComponents = components.filter(comp => !comp.description.trim());
    if (invalidComponents.length > 0) {
      toast.error('All flight components must have descriptions');
      return;
    }

    setIsSubmitting(true);

    try {
      // CONTEXT: Prepare form data for server action
      const submitFormData = new FormData();
      submitFormData.append('option_id', option.id);
      submitFormData.append('name', formData.name);
      submitFormData.append('description', formData.description);
      
      if (formData.total_cost) {
        // Convert dollars to cents
        submitFormData.append('total_cost', Math.round(parseFloat(formData.total_cost) * 100).toString());
      }
      
      submitFormData.append('currency', formData.currency);
      submitFormData.append('is_recommended', formData.is_recommended.toString());
      
      // CONTEXT: Add components with proper ordering
      const orderedComponents = components.map((comp, index) => ({
        component_order: index + 1,
        description: comp.description,
      }));
      
      submitFormData.append('components', JSON.stringify(orderedComponents));

      // CONTEXT: Call server action
      const result = await updateFlightOption(submitFormData);

      if (result.error) {
        toast.error(`Failed to update option: ${result.error}`);
        return;
      }

      toast.success('Flight option updated successfully');
      onSuccess?.();
      onClose();
      router.refresh();

    } catch (error) {
      console.error('Error updating option:', error);
      toast.error('Failed to update flight option');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Flight Option
          </DialogTitle>
          <DialogDescription>
            Modify the flight option details and components. Changes will update the existing option.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Option Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Option Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Option Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="e.g., UA 123 LAX-JFK"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => updateFormField('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_cost">Total Cost</Label>
                  <Input
                    id="total_cost"
                    type="number"
                    step="0.01"
                    value={formData.total_cost}
                    onChange={(e) => updateFormField('total_cost', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="recommended"
                    checked={formData.is_recommended}
                    onCheckedChange={(checked) => updateFormField('is_recommended', checked)}
                  />
                  <Label htmlFor="recommended">Mark as Recommended</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  placeholder="Optional notes about this option"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Flight Components */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Flight Components</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addComponent}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Component
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {components.map((component, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Component {index + 1}</Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveComponent(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveComponent(index, 'down')}
                        disabled={index === components.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComponent(index)}
                        disabled={components.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Navitas Text *</Label>
                    <Textarea
                      value={component.description}
                      onChange={(e) => updateComponent(index, 'description', e.target.value)}
                      placeholder="e.g., UA 123 LAX-JFK 15MAY 2:30P-10:45P"
                      rows={2}
                      required
                    />
                  </div>

                  {/* Preview */}
                  {component.description.trim() && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <Label className="text-xs text-muted-foreground">Preview:</Label>
                      <FlightSegmentRow segment={normalizeSegment({ navitas_text: component.description })} />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Updating...' : 'Update Option'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
