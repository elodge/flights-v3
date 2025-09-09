/**
 * @fileoverview Airlabs flight data API integration
 * 
 * @description Server-only helpers for fetching real-time flight data from Airlabs API.
 * Provides typed interfaces, query building, data mapping, and validation for flight enrichment.
 * 
 * @access Server-only (contains API key handling)
 * @security API key never exposed to client
 * @database External API integration - no direct database access
 * @business_rule Validates query parameters, maps external data to internal types
 */

import 'server-only';

/**
 * Airlabs API query parameters
 * 
 * @description Parameters for querying flight data from Airlabs API
 */
export type AirlabsQuery = {
  /** Flight IATA code (e.g., "AA100") */
  flight_iata?: string;
  /** Departure airport IATA code (e.g., "JFK") */
  dep_iata?: string;
  /** Arrival airport IATA code (e.g., "LAX") */
  arr_iata?: string;
  /** Maximum number of results (default: 1) */
  limit?: number;
};

/**
 * Enriched flight data structure
 * 
 * @description Normalized flight information from external APIs
 */
export type EnrichedFlight = {
  /** Flight IATA code */
  flight_iata?: string;
  /** Full airline name */
  airline_name?: string;
  /** Airline IATA code */
  airline_iata?: string;
  /** Aircraft type (e.g., "A320", "B738") */
  aircraft?: string | null;
  /** Flight status */
  status?: string | null;
  /** Departure airport IATA */
  dep_iata?: string;
  /** Arrival airport IATA */
  arr_iata?: string;
  /** Scheduled departure time (ISO string) */
  dep_scheduled?: string | null;
  /** Scheduled arrival time (ISO string) */
  arr_scheduled?: string | null;
  /** Departure terminal */
  dep_terminal?: string | null;
  /** Arrival terminal */
  arr_terminal?: string | null;
  /** Departure gate */
  dep_gate?: string | null;
  /** Arrival gate */
  arr_gate?: string | null;
  /** Flight duration in minutes */
  duration?: number | null;
};

/**
 * Raw Airlabs API response structure
 * 
 * @description Type definition for Airlabs API response
 */
export type AirlabsResponse = {
  response: Array<{
    flight_iata?: string;
    airline_name?: string;
    airline_iata?: string;
    aircraft_icao?: string;
    aircraft_iata?: string;
    status?: string;
    dep_iata?: string;
    arr_iata?: string;
    dep_scheduled?: string;
    arr_scheduled?: string;
    dep_terminal?: string;
    arr_terminal?: string;
    dep_gate?: string;
    arr_gate?: string;
    duration?: number;
    [key: string]: any; // Allow for additional fields
  }>;
  request?: any;
  terms?: string;
};

/**
 * Build Airlabs API query string
 * 
 * @description Constructs query parameters for Airlabs flights API endpoint
 * @param params - Query parameters
 * @returns URL-encoded query string
 * @throws Error if no valid search parameters provided
 * 
 * @example
 * ```typescript
 * const query = buildAirlabsQuery({ flight_iata: "AA100", limit: 1 });
 * // Returns: "flight_iata=AA100&limit=1&api_key=..."
 * ```
 */
export function buildAirlabsQuery(params: AirlabsQuery): string {
  // BUSINESS_RULE: Require at least one search parameter
  if (!params.flight_iata && !params.dep_iata && !params.arr_iata) {
    throw new Error('At least one of flight_iata, dep_iata, or arr_iata must be provided');
  }

  const searchParams = new URLSearchParams();

  // CONTEXT: Add defined parameters only
  if (params.flight_iata) {
    searchParams.set('flight_iata', params.flight_iata);
  }
  if (params.dep_iata) {
    searchParams.set('dep_iata', params.dep_iata);
  }
  if (params.arr_iata) {
    searchParams.set('arr_iata', params.arr_iata);
  }
  if (params.limit) {
    searchParams.set('limit', params.limit.toString());
  }

  // SECURITY: Add API key from environment
  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) {
    throw new Error('AIRLABS_API_KEY environment variable is required');
  }
  searchParams.set('api_key', apiKey);

  return searchParams.toString();
}

