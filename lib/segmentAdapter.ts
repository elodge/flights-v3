/**
 * @fileoverview Flight segment data adapter
 * 
 * @description Normalizes different segment data formats from various sources
 * (Navitas, manual options, API responses) into a consistent structure.
 * Handles field name variations and provides type safety.
 * 
 * @access Internal utility
 * @security No external dependencies, pure data transformation
 * @business_rule Adapts to existing data structures without breaking changes
 */

/**
 * Normalized segment data structure
 * 
 * @description Standardized format for flight segment data regardless of source
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
export function normalizeSegment(s: any): NormalizedSegment {
  // CONTEXT: Try multiple likely keys to be resilient to different data sources
  const airline = s.airline ?? s.airline_code ?? s.airline_iata ?? s.carrier ?? "";
  const flightNumber = s.flightNumber ?? s.flight_number ?? s.number ?? "";
  const origin = s.origin ?? s.from ?? s.departureAirport ?? s.dep_airport ?? s.dep_iata ?? s.dep ?? "";
  const destination = s.destination ?? s.to ?? s.arrivalAirport ?? s.arr_airport ?? s.arr_iata ?? s.arr ?? "";
  const depTimeRaw = s.depTimeRaw ?? s.departureTime ?? s.dep_time ?? s.dep_time_local ?? s.dep ?? s.dep_local;
  const arrTimeRaw = s.arrTimeRaw ?? s.arrivalTime ?? s.arr_time ?? s.arr_time_local ?? s.arr ?? s.arr_local;
  const dayOffset =
    s.dayOffset ??
    s.plusDays ??
    s.arrivalDayOffset ??
    s.arrival_plus_days ??
    0;

  return {
    airline: String(airline || "").toUpperCase(),
    flightNumber: String(flightNumber || ""),
    origin: String(origin || "").toUpperCase(),
    destination: String(destination || "").toUpperCase(),
    depTimeRaw: depTimeRaw ? String(depTimeRaw) : undefined,
    arrTimeRaw: arrTimeRaw ? String(arrTimeRaw) : undefined,
    dayOffset: typeof dayOffset === "number" ? dayOffset : parseInt(dayOffset || "0", 10) || 0,
  };
}
