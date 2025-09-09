/**
 * @fileoverview Flight enrichment React hook
 * 
 * @description Custom hook for fetching and managing enriched flight data in React components.
 * Handles loading states, error handling, and caching for flight enrichment API calls.
 * 
 * @access Client-side React components
 * @security Uses API routes, no direct external API access
 * @business_rule Graceful degradation when enrichment fails
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { enrichFlight, extractFlightIdentifiers, type EnrichmentQuery, type EnrichmentResult } from '@/lib/enrichment';

/**
 * Hook state for flight enrichment
 */
interface UseFlightEnrichmentState {
  /** Enriched flight data */
  data: EnrichmentResult | null;
  /** Loading state */
  loading: boolean;
  /** Error message if enrichment failed */
  error: string | null;
  /** Function to manually refresh enrichment */
  refresh: () => Promise<void>;
  /** Function to clear current enrichment */
  clear: () => void;
}

/**
 * Options for flight enrichment hook
 */
interface UseFlightEnrichmentOptions {
  /** Whether to automatically fetch on mount */
  autoFetch?: boolean;
  /** Whether to retry on failure */
  retryOnError?: boolean;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

/**
 * Custom hook for flight enrichment
 * 
 * @description Fetches enriched flight data with loading states and error handling
 * @param query - Flight search parameters or raw flight data
 * @param options - Hook configuration options
 * @returns Enrichment state and control functions
 * 
 * @example
 * ```typescript
 * const { data, loading, error, refresh } = useFlightEnrichment({
 *   flight_iata: "AA100"
 * });
 * 
 * // With auto-extraction from component data
 * const { data, loading } = useFlightEnrichment(optionComponent, {
 *   autoFetch: true
 * });
 * ```
 */
export function useFlightEnrichment(
  query: EnrichmentQuery | Record<string, any> | null,
  options: UseFlightEnrichmentOptions = {}
): UseFlightEnrichmentState {
  const {
    autoFetch = true,
    retryOnError = false,
    debounceMs = 300,
  } = options;

  const [data, setData] = useState<EnrichmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CONTEXT: Normalize query from various input formats
  const normalizedQuery = query
    ? ('flight_iata' in query || 'dep_iata' in query || 'arr_iata' in query)
      ? query as EnrichmentQuery
      : extractFlightIdentifiers(query)
    : null;

  // CONTEXT: Check if query has required parameters
  const hasValidQuery = normalizedQuery && (
    normalizedQuery.flight_iata ||
    normalizedQuery.dep_iata ||
    normalizedQuery.arr_iata
  );

  /**
   * Fetch enriched flight data
   */
  const fetchEnrichment = useCallback(async () => {
    if (!hasValidQuery || !normalizedQuery) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await enrichFlight(normalizedQuery);
      setData(result);
      
      if (!result.success) {
        setError(result.error || 'Enrichment failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      setData({
        data: null,
        source: 'airlabs',
        success: false,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [hasValidQuery, normalizedQuery]);

  /**
   * Refresh enrichment data
   */
  const refresh = useCallback(async () => {
    await fetchEnrichment();
  }, [fetchEnrichment]);

  /**
   * Clear enrichment data
   */
  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // CONTEXT: Auto-fetch on mount and query changes
  useEffect(() => {
    if (!autoFetch) return;

    const timeoutId = setTimeout(() => {
      fetchEnrichment();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [autoFetch, fetchEnrichment, debounceMs]);

  // CONTEXT: Retry on error if enabled
  useEffect(() => {
    if (!retryOnError || !error || loading) return;

    const retryTimeoutId = setTimeout(() => {
      fetchEnrichment();
    }, 2000); // Retry after 2 seconds

    return () => clearTimeout(retryTimeoutId);
  }, [retryOnError, error, loading, fetchEnrichment]);

  return {
    data,
    loading,
    error,
    refresh,
    clear,
  };
}

/**
 * Batch flight enrichment hook
 * 
 * @description Enriches multiple flights efficiently with shared loading state
 * @param queries - Array of flight search parameters
 * @param options - Hook configuration options
 * @returns Batch enrichment state
 */
export function useFlightEnrichmentBatch(
  queries: (EnrichmentQuery | Record<string, any>)[],
  options: UseFlightEnrichmentOptions = {}
) {
  const { autoFetch = true } = options;
  
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CONTEXT: Normalize all queries
  const normalizedQueries = queries.map(query => 
    ('flight_iata' in query || 'dep_iata' in query || 'arr_iata' in query)
      ? query as EnrichmentQuery
      : extractFlightIdentifiers(query)
  );

  const fetchBatch = useCallback(async () => {
    if (normalizedQueries.length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // CONTEXT: Execute enrichment requests in parallel
      const batchResults = await Promise.all(
        normalizedQueries.map(query => enrichFlight(query))
      );
      
      setResults(batchResults);
      
      // CONTEXT: Set error if any enrichment failed
      const failedResults = batchResults.filter(result => !result.success);
      if (failedResults.length > 0) {
        setError(`${failedResults.length} enrichments failed`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch enrichment failed';
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [normalizedQueries]);

  useEffect(() => {
    if (autoFetch) {
      fetchBatch();
    }
  }, [autoFetch, fetchBatch]);

  return {
    results,
    loading,
    error,
    refresh: fetchBatch,
  };
}