/**
 * Fetch flight data from Airlabs API
 * 
 * @description Makes server-side request to Airlabs flights API with error handling
 * @param params - Query parameters for flight search
 * @returns Promise resolving to raw API response
 * @throws Error on network failure, invalid response, or API errors
 * 
 * @security Server-only function, API key handled securely
 * @example
 * ```typescript
 * const response = await fetchAirlabs({ flight_iata: "AA100" });
 * ```
 */
export async function fetchAirlabs(params: AirlabsQuery): Promise<AirlabsResponse> {
  const queryString = buildAirlabsQuery(params);
  const url = `https://airlabs.co/api/v9/flights?${queryString}`;

  // CONTEXT: Server-side fetch with no caching (handled at higher level)
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Fllights-V3/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Airlabs API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // CONTEXT: Check for API-level errors in response
  if (data.error) {
    throw new Error(`Airlabs API error: ${data.error}`);
  }

  return data as AirlabsResponse;
}

/**
 * Map Airlabs response item to enriched flight data
 * 
 * @description Normalizes raw Airlabs flight data to our internal format
 * @param item - Raw flight data from Airlabs API
 * @returns Normalized enriched flight data
 * 
 * @business_rule Prefers IATA aircraft codes over ICAO, normalizes status strings
 * @example
 * ```typescript
 * const enriched = mapAirlabsItem(rawFlightData);
 * // Returns: { flight_iata: "AA100", airline_name: "American Airlines", ... }
 * ```
 */
export function mapAirlabsItem(item: any): EnrichedFlight {
  // CONTEXT: Safely extract and normalize flight data
  const enriched: EnrichedFlight = {
    flight_iata: item.flight_iata || undefined,
    airline_name: item.airline_name || undefined,
    airline_iata: item.airline_iata || undefined,
    dep_iata: item.dep_iata || undefined,
    arr_iata: item.arr_iata || undefined,
    dep_scheduled: item.dep_scheduled || null,
    arr_scheduled: item.arr_scheduled || null,
    dep_terminal: item.dep_terminal || null,
    arr_terminal: item.arr_terminal || null,
    dep_gate: item.dep_gate || null,
    arr_gate: item.arr_gate || null,
    duration: typeof item.duration === 'number' ? item.duration : null,
  };

  // BUSINESS_RULE: Prefer IATA aircraft codes, fallback to ICAO
  if (item.aircraft_iata) {
    enriched.aircraft = item.aircraft_iata;
  } else if (item.aircraft_icao) {
    enriched.aircraft = item.aircraft_icao;
  } else {
    enriched.aircraft = null;
  }

  // CONTEXT: Normalize status strings
  if (item.status) {
    enriched.status = String(item.status).toLowerCase();
  } else {
    enriched.status = null;
  }

  return enriched;
}

/**
 * Validate Airlabs query parameters
 * 
 * @description Ensures query has required parameters for successful API call
 * @param params - Query parameters to validate
 * @throws Error if validation fails
 * 
 * @business_rule At least one search parameter required
 */
export function validateAirlabsQuery(params: AirlabsQuery): void {
  if (!params.flight_iata && !params.dep_iata && !params.arr_iata) {
    throw new Error('Query must include at least one of: flight_iata, dep_iata, arr_iata');
  }

  // CONTEXT: Validate IATA code formats (3 characters for airports, alphanumeric for flights)
  if (params.dep_iata && !/^[A-Z]{3}$/.test(params.dep_iata)) {
    throw new Error('dep_iata must be a 3-letter airport code (e.g., JFK)');
  }
  if (params.arr_iata && !/^[A-Z]{3}$/.test(params.arr_iata)) {
    throw new Error('arr_iata must be a 3-letter airport code (e.g., LAX)');
  }
  if (params.flight_iata && !/^[A-Z0-9]{2,8}$/.test(params.flight_iata)) {
    throw new Error('flight_iata must be a valid flight code (e.g., AA100)');
  }
  if (params.limit && (params.limit < 1 || params.limit > 100)) {
    throw new Error('limit must be between 1 and 100');
  }
}
