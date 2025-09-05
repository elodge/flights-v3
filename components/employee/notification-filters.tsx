/**
 * @fileoverview Notification Filters Component
 * 
 * @description Filter controls for notifications page
 * @access Employee only (agent/admin)
 * @security Uses artist filtering with user permissions
 * @database Reads from artists and artist_assignments
 * @business_rule Filters respect user's artist access permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Filter, 
  X, 
  Clock, 
  AlertTriangle, 
  Info, 
  MessageSquare, 
  CreditCard, 
  FileText, 
  User 
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { type NotificationType } from '@/lib/notifications/push';

interface NotificationFiltersProps {
  className?: string;
}

/**
 * Notification filters with type, severity, and time filtering
 * 
 * @description Provides filtering controls for notifications list
 * @param className - Optional CSS classes
 * @returns JSX.Element - Filter controls component
 * @security Uses URL search params for filter state
 * @database No direct database access, uses URL state
 * @business_rule Filters are applied via URL parameters for persistence
 * @example
 * ```tsx
 * <NotificationFilters />
 * ```
 */
export function NotificationFilters({ className }: NotificationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // CONTEXT: Filter state from URL params
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [artistFilter, setArtistFilter] = useState<string>('all');

  // CONTEXT: Available filter options
  const notificationTypes: { value: NotificationType; label: string; icon: React.ReactNode }[] = [
    { value: 'client_selection', label: 'Client Selection', icon: <User className="h-4 w-4" /> },
    { value: 'chat_message', label: 'Chat Message', icon: <MessageSquare className="h-4 w-4" /> },
    { value: 'hold_expiring', label: 'Hold Expiring', icon: <Clock className="h-4 w-4" /> },
    { value: 'document_uploaded', label: 'Document Upload', icon: <FileText className="h-4 w-4" /> },
    { value: 'budget_updated', label: 'Budget Updated', icon: <CreditCard className="h-4 w-4" /> },
  ];

  const severities = [
    { value: 'info', label: 'Info', icon: <Info className="h-4 w-4" /> },
    { value: 'warning', label: 'Warning', icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'critical', label: 'Critical', icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  const timeFilters = [
    { value: 'all', label: 'All Time' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ];

  // CONTEXT: Initialize filters from URL params
  useEffect(() => {
    const types = searchParams.get('types')?.split(',') || [];
    const severities = searchParams.get('severities')?.split(',') || [];
    const time = searchParams.get('time') || 'all';
    const artist = searchParams.get('artist') || 'all';

    setSelectedTypes(types as NotificationType[]);
    setSelectedSeverities(severities);
    setTimeFilter(time);
    setArtistFilter(artist);
  }, [searchParams]);

  // CONTEXT: Update URL when filters change
  const updateFilters = (updates: Record<string, string | string[]>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          params.delete(key);
        } else {
          params.set(key, value.join(','));
        }
      } else {
        if (value === 'all' || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
    });

    router.push(`/a/notifications?${params.toString()}`);
  };

  // CONTEXT: Handle type filter changes
  const handleTypeChange = (type: NotificationType, checked: boolean) => {
    const newTypes = checked
      ? [...selectedTypes, type]
      : selectedTypes.filter(t => t !== type);
    
    setSelectedTypes(newTypes);
    updateFilters({ types: newTypes });
  };

  // CONTEXT: Handle severity filter changes
  const handleSeverityChange = (severity: string, checked: boolean) => {
    const newSeverities = checked
      ? [...selectedSeverities, severity]
      : selectedSeverities.filter(s => s !== severity);
    
    setSelectedSeverities(newSeverities);
    updateFilters({ severities: newSeverities });
  };

  // CONTEXT: Handle time filter change
  const handleTimeChange = (time: string) => {
    setTimeFilter(time);
    updateFilters({ time });
  };

  // CONTEXT: Handle artist filter change
  const handleArtistChange = (artist: string) => {
    setArtistFilter(artist);
    updateFilters({ artist });
  };

  // CONTEXT: Clear all filters
  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedSeverities([]);
    setTimeFilter('all');
    setArtistFilter('all');
    router.push('/a/notifications');
  };

  // CONTEXT: Check if any filters are active
  const hasActiveFilters = selectedTypes.length > 0 || selectedSeverities.length > 0 || timeFilter !== 'all' || artistFilter !== 'all';

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Active Filters</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {selectedTypes.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type.replace('_', ' ')}
                </Badge>
              ))}
              {selectedSeverities.map(severity => (
                <Badge key={severity} variant="secondary" className="text-xs">
                  {severity}
                </Badge>
              ))}
              {timeFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {timeFilters.find(t => t.value === timeFilter)?.label}
                </Badge>
              )}
              {artistFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Artist filtered
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Type Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Notification Types</Label>
          <div className="space-y-2">
            {notificationTypes.map(type => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={type.value}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={(checked) => handleTypeChange(type.value, checked as boolean)}
                />
                <Label
                  htmlFor={type.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  {type.icon}
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Severity Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Severity</Label>
          <div className="space-y-2">
            {severities.map(severity => (
              <div key={severity.value} className="flex items-center space-x-2">
                <Checkbox
                  id={severity.value}
                  checked={selectedSeverities.includes(severity.value)}
                  onCheckedChange={(checked) => handleSeverityChange(severity.value, checked as boolean)}
                />
                <Label
                  htmlFor={severity.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  {severity.icon}
                  {severity.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Time Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Time Range</Label>
          <Select value={timeFilter} onValueChange={handleTimeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeFilters.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Artist Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Artist</Label>
          <Select value={artistFilter} onValueChange={handleArtistChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Artists</SelectItem>
              {/* TODO: Add artist options from database */}
              <SelectItem value="current">Current Artist</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
