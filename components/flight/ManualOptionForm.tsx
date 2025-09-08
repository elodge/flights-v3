/**
 * @fileoverview Manual Flight Option Form Component
 * 
 * @description Form component for creating manual flight options with segment editing,
 * AviationStack enrichment, and live preview. Supports multiple segments with
 * terminal/gate information and estimated times.
 * 
 * @access Employee only (agent/admin)
 * @security Role-based access control enforced by server actions
 * @database Creates records via server actions
 * @business_rule Manual options can have multiple segments with enrichment data
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ArrowUp, ArrowDown, Plane, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { createManualFlightOption, type SegmentInput } from '@/lib/actions/manual-flight-options';
import { useAviationStack } from '@/hooks/useAviationstack';

interface ManualOptionFormProps {
  legId: string;
}

interface SegmentFormData extends SegmentInput {
  id: string;
  enrichedData?: any;
  isEnriching?: boolean;
}

const CLASS_OF_SERVICE_OPTIONS = [
  { value: 'Economy', label: 'Economy' },
  { value: 'Premium Economy', label: 'Premium Economy' },
  { value: 'Business', label: 'Business' },
  { value: 'First', label: 'First' },
  { value: 'Other', label: 'Other' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
];

/**
 * Manual Flight Option Form Component
 * 
 * @description Renders a form for creating manual flight options with segment editing,
 * AviationStack enrichment, and live preview functionality.
 * 
 * @param legId - UUID of the leg this option belongs to
 * @param onSuccess - Callback when option is successfully created
 * @returns JSX.Element - Complete form with segment editor and preview
 * 
 * @access Employee only (agent/admin)
 * @security Server actions enforce role-based access control
 * @database Creates options and option_components records
 * @business_rule Supports multiple segments with enrichment data
 * 
 * @example
 * ```tsx
 * <ManualOptionForm 
 *   legId="leg-uuid" 
 *   onSuccess={() => router.refresh()} 
 * />
 * ```
 */
