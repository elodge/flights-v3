/**
 * @fileoverview Flight enrichment service for server-side enrichment
 * 
 * @description Server-side service for enriching flight data during option creation.
 * Fetches enrichment data from Airlabs API and stores it in the database.
 * 
 * @access Server-only
 * @security API key handled securely, rate limiting implemented
 * @business_rule Enrich flight data once during creation, store for display
 */

import 'server-only';
import { fetchAirlabs, mapAirlabsItem, validateAirlabsQuery, type AirlabsQuery } from '@/lib/airlabs';
import { getCached, setCached, consumeToken } from '@/lib/airlabs-cache';
import { getAircraftName } from '@/lib/airlines';

/**
 * Enriched flight data structure for database storage
 */
export interface EnrichedFlightData {
  /** Aircraft type code (e.g., B788, A319) */
  aircraft_type?: string | null;
  /** Full aircraft name (e.g., Boeing 787-8 Dreamliner) */
  aircraft_name?: string | null;
  /** Flight status (e.g., scheduled, delayed, cancelled) */
  status?: string | null;
  /** Departure terminal */
  dep_terminal?: string | null;
  /** Arrival terminal */
  arr_terminal?: string | null;
  /** Departure gate */
  dep_gate?: string | null;
  /** Arrival gate */
  arr_gate?: string | null;
  /** Scheduled departure time */
  dep_scheduled?: Date | null;
  /** Scheduled arrival time */
  arr_scheduled?: Date | null;
  /** Flight duration in minutes */
  duration?: number | null;
  /** Source of enrichment data */
  source?: string;
  /** When enrichment was fetched */
  fetched_at?: Date;
}

/**
 * Enrich a single flight segment with external data
 * 
 * @description Fetches enrichment data for a flight segment and returns structured data
 * @param flightNumber - Flight number (e.g., "AA204")
 * @param airlineIata - Airline IATA code (e.g., "AA")
 * @param depIata - Departure airport IATA code (e.g., "PHL")
 * @param arrIata - Arrival airport IATA code (e.g., "AMS")
 * @returns Enriched flight data or null if not available
 * 
 * @security Server-only, respects rate limits
 * @business_rule Cache results to prevent repeated API calls
 * 
 * @example
 * ```typescript
 * const enriched = await enrichFlightSegment("AA204", "AA", "PHL", "AMS");
 * if (enriched) {
 *   // Use enriched.aircraft_name, enriched.dep_terminal, etc.
 * }
 * ```
 */
export async function enrichFlightSegment(
  flightNumber: string,
  airlineIata: string,
  depIata: string,
  arrIata: string
): Promise<EnrichedFlightData | null> {
  try {
    // CONTEXT: Check if API key is configured
    if (!process.env.AIRLABS_API_KEY) {
      console.log('AIRLABS_API_KEY not configured, skipping enrichment');
      return null;
    }

    // CONTEXT: Build query parameters for Airlabs API
    const query: AirlabsQuery = {
      flight_iata: `${airlineIata}${flightNumber}`,
      dep_iata: depIata,
      arr_iata: arrIata,
      limit: 1,
    };

    // BUSINESS_RULE: Validate query parameters
    try {
      validateAirlabsQuery(query);
    } catch (validationError) {
      console.log('Invalid query parameters for enrichment:', validationError);
      return null;
    }

    // CONTEXT: Check cache first
    const cached = getCached(query);
    if (cached !== null) {
      return mapEnrichedData(cached);
    }

    // SECURITY: Check rate limiting
    if (!consumeToken()) {
      console.log('Rate limit exceeded for enrichment, skipping');
      return null;
    }

    // CONTEXT: Fetch from Airlabs API
    let apiResponse;
    try {
      apiResponse = await fetchAirlabs(query);
    } catch (apiError) {
      console.log('Airlabs API error during enrichment:', apiError);
      // FALLBACK: Cache null result to prevent repeated failures
      setCached(query, null);
      return null;
    }

    // CONTEXT: Process API response
    if (!apiResponse.response || apiResponse.response.length === 0) {
      console.log('No enrichment data found for flight:', `${airlineIata}${flightNumber}`);
      // BUSINESS_RULE: Cache "not found" results to prevent repeated API calls
      setCached(query, null);
      return null;
    }

    // CONTEXT: Map first result to our format
    const enrichedFlight = mapAirlabsItem(apiResponse.response[0]);
    
    // CONTEXT: Cache successful result
    setCached(query, enrichedFlight);

    return mapEnrichedData(enrichedFlight);

  } catch (error) {
    console.error('Error enriching flight segment:', error);
    return null;
  }
}

/**
 * Map Airlabs enriched flight data to our database structure
 * 
 * @description Converts Airlabs API response to our enrichment data structure
 * @param enrichedFlight - Enriched flight data from Airlabs
 * @returns Structured enrichment data for database storage
 */
function mapEnrichedData(enrichedFlight: any): EnrichedFlightData {
  return {
    aircraft_type: enrichedFlight.aircraft || null,
    aircraft_name: enrichedFlight.aircraft ? getAircraftName(enrichedFlight.aircraft) : null,
    status: enrichedFlight.status || null,
    dep_terminal: enrichedFlight.dep_terminal || null,
    arr_terminal: enrichedFlight.arr_terminal || null,
    dep_gate: enrichedFlight.dep_gate || null,
    arr_gate: enrichedFlight.arr_gate || null,
    dep_scheduled: enrichedFlight.dep_scheduled ? new Date(enrichedFlight.dep_scheduled) : null,
    arr_scheduled: enrichedFlight.arr_scheduled ? new Date(enrichedFlight.arr_scheduled) : null,
    duration: enrichedFlight.duration || null,
    source: 'airlabs',
    fetched_at: new Date(),
  };
}

/**
 * Enrich multiple flight segments in batch
 * 
 * @description Enriches multiple flight segments with rate limiting and error handling
 * @param segments - Array of flight segments to enrich
 * @returns Array of enriched data (null for failed enrichments)
 * 
 * @business_rule Process segments sequentially to respect rate limits
 * @example
 * ```typescript
 * const segments = [
 *   { flightNumber: "AA204", airlineIata: "AA", depIata: "PHL", arrIata: "AMS" },
 *   { flightNumber: "UA123", airlineIata: "UA", depIata: "JFK", arrIata: "LAX" }
 * ];
 * const enriched = await enrichFlightSegments(segments);
 * ```
 */
export async function enrichFlightSegments(
  segments: Array<{
    flightNumber: string;
    airlineIata: string;
    depIata: string;
    arrIata: string;
  }>
): Promise<Array<EnrichedFlightData | null>> {
  const results: Array<EnrichedFlightData | null> = [];
  
  // CONTEXT: Process segments sequentially to respect rate limits
  for (const segment of segments) {
    const enriched = await enrichFlightSegment(
      segment.flightNumber,
      segment.airlineIata,
      segment.depIata,
      segment.arrIata
    );
    results.push(enriched);
    
    // CONTEXT: Small delay between requests to be respectful to API
    if (segments.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
