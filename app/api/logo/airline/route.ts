/**
 * @fileoverview Logo.dev proxy API route for airline logos
 * 
 * @description Secure server-side proxy to Logo.dev API that keeps API keys private
 * while providing airline logo images with strong caching and graceful fallbacks.
 * 
 * @route GET/HEAD /api/logo/airline
 * @access Public (with rate limiting)
 * @security API key secured server-side, rate limited
 * @business_rule Returns 204 for unknown airlines to enable graceful fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { findAirline, airlineDisplayName } from '@/lib/airlines';

// CONTEXT: Simple in-memory rate limiter for development safety
// BUSINESS_RULE: 10 requests per minute to prevent API abuse
let rateLimiter: {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number;
} = {
  tokens: 10,
  lastRefill: Date.now(),
  maxTokens: 10,
  refillRate: 10 * 60 * 1000, // 10 requests per minute
};

/**
 * Reset rate limiter (for testing)
 * 
 * @description Resets the rate limiter state - used in test environments
 */
export function resetRateLimiter() {
  rateLimiter = {
    tokens: 10,
    lastRefill: Date.now(),
    maxTokens: 10,
    refillRate: 10 * 60 * 1000,
  };
}

/**
 * Check if request should be rate limited
 * 
 * @description Simple token bucket rate limiter
 * @returns true if request should proceed, false if rate limited
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  const timePassed = now - rateLimiter.lastRefill;
  
  // Refill tokens
  if (timePassed >= rateLimiter.refillRate) {
    rateLimiter.tokens = rateLimiter.maxTokens;
    rateLimiter.lastRefill = now;
  }
  
  // Check if we have tokens
  if (rateLimiter.tokens > 0) {
    rateLimiter.tokens--;
    return true;
  }
  
  return false;
}

/**
 * Build Logo.dev URL for airline
 * 
 * @description Constructs Logo.dev API URL preferring domain over name
 * @param airline - Airline object from lookup
 * @param domain - Explicit domain override
 * @param name - Explicit name override  
 * @param size - Logo size (32-128)
 * @returns Logo.dev API URL
 */
function buildLogoUrl(
  airline: ReturnType<typeof findAirline>,
  domain?: string,
  name?: string,
  size: number = 64
): string {
  const baseUrl = 'https://img.logo.dev';
  
  // CONTEXT: Enhanced parameters for high-quality, retina-ready logos
  const logoParams = new URLSearchParams({
    token: process.env.LOGO_DEV_API_KEY!,
    size: size.toString(),
    retina: 'true',          // Enable retina support for crisp display
    format: 'png'            // Use PNG for transparency support
  });
  
  // Prefer domain (airline.domain → domain param → airline.name → name param)
  const targetDomain = airline?.domain || domain;
  if (targetDomain) {
    return `${baseUrl}/${encodeURIComponent(targetDomain)}?${logoParams.toString()}`;
  }
  
  // Fallback to name
  const targetName = airlineDisplayName(airline) || name;
  if (targetName) {
    return `${baseUrl}/logo?name=${encodeURIComponent(targetName)}&${logoParams.toString()}`;
  }
  
  throw new Error('No domain or name available for logo lookup');
}

/**
 * Handle logo requests
 * 
 * @description Proxies requests to Logo.dev with caching and fallbacks
 * @param request - Next.js request object
 * @returns Response with logo image or 204/429 status codes
 */
async function handleRequest(request: NextRequest): Promise<NextResponse> {
  
  // Check for API key
  if (!process.env.LOGO_DEV_API_KEY) {
    console.error('LOGO_DEV_API_KEY not configured');
    return new NextResponse(null, { status: 204 });
  }
  
  // Rate limiting
  if (!checkRateLimit()) {
    return new NextResponse('Rate limit exceeded', { status: 429 });
  }
  
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const iata = searchParams.get('iata');
  const icao = searchParams.get('icao');
  const domain = searchParams.get('domain');
  const name = searchParams.get('name');
  const sizeParam = searchParams.get('size');
  
  // Validate size parameter
  const parsedSize = parseInt(sizeParam || '64', 10);
  const size = isNaN(parsedSize) ? 64 : Math.min(128, Math.max(32, parsedSize));
  
  // Look up airline by IATA/ICAO
  let airline: ReturnType<typeof findAirline>;
  if (iata || icao) {
    airline = findAirline({ iata: iata || undefined, icao: icao || undefined });
  }
  
  // Build Logo.dev URL
  let logoUrl: string;
  try {
    logoUrl = buildLogoUrl(airline, domain || undefined, name || undefined, size);
  } catch (error) {
    console.error('Failed to build logo URL:', error);
    return new NextResponse(null, { status: 204 });
  }
  
  // Fetch from Logo.dev
  let logoResponse: Response;
  try {
    logoResponse = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Fllights-V3/1.0',
      },
    });
  } catch (error) {
    console.error('Failed to fetch from Logo.dev:', error);
    return new NextResponse(null, { status: 204 });
  }
  
  // Handle Logo.dev response
  if (logoResponse && logoResponse.ok) {
    // Stream the image with caching headers
    const headers = new Headers({
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
      'Vary': 'Accept',
      'X-Logo-Source': 'logo.dev',
    });
    
    // Mirror content type and length if available
    const contentType = logoResponse.headers.get('Content-Type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    
    const contentLength = logoResponse.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    
    return new NextResponse(logoResponse.body, {
      status: 200,
      headers,
    });
  } else {
    // Logo not found or error - return 204 for graceful fallback
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * GET handler for logo requests
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleRequest(request);
}

/**
 * HEAD handler for logo requests
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const response = await handleRequest(request);
  
  // For HEAD requests, remove the body but keep headers
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
