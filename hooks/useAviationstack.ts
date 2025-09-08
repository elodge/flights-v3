/**
 * @fileoverview AviationStack flight data enrichment hook
 * 
 * @description Provides a React hook for fetching flight enrichment data
 * from our internal API with in-memory caching to avoid redundant requests.
 * 
 * @access Client-side only
 * @security No direct API key exposure - uses internal API endpoint
 * @database No direct database access
 * @business_rule Maintains in-memory cache to reduce API calls
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { type FlightEnrichmentData } from '@/lib/aviationstack';

/**
 * Query parameters for flight data enrichment
 */
export interface AviationStackQuery {
  flight_iata?: string;
  airline_iata?: string;
  dep_iata?: string;
  arr_iata?: string;
  flight_number?: string;
}

/**
 * Hook return type for flight enrichment data
 */
export interface UseAviationStackResult {
  data: FlightEnrichmentData | null;
  loading: boolean;
  error: string | null;
}

/**
 * In-memory cache for flight enrichment data
 * Key: serialized query parameters
 * Value: { data, timestamp }
 */
const cache = new Map<string, { data: FlightEnrichmentData; timestamp: number }>();

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Serializes query parameters into a cache key
 * 
 * @description Creates a consistent cache key from query parameters
 * to enable efficient caching and deduplication.
 * 
 * @param query - Flight query parameters
 * @returns Serialized cache key
 * 
 * @example
 * ```typescript
 * const key = serializeQuery({ flight_iata: "UA123" });
 * // Returns: "flight_iata=UA123"
 * ```
 */
function serializeQuery(query: AviationStackQuery): string {
  const params = new URLSearchParams();
  
  if (query.flight_iata) params.set('flight_iata', query.flight_iata);
  if (query.airline_iata) params.set('airline_iata', query.airline_iata);
  if (query.dep_iata) params.set('dep_iata', query.dep_iata);
  if (query.arr_iata) params.set('arr_iata', query.arr_iata);
  if (query.flight_number) params.set('flight_number', query.flight_number);
  
  return params.toString();
}

/**
 * Checks if cached data is still valid
 * 
 * @description Validates cache entries based on timestamp to ensure
 * data freshness and prevent stale data usage.
 * 
 * @param timestamp - Cache entry timestamp
 * @returns True if cache entry is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * React hook for fetching flight enrichment data
 * 
 * @description Provides flight data enrichment with automatic caching,
 * loading states, and error handling. Uses our internal API endpoint
 * to avoid exposing AviationStack credentials to the client.
 * 
 * @param query - Flight query parameters (flight_iata or composite query)
 * @returns Object with data, loading state, and error information
 * 
 * @security Uses internal API endpoint, no direct external API calls
 * @business_rule Maintains in-memory cache to reduce API calls
 * 
 * @example
 * ```typescript
 * // Using flight IATA
 * const { data, loading, error } = useAviationStack({ 
 *   flight_iata: "UA123" 
 * });
 * 
 * // Using composite query
 * const { data, loading, error } = useAviationStack({
 *   airline_iata: "UA",
 *   dep_iata: "AMS", 
 *   arr_iata: "PHL",
 *   flight_number: "123"
 * });
 * ```
 */
export function useAviationStack(query: AviationStackQuery): UseAviationStackResult {
  const [data, setData] = useState<FlightEnrichmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchFlightData = useCallback(async (queryParams: AviationStackQuery) => {
    // BUSINESS_RULE: Check cache first to avoid redundant API calls
    const cacheKey = serializeQuery(queryParams);
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }
    
    // CONTEXT: Validate query parameters
    if (!queryParams.flight_iata && !queryParams.airline_iata && 
        !queryParams.dep_iata && !queryParams.arr_iata && !queryParams.flight_number) {
      setError('Invalid query parameters');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // CONTEXT: Build API URL with query parameters
      const apiUrl = new URL('/api/flight', window.location.origin);
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) {
          apiUrl.searchParams.set(key, value);
        }
      });
      
      console.log('Fetching flight enrichment data:', apiUrl.toString());
      
      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.data) {
        // BUSINESS_RULE: Cache successful responses
        cache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now(),
        });
        
        setData(result.data);
        setError(null);
      } else {
        throw new Error('No flight data received');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flight data';
      console.error('Error fetching flight data:', errorMessage);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // CONTEXT: Fetch data when query parameters change
  useEffect(() => {
    fetchFlightData(query);
  }, [query, fetchFlightData]);
  
  return {
    data,
    loading,
    error,
  };
}

