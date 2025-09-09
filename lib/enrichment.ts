/**
 * @fileoverview Flight enrichment abstraction layer
 * 
 * @description Provides a unified interface for flight data enrichment from multiple providers.
 * Currently uses Airlabs as primary provider with planned AviationStack fallback.
 * 
 * @access Both client and server (client uses API routes, server uses direct calls)
 * @security Client calls go through API routes, server calls handle keys directly
 * @business_rule Try Airlabs first, add fallback providers later
 */

import { type EnrichedFlight } from './airlabs';

/**
 * Flight enrichment query parameters
 * 
 * @description Unified query parameters for flight enrichment from any provider
 */
export type EnrichmentQuery = {
  /** Flight IATA code (e.g., "AA100") */
  flight_iata?: string;
  /** Departure airport IATA code (e.g., "JFK") */
  dep_iata?: string;
  /** Arrival airport IATA code (e.g., "LAX") */
  arr_iata?: string;
  /** Maximum number of results */
  limit?: number;
};

/**
 * Enrichment result with metadata
 * 
 * @description Result from flight enrichment including source and success status
 */
export type EnrichmentResult = {
  /** Enriched flight data or null if not found */
  data: EnrichedFlight | null;
  /** Data source that provided the result */
  source: 'airlabs' | 'aviationstack' | 'cache' | 'fallback';
  /** Whether the enrichment was successful */
  success: boolean;
  /** Error message if enrichment failed */
  error?: string;
  /** Whether data came from cache */
  cached?: boolean;
};

/**
 * Client-side flight enrichment
 * 
 * @description Fetches enriched flight data via API routes (client-safe)
 * @param query - Flight search parameters
 * @returns Promise resolving to enrichment result
 * 
 * @security Uses API routes to keep external API keys secure
 * @example
 * ```typescript
 * const result = await enrichFlight({ flight_iata: "AA100" });
 * if (result.success && result.data) {
 *   console.log(`Flight: ${result.data.airline_name} ${result.data.flight_iata}`);
 * }
 * ```
 */
