/**
 * @fileoverview Flight segment data adapter
 * 
 * @description Normalizes different segment data formats from various sources
 * (Navitas, manual options, API responses) into a consistent structure.
 * Handles field name variations and provides type safety. Supports enrichment data.
 * 
 * @access Internal utility
 * @security No external dependencies, pure data transformation
 * @business_rule Adapts to existing data structures without breaking changes
 */

import { type EnrichmentResult } from './enrichment';

/**
 * Normalized segment data structure
 * 
 * @description Standardized format for flight segment data regardless of source.
 * Includes optional enrichment data from external APIs.
 */
export type NormalizedSegment = {
  /** IATA airline code (e.g., "AA", "UA") */
  airline: string;
  /** Flight number (e.g., "1234") */
  flightNumber: string;
  /** Origin airport IATA code (e.g., "JFK") */
  origin: string;
  /** Destination airport IATA code (e.g., "LAX") */
  destination: string;
  /** Departure time in local format (e.g., "9:30A") */
  depTimeRaw?: string;
  /** Arrival time in local format (e.g., "6:40A") */
  arrTimeRaw?: string;
  /** Day offset for arrival (0, 1, 2) */
  dayOffset?: number;
  /** Enriched flight data from external APIs */
  enrichment?: EnrichmentResult | null;
};

/**
 * Extended flight segment with enrichment support
 * 
 * @description Complete flight segment structure with optional enrichment data
 */
export type FlightSegment = NormalizedSegment & {
  /** Combined flight IATA code (airline + flight number) */
  flight_iata?: string;
  /** Full airline name (from enrichment or airlines database) */
  airline_name?: string;
  /** Aircraft type from enrichment data */
  aircraft?: string | null;
  /** Flight status from enrichment data */
  status?: string | null;
  /** Terminal information from enrichment */
  terminals?: string | null;
  /** Gate information from enrichment */
  gates?: string | null;
  /** Formatted scheduled times from enrichment */
  scheduled_times?: string | null;
};

/**
 * Normalize segment data from various sources
 * 
 * @description Adapts different segment formats to NormalizedSegment structure.
 * Tries multiple field name variations to handle different data sources.
 * 
 * @param s - Raw segment data from any source
 * @returns Normalized segment with consistent field names
 * 
 * @example
 * ```typescript
 * // Navitas format
 * normalizeSegment({
 *   airline: "AA",
 *   flightNumber: "1234", 
 *   origin: "JFK",
 *   destination: "LAX",
 *   depTimeRaw: "9A",
 *   arrTimeRaw: "12P"
 * })
 * 
 * // Manual option format
 * normalizeSegment({
 *   airline_iata: "UA",
 *   flight_number: "5678",
 *   dep_iata: "LAX", 
 *   arr_iata: "SFO",
 *   dep_time_local: "2:30P",
 *   arr_time_local: "3:45P"
 * })
 * ```
 */
export function normalizeSegment(s: Record<string, unknown>): NormalizedSegment {
  // CONTEXT: Try multiple likely keys to be resilient to different data sources
  let airline = s.airline ?? s.airline_code ?? s.airline_iata ?? s.carrier ?? "";
  let flightNumber = s.flightNumber ?? s.flight_number ?? s.number ?? "";
  let origin = s.origin ?? s.from ?? s.departureAirport ?? s.dep_airport ?? s.dep_iata ?? s.dep ?? "";
  let destination = s.destination ?? s.to ?? s.arrivalAirport ?? s.arr_airport ?? s.arr_iata ?? s.arr ?? "";
  let depTimeRaw = s.depTimeRaw ?? s.departureTime ?? s.dep_time ?? s.dep_time_local ?? s.dep ?? s.dep_local;
  let arrTimeRaw = s.arrTimeRaw ?? s.arrivalTime ?? s.arr_time ?? s.arr_time_local ?? s.arr ?? s.arr_local;
  const dayOffset = s.dayOffset ?? s.plusDays ?? s.arrivalDayOffset ?? s.arrival_plus_days ?? 0;

  // CONTEXT: Fallback to parsing navitas_text if structured fields are missing
  // BUSINESS_RULE: Handle legacy data where only navitas_text is populated
  if ((!airline || !flightNumber || !origin || !destination) && s.navitas_text) {
    const navitasMatch = String(s.navitas_text).match(/^([A-Z]{2})\s*(\d+)\s+([A-Z]{3})-([A-Z]{3})\s+\d{2}[A-Z]{3}\s+([\d:]+[AP]?)-([\d:]+[AP]?)/i);
    if (navitasMatch) {
      airline = airline || navitasMatch[1];
      flightNumber = flightNumber || navitasMatch[2];
      origin = origin || navitasMatch[3];
      destination = destination || navitasMatch[4];
      depTimeRaw = depTimeRaw || navitasMatch[5];
      arrTimeRaw = arrTimeRaw || navitasMatch[6];
    }
  }

  return {
    airline: String(airline || "").toUpperCase(),
    flightNumber: String(flightNumber || ""),
    origin: String(origin || "").toUpperCase(),
    destination: String(destination || "").toUpperCase(),
    depTimeRaw: depTimeRaw ? String(depTimeRaw) : undefined,
    arrTimeRaw: arrTimeRaw ? String(arrTimeRaw) : undefined,
    dayOffset: typeof dayOffset === "number" ? dayOffset : parseInt(String(dayOffset || "0"), 10) || 0,
    enrichment: s.enrichment as EnrichmentResult | null | undefined,
  };
}