export function ManualOptionForm({ legId }: ManualOptionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    class_of_service: '',
    seats_available: '',
    price_total: '',
    price_currency: 'USD',
    hold_expires_at: '',
    notes: '',
    recommended: false,
    is_split: false,
  });

  const [segments, setSegments] = useState<SegmentFormData[]>([
    {
      id: '1',
      airline_iata: '',
      airline_name: '',
      flight_number: '',
      dep_iata: '',
      arr_iata: '',
      dep_time_local: '',
      arr_time_local: '',
      day_offset: 0,
      duration_minutes: null,
      stops: 0,
      enriched_terminal_gate: null,
    },
  ]);

  // CONTEXT: Update form field values
  const updateFormField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // CONTEXT: Add new segment to the form
  const addSegment = useCallback(() => {
    const newSegment: SegmentFormData = {
      id: Date.now().toString(),
      airline_iata: '',
      airline_name: '',
      flight_number: '',
      dep_iata: '',
      arr_iata: '',
      dep_time_local: '',
      arr_time_local: '',
      day_offset: 0,
      duration_minutes: null,
      stops: 0,
      enriched_terminal_gate: null,
    };
    setSegments(prev => [...prev, newSegment]);
  }, []);

  // CONTEXT: Remove segment from the form
  const removeSegment = useCallback((segmentId: string) => {
    if (segments.length > 1) {
      setSegments(prev => prev.filter(s => s.id !== segmentId));
    }
  }, [segments.length]);

  // CONTEXT: Update segment field values
  const updateSegment = useCallback((segmentId: string, field: string, value: any) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId ? { ...segment, [field]: value } : segment
    ));
  }, []);

  // CONTEXT: Reorder segments
  const moveSegment = useCallback((segmentId: string, direction: 'up' | 'down') => {
    setSegments(prev => {
      const index = prev.findIndex(s => s.id === segmentId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newSegments = [...prev];
      [newSegments[index], newSegments[newIndex]] = [newSegments[newIndex], newSegments[index]];
      return newSegments;
    });
  }, []);

  // CONTEXT: Enrich segment with AviationStack data
  const enrichSegment = useCallback(async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !segment.airline_iata || !segment.flight_number) {
      toast.error('Please fill in airline IATA and flight number first');
      return;
    }

    updateSegment(segmentId, 'isEnriching', true);

    try {
      // CONTEXT: Build AviationStack query parameters
      // SECURITY: Uses internal API proxy, never calls AviationStack directly
      const queryParams = new URLSearchParams();
      queryParams.set('flight_iata', `${segment.airline_iata}${segment.flight_number}`);
      if (segment.dep_iata) queryParams.set('dep_iata', segment.dep_iata);
      if (segment.arr_iata) queryParams.set('arr_iata', segment.arr_iata);

      const response = await fetch(`/api/flight?${queryParams.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const enrichedData = result.data;
        
        // CONTEXT: Update segment with enriched data
        // BUSINESS_RULE: Don't overwrite user input, show as preview
        updateSegment(segmentId, 'enrichedData', enrichedData);
        updateSegment(segmentId, 'enriched_terminal_gate', {
          dep_terminal: enrichedData.departure?.terminal || null,
          dep_gate: enrichedData.departure?.gate || null,
          arr_terminal: enrichedData.arrival?.terminal || null,
          arr_gate: enrichedData.arrival?.gate || null,
        });

        toast.success('Flight data enriched successfully');
      } else {
        toast.error(result.error || 'Failed to enrich flight data');
      }
    } catch (error) {
      console.error('Error enriching segment:', error);
      toast.error('Failed to enrich flight data');
    } finally {
      updateSegment(segmentId, 'isEnriching', false);
    }
  }, [segments, updateSegment]);

  // CONTEXT: Calculate day offset between departure and arrival
  const calculateDayOffset = useCallback((depTime: string, arrTime: string) => {
    if (!depTime || !arrTime) return 0;
    
    const dep = new Date(depTime);
    const arr = new Date(arrTime);
    const diffTime = arr.getTime() - dep.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }, []);

  // CONTEXT: Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Option name is required');
      return;
    }

    if (segments.some(s => !s.airline_iata || !s.flight_number || !s.dep_iata || !s.arr_iata || !s.dep_time_local || !s.arr_time_local)) {
      toast.error('All segments must have required fields filled');
      return;
    }

    setIsSubmitting(true);

    try {
      // CONTEXT: Prepare segment data for server action
      const segmentData: SegmentInput[] = segments.map(segment => ({
        airline_iata: segment.airline_iata,
        airline_name: segment.airline_name || null,
        flight_number: segment.flight_number,
        dep_iata: segment.dep_iata,
        arr_iata: segment.arr_iata,
        dep_time_local: segment.dep_time_local,
        arr_time_local: segment.arr_time_local,
        day_offset: calculateDayOffset(segment.dep_time_local, segment.arr_time_local),
        duration_minutes: segment.duration_minutes,
        stops: segment.stops,
        enriched_terminal_gate: segment.enriched_terminal_gate,
      }));

      await createManualFlightOption({
        leg_id: legId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        class_of_service: formData.class_of_service || null,
        seats_available: formData.seats_available ? parseInt(formData.seats_available) : null,
        price_total: formData.price_total ? parseFloat(formData.price_total) : null,
        price_currency: formData.price_currency,
        hold_expires_at: formData.hold_expires_at || null,
        notes: formData.notes.trim() || null,
        recommended: formData.recommended,
        segments: segmentData,
        is_split: formData.is_split,
      });

      toast.success('Flight option created successfully');
      router.refresh(); // Refresh the page to show new options
    } catch (error) {
      console.error('Error creating manual flight option:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create flight option');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="manual-option-form">
      {/* CONTEXT: Main form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Option Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateFormField('name', e.target.value)}
            placeholder="e.g., UA123 AMS-PHL"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="class_of_service">Class of Service</Label>
          <Select value={formData.class_of_service} onValueChange={(value) => updateFormField('class_of_service', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASS_OF_SERVICE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seats_available">Seats Available</Label>
          <Input
            id="seats_available"
            type="number"
            value={formData.seats_available}
            onChange={(e) => updateFormField('seats_available', e.target.value)}
            placeholder="e.g., 8"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price_total">Price (per person)</Label>
          <div className="flex gap-2">
            <Input
              id="price_total"
              type="number"
              step="0.01"
              value={formData.price_total}
              onChange={(e) => updateFormField('price_total', e.target.value)}
              placeholder="e.g., 500.00"
            />
            <Select value={formData.price_currency} onValueChange={(value) => updateFormField('price_currency', value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hold_expires_at">Hold Expires At</Label>
          <Input
            id="hold_expires_at"
            type="datetime-local"
            value={formData.hold_expires_at}
            onChange={(e) => updateFormField('hold_expires_at', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Optional; for client timing display only</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormField('description', e.target.value)}
            placeholder="Optional description"
            rows={2}
          />
        </div>
      </div>

      {/* CONTEXT: Toggle switches */}
      <div className="flex gap-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="recommended"
            checked={formData.recommended}
            onCheckedChange={(checked) => updateFormField('recommended', checked)}
          />
          <Label htmlFor="recommended">Recommended</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_split"
            checked={formData.is_split}
            onCheckedChange={(checked) => updateFormField('is_split', checked)}
          />
          <Label htmlFor="is_split">This is a split option</Label>
        </div>
      </div>

      {/* CONTEXT: Segments editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Flight Segments</h3>
          <Button type="button" onClick={addSegment} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Segment
          </Button>
        </div>

        {segments.map((segment, index) => (
          <Card key={segment.id} className="card-muted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Segment {index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  {segments.length > 1 && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveSegment(segment.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveSegment(segment.id, 'down')}
                        disabled={index === segments.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSegment(segment.id)}
                    disabled={segments.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`airline_iata_${segment.id}`}>Airline IATA *</Label>
                  <Input
                    id={`airline_iata_${segment.id}`}
                    value={segment.airline_iata}
                    onChange={(e) => updateSegment(segment.id, 'airline_iata', e.target.value.toUpperCase())}
                    placeholder="e.g., UA"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`flight_number_${segment.id}`}>Flight Number *</Label>
                  <Input
                    id={`flight_number_${segment.id}`}
                    value={segment.flight_number}
                    onChange={(e) => updateSegment(segment.id, 'flight_number', e.target.value)}
                    placeholder="e.g., 123"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`airline_name_${segment.id}`}>Airline Name</Label>
                  <Input
                    id={`airline_name_${segment.id}`}
                    value={segment.airline_name}
                    onChange={(e) => updateSegment(segment.id, 'airline_name', e.target.value)}
                    placeholder="e.g., United Airlines"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`dep_iata_${segment.id}`}>Departure IATA *</Label>
                  <Input
                    id={`dep_iata_${segment.id}`}
                    value={segment.dep_iata}
                    onChange={(e) => updateSegment(segment.id, 'dep_iata', e.target.value.toUpperCase())}
                    placeholder="e.g., AMS"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`arr_iata_${segment.id}`}>Arrival IATA *</Label>
                  <Input
                    id={`arr_iata_${segment.id}`}
                    value={segment.arr_iata}
                    onChange={(e) => updateSegment(segment.id, 'arr_iata', e.target.value.toUpperCase())}
                    placeholder="e.g., PHL"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`dep_time_${segment.id}`}>Departure Time (Local) *</Label>
                  <Input
                    id={`dep_time_${segment.id}`}
                    type="datetime-local"
                    value={segment.dep_time_local}
                    onChange={(e) => updateSegment(segment.id, 'dep_time_local', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`arr_time_${segment.id}`}>Arrival Time (Local) *</Label>
                  <Input
                    id={`arr_time_${segment.id}`}
                    type="datetime-local"
                    value={segment.arr_time_local}
                    onChange={(e) => updateSegment(segment.id, 'arr_time_local', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* CONTEXT: Enrichment section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>AviationStack Enrichment</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => enrichSegment(segment.id)}
                    disabled={!segment.airline_iata || !segment.flight_number || segment.isEnriching}
                  >
                    {segment.isEnriching ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Enriching...
                      </>
                    ) : (
                      <>
                        <Plane className="h-4 w-4 mr-2" />
                        Enrich via AviationStack
                      </>
                    )}
                  </Button>
                </div>

                {/* CONTEXT: Show enriched data preview */}
                {segment.enrichedData && (
                  <div className="p-3 bg-muted/50 rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {segment.enrichedData.flightStatus || 'Unknown'}
                      </Badge>
                      {segment.enrichedData.departure?.delayMin > 0 && (
                        <Badge variant="destructive">
                          +{segment.enrichedData.departure.delayMin}m delay
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Departure</div>
                        <div className="text-muted-foreground">
                          {segment.enrichedData.departure?.terminal && (
                            <span>Terminal {segment.enrichedData.departure.terminal}</span>
                          )}
                          {segment.enrichedData.departure?.gate && (
                            <span> • Gate {segment.enrichedData.departure.gate}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Arrival</div>
                        <div className="text-muted-foreground">
                          {segment.enrichedData.arrival?.terminal && (
                            <span>Terminal {segment.enrichedData.arrival.terminal}</span>
                          )}
                          {segment.enrichedData.arrival?.gate && (
                            <span> • Gate {segment.enrichedData.arrival.gate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CONTEXT: Notes section */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Agent Only)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateFormField('notes', e.target.value)}
          placeholder="Internal notes for agents..."
          rows={3}
        />
      </div>

      {/* CONTEXT: Submit button */}
      <div className="flex justify-end">
        <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Manual Option'}
        </Button>
      </div>
    </div>
  );
}