export async function enrichFlight(query: EnrichmentQuery): Promise<EnrichmentResult> {
  try {
    // CONTEXT: Build query string for API request
    const searchParams = new URLSearchParams();
    
    if (query.flight_iata) {
      searchParams.set('flight_iata', query.flight_iata);
    }
    if (query.dep_iata) {
      searchParams.set('dep_iata', query.dep_iata);
    }
    if (query.arr_iata) {
      searchParams.set('arr_iata', query.arr_iata);
    }
    if (query.limit) {
      searchParams.set('limit', query.limit.toString());
    }

    // CONTEXT: Primary provider - Airlabs via API route
    const response = await fetch(`/api/airlabs/flight?${searchParams.toString()}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        return {
          data: null,
          source: 'airlabs',
          success: false,
          error: 'Rate limit exceeded',
        };
      }
      
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        source: 'airlabs',
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    
    return {
      data: result.enrichment,
      source: result.source || 'airlabs',
      success: true,
      cached: result.cached,
    };

  } catch (error) {
    // FALLBACK: Handle network errors gracefully
    return {
      data: null,
      source: 'airlabs',
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Server-side flight enrichment with direct API access
 * 
 * @description Server-only enrichment with direct provider access (future implementation)
 * @param query - Flight search parameters
 * @returns Promise resolving to enrichment result
 * 
 * @security Server-only, can access API keys directly
 * @access Server components and API routes only
 * 
 * TODO: Implement direct server-side enrichment with fallback chain:
 * 1. Try Airlabs API directly (bypassing cache for server components)
 * 2. Fallback to AviationStack if Airlabs fails
 * 3. Return combined result with source tracking
 */
export async function enrichFlightServer(query: EnrichmentQuery): Promise<EnrichmentResult> {
  // TODO: Direct server-side implementation
  // For now, use client method (which uses API routes)
  return enrichFlight(query);
}

/**
 * Batch flight enrichment
 * 
 * @description Enriches multiple flights efficiently with deduplication
 * @param queries - Array of flight search parameters
 * @returns Promise resolving to array of enrichment results
 * 
 * @business_rule Deduplicate identical queries, maintain result order
 * @example
 * ```typescript
 * const results = await enrichFlightsBatch([
 *   { flight_iata: "AA100" },
 *   { flight_iata: "UA200" }
 * ]);
 * ```
 */
export async function enrichFlightsBatch(queries: EnrichmentQuery[]): Promise<EnrichmentResult[]> {
  // CONTEXT: Deduplicate queries by creating a map
  const uniqueQueries = new Map<string, EnrichmentQuery>();
  const queryIndexes = new Map<string, number[]>();

  queries.forEach((query, index) => {
    const key = JSON.stringify(query);
    uniqueQueries.set(key, query);
    
    if (!queryIndexes.has(key)) {
      queryIndexes.set(key, []);
    }
    queryIndexes.get(key)!.push(index);
  });

  // CONTEXT: Execute unique queries in parallel
  const uniqueResults = await Promise.all(
    Array.from(uniqueQueries.values()).map(query => enrichFlight(query))
  );

  // CONTEXT: Map results back to original query order
  const results: EnrichmentResult[] = new Array(queries.length);
  
  Array.from(uniqueQueries.keys()).forEach((key, uniqueIndex) => {
    const result = uniqueResults[uniqueIndex];
    const indexes = queryIndexes.get(key)!;
    
    indexes.forEach(originalIndex => {
      results[originalIndex] = result;
    });
  });

  return results;
}

/**
 * Extract flight identifiers from various data sources
 * 
 * @description Helps extract flight_iata and airport codes from different data formats
 * @param data - Flight data from various sources (Navitas, manual entry, etc.)
 * @returns Normalized query parameters for enrichment
 * 
 * @business_rule Handle multiple data formats, prefer specific over generic fields
 * @example
 * ```typescript
 * const query = extractFlightIdentifiers({
 *   airline: "AA",
 *   flightNumber: "100",
 *   origin: "JFK",
 *   destination: "LAX"
 * });
 * // Returns: { flight_iata: "AA100", dep_iata: "JFK", arr_iata: "LAX" }
 * ```
 */
export function extractFlightIdentifiers(data: Record<string, any>): EnrichmentQuery {
  const query: EnrichmentQuery = {};

  // CONTEXT: Try to build flight_iata from airline + flight number
  if (data.airline_iata && data.flight_number) {
    query.flight_iata = `${data.airline_iata}${data.flight_number}`;
  } else if (data.airline && data.flightNumber) {
    query.flight_iata = `${data.airline}${data.flightNumber}`;
  } else if (data.flight_iata) {
    query.flight_iata = data.flight_iata;
  }

  // CONTEXT: Extract airport codes
  if (data.dep_iata) {
    query.dep_iata = data.dep_iata;
  } else if (data.origin) {
    query.dep_iata = data.origin;
  }

  if (data.arr_iata) {
    query.arr_iata = data.arr_iata;
  } else if (data.destination) {
    query.arr_iata = data.destination;
  }

  return query;
}

/**
 * Format enriched flight data for display
 * 
 * @description Creates user-friendly display strings from enriched flight data
 * @param enrichment - Enriched flight data
 * @returns Formatted display object
 * 
 * @business_rule Graceful fallbacks for missing data, consistent formatting
 * @example
 * ```typescript
 * const display = formatEnrichment(enrichedFlight);
 * // Returns: { 
 * //   airline: "American Airlines",
 * //   flight: "AA100",
 * //   aircraft: "A321",
 * //   route: "JFK → LAX",
 * //   status: "On Time"
 * // }
 * ```
 */
export function formatEnrichment(enrichment: EnrichedFlight | null) {
  if (!enrichment) {
    return {
      airline: null,
      flight: null,
      aircraft: null,
      route: null,
      status: null,
      terminals: null,
      gates: null,
      times: null,
    };
  }

  return {
    airline: enrichment.airline_name || null,
    flight: enrichment.flight_iata || null,
    aircraft: enrichment.aircraft || null,
    route: enrichment.dep_iata && enrichment.arr_iata 
      ? `${enrichment.dep_iata} → ${enrichment.arr_iata}` 
      : null,
    status: enrichment.status ? formatStatus(enrichment.status) : null,
    terminals: formatTerminals(enrichment),
    gates: formatGates(enrichment),
    times: formatTimes(enrichment),
  };
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
 * Format terminal information for display
 */
function formatTerminals(enrichment: EnrichedFlight): string | null {
  if (enrichment.dep_terminal && enrichment.arr_terminal) {
    return `T${enrichment.dep_terminal} → T${enrichment.arr_terminal}`;
  } else if (enrichment.dep_terminal) {
    return `T${enrichment.dep_terminal} → —`;
  } else if (enrichment.arr_terminal) {
    return `— → T${enrichment.arr_terminal}`;
  }
  return null;
}

/**
 * Format gate information for display
 */
function formatGates(enrichment: EnrichedFlight): string | null {
  if (enrichment.dep_gate && enrichment.arr_gate) {
    return `${enrichment.dep_gate} → ${enrichment.arr_gate}`;
  } else if (enrichment.dep_gate) {
    return `${enrichment.dep_gate} → —`;
  } else if (enrichment.arr_gate) {
    return `— → ${enrichment.arr_gate}`;
  }
  return null;
}

/**
 * Format scheduled times for display
 */
function formatTimes(enrichment: EnrichedFlight): string | null {
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
  }
  return null;
}
