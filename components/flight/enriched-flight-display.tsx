/**
 * @fileoverview Enriched flight display component
 * 
 * @description Reusable component for displaying flight information with enrichment data.
 * Shows airline names, aircraft types, status, terminals, and other enriched details.
 * 
 * @access Client-side component
 * @security No external dependencies, pure display component
 * @business_rule Graceful fallbacks for missing enrichment data
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plane, Clock, MapPin, Info } from 'lucide-react';
import { getAirlineName } from '@/lib/airlines';
import { type EnrichedFlight } from '@/lib/airlabs';
import { type EnrichmentResult } from '@/lib/enrichment';
import { cn } from '@/lib/utils';

/**
 * Props for enriched flight display component
 */
interface EnrichedFlightDisplayProps {
  /** Basic flight information */
  flight: {
    airline?: string;
    flightNumber?: string;
    origin?: string;
    destination?: string;
  };
  /** Enrichment data and status */
  enrichment?: EnrichmentResult | null;
  /** Whether enrichment is loading */
  loading?: boolean;
  /** Display variant */
  variant?: 'compact' | 'detailed' | 'header';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show enrichment source */
  showSource?: boolean;
}

/**
 * Enriched flight display component
 * 
 * @description Displays flight information with optional enrichment data
 * @param props - Component props
 * @returns JSX.Element - Styled flight display
 * 
 * @example
 * ```tsx
 * <EnrichedFlightDisplay 
 *   flight={{ airline: "AA", flightNumber: "100", origin: "JFK", destination: "LAX" }}
 *   enrichment={enrichmentResult}
 *   loading={false}
 *   variant="detailed"
 * />
 * ```
 */
export function EnrichedFlightDisplay({
  flight,
  enrichment,
  loading = false,
  variant = 'compact',
  className,
  showSource = false,
}: EnrichedFlightDisplayProps) {
  const flightCode = flight.airline && flight.flightNumber 
    ? `${flight.airline}${flight.flightNumber}` 
    : '';
  
  // CONTEXT: Get airline name from enrichment or fallback to airlines database
  const airlineName = enrichment?.data?.airline_name 
    || (flight.airline ? getAirlineName(flight.airline) : null)
    || flight.airline
    || '';

  // CONTEXT: Extract enrichment data safely
  const enrichmentData = enrichment?.data;
  const isEnriched = enrichment?.success && enrichmentData;

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {loading ? (
          <>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <div className="font-medium">
              {airlineName || flight.airline} {flight.flightNumber}
            </div>
            {isEnriched && enrichmentData.aircraft && (
              <Badge variant="secondary" className="text-xs">
                {enrichmentData.aircraft}
              </Badge>
            )}
            {isEnriched && enrichmentData.status && (
              <Badge 
                variant={getStatusVariant(enrichmentData.status)}
                className="text-xs"
              >
                {formatStatus(enrichmentData.status)}
              </Badge>
            )}
          </>
        )}
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={cn("space-y-1", className)}>
        {loading ? (
          <>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">
                {flightCode}
              </div>
              {isEnriched && enrichmentData.aircraft && (
                <Badge variant="secondary">
                  {enrichmentData.aircraft}
                </Badge>
              )}
              {isEnriched && enrichmentData.status && (
                <Badge variant={getStatusVariant(enrichmentData.status)}>
                  {formatStatus(enrichmentData.status)}
                </Badge>
              )}
            </div>
            
            {airlineName && (
              <div className="text-sm text-muted-foreground">
                {airlineName}
              </div>
            )}
            
            {isEnriched && (enrichmentData.dep_terminal || enrichmentData.arr_terminal) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {formatTerminals(enrichmentData)}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-3", className)}>
      {/* Main flight info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {loading ? (
            <>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{flightCode}</span>
                {isEnriched && enrichmentData.aircraft && (
                  <Badge variant="secondary">{enrichmentData.aircraft}</Badge>
                )}
              </div>
              
              {airlineName && (
                <div className="text-sm text-muted-foreground pl-6">
                  {airlineName}
                </div>
              )}
            </>
          )}
        </div>

        {/* Status */}
        {loading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          isEnriched && enrichmentData.status && (
            <Badge variant={getStatusVariant(enrichmentData.status)}>
              {formatStatus(enrichmentData.status)}
            </Badge>
          )
        )}
      </div>

      {/* Route info */}
      {(flight.origin || flight.destination) && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{flight.origin} → {flight.destination}</span>
        </div>
      )}

      {/* Enriched details */}
      {isEnriched && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          {/* Terminals */}
          {(enrichmentData.dep_terminal || enrichmentData.arr_terminal) && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>Terminals: {formatTerminals(enrichmentData)}</span>
            </div>
          )}

          {/* Gates */}
          {(enrichmentData.dep_gate || enrichmentData.arr_gate) && (
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>Gates: {formatGates(enrichmentData)}</span>
            </div>
          )}

          {/* Scheduled times */}
          {(enrichmentData.dep_scheduled || enrichmentData.arr_scheduled) && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Scheduled: {formatScheduledTimes(enrichmentData)}</span>
            </div>
          )}

          {/* Duration */}
          {enrichmentData.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Duration: {Math.floor(enrichmentData.duration / 60)}h {enrichmentData.duration % 60}m</span>
            </div>
          )}
        </div>
      )}

      {/* Source indicator */}
      {showSource && enrichment && (
        <div className="text-xs text-muted-foreground">
          {enrichment.success 
            ? `Data from ${enrichment.source}${enrichment.cached ? ' (cached)' : ''}`
            : enrichment.error 
              ? `Enrichment failed: ${enrichment.error}`
              : 'No enrichment data'
          }
        </div>
      )}
    </div>
  );
}

