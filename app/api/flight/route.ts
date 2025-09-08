/**
 * @fileoverview Flight data enrichment API endpoint
 * 
 * @description Provides flight data enrichment via AviationStack API for
 * flight option cards. Supports both flight_iata and composite queries
 * with 5-minute caching and graceful error handling.
 * 
 * @route GET /api/flight
 * @access Public (no authentication required for flight data)
 * @database No direct database access
 * @security Uses environment variables for API credentials
 * @business_rule Caches responses for 5 minutes to reduce API costs
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildAviationStackQuery, mapAvsItem, type AviationStackResponse } from '@/lib/aviationstack';

/**
 * GET handler for flight data enrichment
 * 
 * @description Fetches flight data from AviationStack API based on query parameters.
 * Supports flight_iata or composite queries (airline_iata, dep_iata, arr_iata, flight_number).
 * 
 * @param request - Next.js request object with query parameters
 * @returns Response with enriched flight data or error
 * 
 * @security Uses environment variables for API credentials
 * @database No database operations
 * @business_rule Caches responses for 5 minutes, handles API errors gracefully
 * 
 * @example
 * ```typescript
 * // Flight IATA query
 * GET /api/flight?flight_iata=UA123
 * 
 * // Composite query
 * GET /api/flight?airline_iata=UA&dep_iata=AMS&arr_iata=PHL&flight_number=123
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get API credentials from environment
    const baseUrl = process.env.AVSTACK_BASE_URL;
    const accessKey = process.env.AVSTACK_ACCESS_KEY;
    
    if (!baseUrl || !accessKey) {
      console.error('AviationStack API credentials not configured');
      return NextResponse.json(
        { error: 'Flight data service not configured' },
        { status: 503 }
      );
    }
    
    // CONTEXT: Extract query parameters
    const { searchParams } = new URL(request.url);
    const flightIata = searchParams.get('flight_iata');
    const airlineIata = searchParams.get('airline_iata');
    const depIata = searchParams.get('dep_iata');
    const arrIata = searchParams.get('arr_iata');
    const flightNumber = searchParams.get('flight_number');
    
    // BUSINESS_RULE: Validate that we have at least one query parameter
    if (!flightIata && !airlineIata && !depIata && !arrIata && !flightNumber) {
      return NextResponse.json(
        { error: 'Missing required query parameters. Provide flight_iata or composite query (airline_iata, dep_iata, arr_iata, flight_number)' },
        { status: 400 }
      );
    }
    
    // CONTEXT: Build AviationStack query parameters
    const aviationStackQuery = buildAviationStackQuery({
      flight_iata: flightIata || undefined,
      airline_iata: airlineIata || undefined,
      dep_iata: depIata || undefined,
      arr_iata: arrIata || undefined,
      flight_number: flightNumber || undefined,
    });
    
    // BUSINESS_RULE: Add access key to query parameters
    aviationStackQuery.set('access_key', accessKey);
    
    // CONTEXT: Make request to AviationStack API
    const apiUrl = `${baseUrl}/flights?${aviationStackQuery.toString()}`;
    console.log('Fetching flight data from AviationStack:', apiUrl.replace(accessKey, '[REDACTED]'));
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('AviationStack API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Flight data service unavailable' },
        { status: 502 }
      );
    }
    
    const data: AviationStackResponse = await response.json();
    
    // BUSINESS_RULE: Handle empty results gracefully
    if (!data.data || data.data.length === 0) {
      return NextResponse.json(
        { error: 'No flight data found for the provided parameters' },
        { status: 404 }
      );
    }
    
    // CONTEXT: Map first result to our DTO format
    const enrichmentData = mapAvsItem(data.data[0]);
    
    // BUSINESS_RULE: Cache response for 5 minutes to reduce API costs
    return NextResponse.json(
      { data: enrichmentData },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      }
    );
    
  } catch (error) {
    console.error('Error fetching flight data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
