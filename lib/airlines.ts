/**
 * @fileoverview Airline name lookup utility
 * 
 * @description Provides airline name lookup by IATA code using the airlines.json data.
 * Handles case-insensitive lookups and provides fallback to IATA code for unknown airlines.
 * 
 * @access Internal utility
 * @security No external dependencies, uses local JSON data
 * @business_rule Fallback to IATA code if airline not found in database
 */

import airlines from "@/lib/airlines.json";

// CONTEXT: Create lookup map from airlines.json for fast IATA code to name resolution
const AIRLINE_MAP: Record<string, string> = Array.isArray(airlines)
  ? Object.fromEntries(
      airlines
        .filter((a: any) => a?.iata && a?.name)
        .map((a: any) => [String(a.iata).toUpperCase(), String(a.name)])
    )
  : {};

/**
 * Get airline name by IATA code
 * 
 * @description Looks up airline name from IATA code, with fallback to code itself
 * @param code - IATA airline code (e.g., "AA", "UA", "DL")
 * @returns Full airline name or IATA code if not found
 * 
 * @example
 * ```typescript
 * getAirlineName("AA") // "American Airlines"
 * getAirlineName("UNKNOWN") // "UNKNOWN"
 * getAirlineName(null) // ""
 * ```
 */
export function getAirlineName(code?: string | null): string {
  if (!code) return "";
  const key = String(code).toUpperCase();
  return AIRLINE_MAP[key] ?? key; // fall back to IATA code if unknown
}
