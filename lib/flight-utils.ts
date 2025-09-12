/**
 * @fileoverview Flight utility functions for compact leg management
 * 
 * @description Utility functions for flight data processing and normalization.
 * These are pure functions that don't require server context.
 * 
 * @access Internal utility
 * @security No external dependencies, pure functions
 * @business_rule Provides consistent flight key generation for grouping
 */

/**
 * Creates a normalized flight key for grouping identical flights
 * 
 * @description Generates a consistent key for flights based on airline, flight number,
 * date, and airports. Used for grouping identical flights in the By Flight view.
 * 
 * @param flightData - Flight data object with airline, flightNumber, depDate, depIata, arrIata
 * @returns string - Normalized flight key
 * 
 * @example
 * ```typescript
 * const key = createNormalizedFlightKey({
 *   airline: 'AA',
 *   flightNumber: '1234',
 *   depDate: '2024-01-15',
 *   depIata: 'LAX',
 *   arrIata: 'JFK'
 * });
 * // Returns: 'AA-1234-2024-01-15-LAX-JFK'
 * ```
 */
export function createNormalizedFlightKey(flightData: {
  airline: string
  flightNumber: string
  depDate: string
  depIata: string
  arrIata: string
}): string {
  return `${flightData.airline}-${flightData.flightNumber}-${flightData.depDate}-${flightData.depIata}-${flightData.arrIata}`
}
