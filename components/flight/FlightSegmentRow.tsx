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
import { getAirlineName } from "@/lib/airlines";
import { computeDurationMin, formatClock, formatDuration } from "@/lib/time";
import { normalizeSegment, NormalizedSegment } from "@/lib/segmentAdapter";
import { cn } from "@/lib/utils";

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

  // CONTEXT: Get airline name from IATA code lookup
  const airlineName = getAirlineName(segment.airline);
  const flightCode = `${segment.airline}${segment.flightNumber}`;
  
  // CONTEXT: Format times and calculate duration
  const dep = formatClock(segment.depTimeRaw);
  const arr = formatClock(segment.arrTimeRaw);
  const durMin = computeDurationMin(segment.depTimeRaw, segment.arrTimeRaw, segment.dayOffset ?? 0);
  const dur = formatDuration(durMin);

  return (
    <div
      className={cn(
        "w-full rounded-lg border bg-muted/30 px-4 py-3",
        selected && "border-green-400 bg-green-50",
        className
      )}
    >
      <div className="grid grid-cols-12 items-center gap-3">
        {/* Airline + flight code */}
        <div className="col-span-4 flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-xs font-medium flex items-center justify-center">
            {segment.airline?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{airlineName}</div>
            <div className="text-xs text-muted-foreground">{flightCode}</div>
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
