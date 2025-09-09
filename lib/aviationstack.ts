/**
 * @fileoverview AviationStack API integration utilities
 * 
 * @description Provides utilities for integrating with AviationStack API including
 * query building, response mapping, and type definitions for flight data enrichment.
 * 
 * @access Server-side and client-side (types only on client)
 * @security API keys handled server-side only
 * @database No direct database access
 * @business_rule Provides structured flight data from external API
 */

/**
 * AviationStack API response structure
 */
export interface AviationStackResponse {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: AviationStackFlight[];
}

/**
 * Raw flight data from AviationStack API
 */
export interface AviationStackFlight {
  flight_date: string;
  flight_status: string;
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    delay: number | null;
    scheduled: string;
    estimated: string;
    actual: string | null;
    estimated_runway: string | null;
    actual_runway: string | null;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    baggage: string | null;
    delay: number | null;
    scheduled: string;
    estimated: string;
    actual: string | null;
    estimated_runway: string | null;
    actual_runway: string | null;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
    codeshared: object | null;
  };
  aircraft: {
    registration: string | null;
    iata: string | null;
    icao: string | null;
    icao24: string | null;
  } | null;
  live: {
    updated: string | null;
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    direction: number | null;
    speed_horizontal: number | null;
    speed_vertical: number | null;
    is_ground: boolean | null;
  } | null;
}

/**
 * Processed flight enrichment data for client use
 */
export interface FlightEnrichmentData {
  flight_iata: string;
  flight_number: string;
  airline_name: string;
  airline_iata: string;
  status: string;
  departure: {
    airport_iata: string;
    terminal: string | null;
    gate: string | null;
    scheduled: string;
    estimated: string;
    actual: string | null;
    delay: number | null;
  };
  arrival: {
    airport_iata: string;
    terminal: string | null;
    gate: string | null;
    baggage: string | null;
    scheduled: string;
    estimated: string;
    actual: string | null;
    delay: number | null;
  };
  aircraft: {
    registration: string | null;
    type: string | null;
  } | null;
  live: {
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    speed: number | null;
  } | null;
}

/**
 * Query parameters for AviationStack API
 */
export interface AviationStackQueryParams {
  flight_iata?: string;
  airline_iata?: string;
  dep_iata?: string;
  arr_iata?: string;
  flight_number?: string;
}

/**
 * Builds AviationStack API query parameters
 * 
 * @description Converts query parameters into URLSearchParams for AviationStack API.
 * Handles both flight_iata and composite queries with proper encoding.
 * 
 * @param params - Query parameters for flight search
 * @returns URLSearchParams object for API request
 * 
 * @example
 * ```typescript
 * // Flight IATA query
 * const query = buildAviationStackQuery({ flight_iata: "UA123" });
 * 
 * // Composite query
 * const query = buildAviationStackQuery({
 *   airline_iata: "UA",
 *   dep_iata: "AMS",
 *   arr_iata: "PHL",
 *   flight_number: "123"
 * });
 * ```
 */
export function buildAviationStackQuery(params: AviationStackQueryParams): URLSearchParams {
  const query = new URLSearchParams();
  
  // Add flight_iata if provided (priority parameter)
  if (params.flight_iata) {
    query.set('flight_iata', params.flight_iata);
  } else {
    // Add composite query parameters
    if (params.airline_iata) {
      query.set('airline_iata', params.airline_iata);
    }
    if (params.dep_iata) {
      query.set('dep_iata', params.dep_iata);
    }
    if (params.arr_iata) {
      query.set('arr_iata', params.arr_iata);
    }
    if (params.flight_number) {
      query.set('flight_number', params.flight_number);
    }
  }
  
  // Add default parameters
  query.set('limit', '1'); // Only need first result
  
  return query;
}

/**
 * Maps AviationStack flight data to enrichment format
 * 
 * @description Transforms raw AviationStack API response into structured
 * flight enrichment data for client consumption. Handles null values
 * and provides fallbacks for missing data.
 * 
 * @param flight - Raw flight data from AviationStack API
 * @returns Processed flight enrichment data
 * 
 * @example
 * ```typescript
 * const response: AviationStackResponse = await fetch(apiUrl).then(r => r.json());
 * const enrichmentData = mapAvsItem(response.data[0]);
 * ```
 */
export function mapAvsItem(flight: AviationStackFlight): FlightEnrichmentData {
  return {
    flight_iata: flight.flight.iata || `${flight.airline.iata}${flight.flight.number}`,
    flight_number: flight.flight.number,
    airline_name: flight.airline.name,
    airline_iata: flight.airline.iata,
    status: flight.flight_status,
    departure: {
      airport_iata: flight.departure.iata,
      terminal: flight.departure.terminal,
      gate: flight.departure.gate,
      scheduled: flight.departure.scheduled,
      estimated: flight.departure.estimated,
      actual: flight.departure.actual,
      delay: flight.departure.delay,
    },
    arrival: {
      airport_iata: flight.arrival.iata,
      terminal: flight.arrival.terminal,
      gate: flight.arrival.gate,
      baggage: flight.arrival.baggage,
      scheduled: flight.arrival.scheduled,
      estimated: flight.arrival.estimated,
      actual: flight.arrival.actual,
      delay: flight.arrival.delay,
    },
    aircraft: flight.aircraft ? {
      registration: flight.aircraft.registration,
      type: flight.aircraft.iata,
    } : null,
    live: flight.live ? {
      latitude: flight.live.latitude,
      longitude: flight.live.longitude,
      altitude: flight.live.altitude,
      speed: flight.live.speed_horizontal,
    } : null,
  };
}
