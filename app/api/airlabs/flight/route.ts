/**
 * @fileoverview Airlabs flight enrichment API route
 * 
 * @description Server-side API endpoint for fetching enriched flight data from Airlabs.
 * Implements caching, rate limiting, and graceful error handling.
 * 
 * @route GET /api/airlabs/flight
 * @access Server-only (contains API key handling)
 * @security API key never exposed, rate limiting prevents abuse
 * @database External API integration with local caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAirlabs, mapAirlabsItem, validateAirlabsQuery, type AirlabsQuery } from '@/lib/airlabs';
import { getCached, setCached, consumeToken } from '@/lib/airlabs-cache';

// NEXTJS_15_FIX: Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API response structure for flight enrichment
 */
type EnrichmentResponse = {
  /** Enriched flight data or null if not found */
  enrichment: any | null;
  /** Data source identifier */
  source: 'airlabs' | 'cache';
  /** Cache hit indicator for debugging */
  cached?: boolean;
} | {
  /** Error message if request failed */
  error: string;
  /** Additional error details for debugging */
  details?: string;
};

/**
 * GET handler for flight enrichment
 * 
 * @description Fetches enriched flight data with caching and rate limiting
 * @param request - Next.js request object with search parameters
 * @returns JSON response with enriched flight data or error
 * 
 * @security Server-only, API key handled securely
 * @business_rule Check cache first, respect rate limits, cache results
 * 
 * @example
 * GET /api/airlabs/flight?flight_iata=AA100
 * GET /api/airlabs/flight?dep_iata=JFK&arr_iata=LAX
 */
export async function GET(request: NextRequest): Promise<NextResponse<EnrichmentResponse>> {
  try {
    // CONTEXT: Extract and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params: AirlabsQuery = {
      flight_iata: searchParams.get('flight_iata') || undefined,
      dep_iata: searchParams.get('dep_iata') || undefined,
      arr_iata: searchParams.get('arr_iata') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1,
    };

    // BUSINESS_RULE: Validate query parameters
    try {
      validateAirlabsQuery(params);
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
        },
        { status: 400 }
      );
    }

    // CONTEXT: Check cache first
    const cached = getCached(params);
    if (cached !== null) {
      return NextResponse.json({
        enrichment: cached,
        source: 'cache' as const,
        cached: true,
      });
    }

    // CONTEXT: Check if API key is configured
    if (!process.env.AIRLABS_API_KEY) {
      return NextResponse.json({
        enrichment: null,
        source: 'airlabs' as const,
        cached: false,
      });
    }

    // SECURITY: Check rate limiting
    if (!consumeToken()) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      );
    }

    // CONTEXT: Fetch from Airlabs API
    let apiResponse;
    try {
      apiResponse = await fetchAirlabs(params);
    } catch (apiError) {
      // FALLBACK: Cache null result to prevent repeated failures
      setCached(params, null);
      
      return NextResponse.json(
        { 
          error: 'External API error',
          details: apiError instanceof Error ? apiError.message : 'Unknown API error'
        },
        { status: 502 }
      );
    }

    // CONTEXT: Process API response
    if (!apiResponse.response || apiResponse.response.length === 0) {
      // BUSINESS_RULE: Cache "not found" results to prevent repeated API calls
      setCached(params, null);
      
      return NextResponse.json({
        enrichment: null,
        source: 'airlabs' as const,
        cached: false,
      });
    }

    // CONTEXT: Map first result to our format
    const enrichedFlight = mapAirlabsItem(apiResponse.response[0]);
    
    // CONTEXT: Cache successful result
    setCached(params, enrichedFlight);

    return NextResponse.json({
      enrichment: enrichedFlight,
      source: 'airlabs' as const,
      cached: false,
    });

  } catch (error) {
    // FALLBACK: Handle unexpected errors gracefully
    console.error('Airlabs API route error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 * 
 * @description Returns 405 Method Not Allowed for non-GET requests
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
