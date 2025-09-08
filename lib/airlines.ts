/**
 * @fileoverview Airline name lookup utility
 * 
 * @description Provides airline name lookup by IATA code using the airlines data.
 * Handles case-insensitive lookups and provides fallback to IATA code for unknown airlines.
 * 
 * @access Internal utility
 * @security No external dependencies, uses local data
 * @business_rule Fallback to IATA code if airline not found in database
 */

// CONTEXT: Airline data converted from JSON to TypeScript for better Turbopack compatibility
const AIRLINES = [
  { "iata": "AA", "name": "American Airlines" },
  { "iata": "UA", "name": "United Airlines" },
  { "iata": "DL", "name": "Delta Air Lines" },
  { "iata": "WN", "name": "Southwest Airlines" },
  { "iata": "B6", "name": "JetBlue Airways" },
  { "iata": "AS", "name": "Alaska Airlines, Inc." },
  { "iata": "NK", "name": "Spirit Airlines" },
  { "iata": "F9", "name": "Frontier Airlines" },
  { "iata": "HA", "name": "Hawaiian Airlines" },
  { "iata": "VX", "name": "Virgin America" }
] as const;

// CONTEXT: Create lookup map for fast IATA code to name resolution
const AIRLINE_MAP: Record<string, string> = Object.fromEntries(
  AIRLINES
    .filter((a: any) => a?.iata && a?.name)
    .map((a: any) => [String(a.iata).toUpperCase(), String(a.name)])
);

/**
 * Get airline name by IATA code
 * 
 * @description Looks up airline name from IATA code, with fallback to code itself
 * @param code - IATA airline code (e.g., "AA", "UA")
 * @returns Full airline name or IATA code if not found
 * 
 * @example
 * ```typescript
 * getAirlineName("AA") // "American Airlines"
 * getAirlineName("UA") // "United Airlines"
 * getAirlineName("UNKNOWN") // "UNKNOWN"
 * ```
 */
export function getAirlineName(code?: string | null): string {
  if (!code) return "";
  const key = String(code).toUpperCase();
  return AIRLINE_MAP[key] ?? key;
}