/**
 * Get badge variant for flight status
 */
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const lowerStatus = status.toLowerCase();
  
  if (lowerStatus.includes('cancel') || lowerStatus.includes('divert')) {
    return 'destructive';
  }
  if (lowerStatus.includes('delay')) {
    return 'outline';
  }
  if (lowerStatus.includes('land') || lowerStatus.includes('arriv')) {
    return 'secondary';
  }
  return 'default';
}

/**
 * Format flight status for display
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'scheduled': 'Scheduled',
    'active': 'Active',
    'landed': 'Landed',
    'cancelled': 'Cancelled',
    'delayed': 'Delayed',
    'diverted': 'Diverted',
  };
  
  return statusMap[status.toLowerCase()] || status;
}

/**
 * Format terminal information
 */
function formatTerminals(enrichment: EnrichedFlight): string {
  if (enrichment.dep_terminal && enrichment.arr_terminal) {
    return `T${enrichment.dep_terminal} → T${enrichment.arr_terminal}`;
  } else if (enrichment.dep_terminal) {
    return `T${enrichment.dep_terminal} → —`;
  } else if (enrichment.arr_terminal) {
    return `— → T${enrichment.arr_terminal}`;
  }
  return '—';
}

/**
 * Format gate information
 */
function formatGates(enrichment: EnrichedFlight): string {
  if (enrichment.dep_gate && enrichment.arr_gate) {
    return `${enrichment.dep_gate} → ${enrichment.arr_gate}`;
  } else if (enrichment.dep_gate) {
    return `${enrichment.dep_gate} → —`;
  } else if (enrichment.arr_gate) {
    return `— → ${enrichment.arr_gate}`;
  }
  return '—';
}

/**
 * Format scheduled times
 */
function formatScheduledTimes(enrichment: EnrichedFlight): string {
  if (enrichment.dep_scheduled && enrichment.arr_scheduled) {
    const depTime = new Date(enrichment.dep_scheduled).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const arrTime = new Date(enrichment.arr_scheduled).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${depTime} → ${arrTime}`;
  } else if (enrichment.dep_scheduled) {
    const depTime = new Date(enrichment.dep_scheduled).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${depTime} → —`;
  } else if (enrichment.arr_scheduled) {
    const arrTime = new Date(enrichment.arr_scheduled).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `— → ${arrTime}`;
  }
  return '—';
}