/**
 * Create flight IATA code from airline and flight number
 * 
 * @description Combines airline code and flight number into standard IATA format
 * @param airline - IATA airline code
 * @param flightNumber - Flight number
 * @returns Combined flight IATA code
 * 
 * @example
 * ```typescript
 * getFlightIata("AA", "100") // Returns: "AA100"
 * ```
 */
export function getFlightIata(airline: string, flightNumber: string): string {
  return `${airline}${flightNumber}`;
}

/**
 * Extend normalized segment with enrichment data
 * 
 * @description Adds enriched flight data and computed fields to a normalized segment
 * @param segment - Normalized segment data
 * @param enrichment - Enriched flight data from external API
 * @returns Extended flight segment with enrichment
 * 
 * @business_rule Enrichment data takes precedence over original data for display
 * @example
 * ```typescript
 * const enriched = extendWithEnrichment(segment, enrichmentData);
 * ```
 */
export function extendWithEnrichment(
  segment: NormalizedSegment, 
  enrichment: EnrichmentResult | null
): FlightSegment {
  const flightIata = getFlightIata(segment.airline, segment.flightNumber);
  
  const extended: FlightSegment = {
    ...segment,
    enrichment,
    flight_iata: flightIata,
  };

  if (enrichment?.data) {
    // CONTEXT: Use enrichment data to enhance display fields
    extended.airline_name = enrichment.data.airline_name;
    extended.aircraft = enrichment.data.aircraft;
    extended.status = enrichment.data.status;
    
    // CONTEXT: Format terminal information
    if (enrichment.data.dep_terminal && enrichment.data.arr_terminal) {
      extended.terminals = `T${enrichment.data.dep_terminal} → T${enrichment.data.arr_terminal}`;
    } else if (enrichment.data.dep_terminal) {
      extended.terminals = `T${enrichment.data.dep_terminal}`;
    } else if (enrichment.data.arr_terminal) {
      extended.terminals = `T${enrichment.data.arr_terminal}`;
    }
    
    // CONTEXT: Format gate information
    if (enrichment.data.dep_gate && enrichment.data.arr_gate) {
      extended.gates = `${enrichment.data.dep_gate} → ${enrichment.data.arr_gate}`;
    } else if (enrichment.data.dep_gate) {
      extended.gates = enrichment.data.dep_gate;
    } else if (enrichment.data.arr_gate) {
      extended.gates = enrichment.data.arr_gate;
    }
    
    // CONTEXT: Format scheduled times
    if (enrichment.data.dep_scheduled && enrichment.data.arr_scheduled) {
      const depTime = new Date(enrichment.data.dep_scheduled).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const arrTime = new Date(enrichment.data.arr_scheduled).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      extended.scheduled_times = `${depTime} → ${arrTime}`;
    }
  }

  return extended;
}

/**
 * Check if segment has enrichment data
 * 
 * @description Helper to determine if a segment has been enriched with external data
 * @param segment - Flight segment to check
 * @returns True if segment has enrichment data
 */
export function hasEnrichment(segment: NormalizedSegment | FlightSegment): boolean {
  return !!(segment.enrichment && Object.keys(segment.enrichment).length > 0);
}

/**
 * Get display name for airline
 * 
 * @description Returns enriched airline name or falls back to IATA code
 * @param segment - Flight segment
 * @returns Airline display name
 */
export function getAirlineDisplayName(segment: NormalizedSegment | FlightSegment): string {
  if ('airline_name' in segment && segment.airline_name) {
    return segment.airline_name;
  }
  if (segment.enrichment?.data?.airline_name) {
    return segment.enrichment.data.airline_name;
  }
  return segment.airline;
}
