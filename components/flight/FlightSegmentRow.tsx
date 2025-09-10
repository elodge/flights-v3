/**
 * @fileoverview Flight segment row component
 * 
 * @description Clean, readable flight segment display with airline names, times,
 * route information, and duration. Uses shadcn/ui components for consistent styling.
 * 
 * @access Client-side component
 * @security No external dependencies, pure display component
 * @business_rule Displays airline full names from airlines.json lookup
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { AirlineLogo } from "@/components/ui/airline-logo";
import { getAirlineName, getAircraftName } from "@/lib/airlines";
import { computeDurationMin, formatClock, formatDuration } from "@/lib/time";
import { normalizeSegment, NormalizedSegment, getAirlineDisplayName } from "@/lib/segmentAdapter";
import { cn } from "@/lib/utils";
import { useFlightEnrichment } from "@/hooks/use-flight-enrichment";
import { extractFlightIdentifiers } from "@/lib/enrichment";

interface FlightSegmentRowProps {
  /** Raw segment data from any source */
  segment: Record<string, unknown>;
  /** Additional CSS classes */
  className?: string;
  /** Whether this segment is selected */
  selected?: boolean;
}

/**
 * Flight segment row component
 * 
 * @description Renders a single flight segment with airline name, times, route, and duration.
 * Automatically normalizes data from different sources and formats times consistently.
 * 
 * @param segment - Raw segment data (will be normalized internally)
 * @param className - Additional CSS classes
 * @param selected - Whether this segment is currently selected
 * @returns JSX.Element - Styled segment row
 * 
 * @example
 * ```tsx
 * <FlightSegmentRow 
 *   segment={navitasSegment} 
 *   selected={true}
 * />
 * ```
 */
export function FlightSegmentRow({
  segment: raw,
  className,
  selected,
}: FlightSegmentRowProps) {
  // CONTEXT: Normalize segment data to handle different source formats
  const segment: NormalizedSegment = normalizeSegment(raw);

  // CONTEXT: Attempt flight enrichment for enhanced display
  const flightQuery = extractFlightIdentifiers({
    airline: segment.airline,
    flightNumber: segment.flightNumber,
    origin: segment.origin,
    destination: segment.destination,
  });

  const { data: enrichment, loading: enrichmentLoading } = useFlightEnrichment(flightQuery, {
    autoFetch: true,
  });

  // CONTEXT: Get airline name - prefer enrichment, fallback to airlines database
  const airlineName = enrichment?.data?.airline_name 
    || getAirlineName(segment.airline) 
    || segment.airline;
  const flightCode = `${segment.airline}${segment.flightNumber}`;
  
  // CONTEXT: Format times and calculate duration
  const dep = formatClock(segment.depTimeRaw);
  const arr = formatClock(segment.arrTimeRaw);
  const durMin = computeDurationMin(segment.depTimeRaw, segment.arrTimeRaw, segment.dayOffset ?? 0);
  const dur = formatDuration(durMin);

  // CONTEXT: Extract enriched data for display
  const enrichmentData = enrichment?.data;
  const hasEnrichmentData = enrichment?.success && enrichmentData;

  return (
    <div
      className={cn(
        "w-full rounded-lg border bg-muted/30 px-4 py-3",
        selected && "border-green-400 bg-green-50",
        className
      )}
    >
      <div className="grid grid-cols-12 items-center gap-3">
        {/* Airline + flight code + enriched info */}
        <div className="col-span-4 flex items-center gap-3">
          <AirlineLogo 
            airline={segment.airline}
            className="h-12 w-12 shrink-0"
            size={48}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-medium">{airlineName}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">{flightCode}</div>
              {hasEnrichmentData && enrichmentData.aircraft && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {getAircraftName(enrichmentData.aircraft)}
                </Badge>
              )}
              {enrichmentLoading && (
                <div className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              )}
              {hasEnrichmentData && (enrichmentData.dep_terminal || enrichmentData.arr_terminal) && (
                <div className="text-xs text-muted-foreground">
                  • {formatTerminals(enrichmentData)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Departure time and airport */}
        <div className="col-span-3 text-right">
          <div className="text-lg font-semibold tabular-nums">{dep}</div>
          <div className="text-xs text-muted-foreground">{segment.origin}</div>
        </div>
        
        {/* Arrow separator */}
        <div className="col-span-1 flex items-center justify-center text-muted-foreground">→</div>
        
        {/* Arrival time and airport */}
        <div className="col-span-3">
          <div className="text-lg font-semibold tabular-nums">{arr}</div>
          <div className="text-xs text-muted-foreground">
            {segment.destination}
            {segment.dayOffset ? ` (+${segment.dayOffset}d)` : ""}
          </div>
        </div>

        {/* Duration badge */}
        <div className="col-span-1 flex items-center justify-end">
          <Badge variant="secondary" className="whitespace-nowrap">{dur}</Badge>
        </div>
      </div>
    </div>
  );
}


/**
 * Format terminal information
 */
function formatTerminals(enrichmentData: any): string {
  if (enrichmentData.dep_terminal && enrichmentData.arr_terminal) {
    return `T${enrichmentData.dep_terminal} → T${enrichmentData.arr_terminal}`;
  } else if (enrichmentData.dep_terminal) {
    return `T${enrichmentData.dep_terminal}`;
  } else if (enrichmentData.arr_terminal) {
    return `T${enrichmentData.arr_terminal}`;
  }
  return '—';
}
