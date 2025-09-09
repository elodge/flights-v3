/**
 * @fileoverview Airlabs API caching and rate limiting
 * 
 * @description In-memory LRU cache with TTL for Airlabs flight data and token bucket
 * rate limiting to prevent API quota exhaustion. Designed for serverless environments.
 * 
 * @access Server-only
 * @security Rate limiting prevents API abuse
 * @business_rule 5-minute TTL for flight data, 3 req/sec rate limit with burst of 6
 */

import 'server-only';
import { type AirlabsQuery, type EnrichedFlight } from './airlabs';

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  /** Cached flight data */
  data: EnrichedFlight | null;
  /** Expiration timestamp */
  expires: number;
  /** Last access timestamp for LRU eviction */
  lastAccess: number;
}

/**
 * Token bucket for rate limiting
 */
interface TokenBucket {
  /** Current number of tokens */
  tokens: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Maximum tokens (burst capacity) */
  maxTokens: number;
  /** Refill rate (tokens per second) */
  refillRate: number;
}

// CONTEXT: Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Maximum cache entries
const RATE_LIMIT_MAX_TOKENS = 6; // Burst capacity
const RATE_LIMIT_REFILL_RATE = 3; // 3 tokens per second

// CONTEXT: In-memory storage (per Vercel instance)
const cache = new Map<string, CacheEntry>();
const rateLimiter: TokenBucket = {
  tokens: RATE_LIMIT_MAX_TOKENS,
  lastRefill: Date.now(),
  maxTokens: RATE_LIMIT_MAX_TOKENS,
  refillRate: RATE_LIMIT_REFILL_RATE,
};

/**
 * Generate cache key from query parameters
 * 
 * @description Creates a consistent string key for caching based on query params
 * @param params - Airlabs query parameters
 * @returns Cache key string
 * 
 * @example
 * ```typescript
 * const key = getCacheKey({ flight_iata: "AA100" });
 * // Returns: "flight_iata:AA100"
 * ```
 */
function getCacheKey(params: AirlabsQuery): string {
  // CONTEXT: Create deterministic cache key from sorted parameters
  const keys = Object.keys(params).sort();
  const parts = keys.map(key => `${key}:${params[key as keyof AirlabsQuery]}`);
  return parts.join('|');
}

/**
 * Evict expired entries from cache
 * 
 * @description Removes expired entries and implements LRU eviction if needed
 * @business_rule Remove expired entries first, then LRU if over size limit
 */
function evictExpired(): void {
  const now = Date.now();
  
  // CONTEXT: Remove expired entries
  for (const [key, entry] of cache.entries()) {
    if (entry.expires < now) {
      cache.delete(key);
    }
  }
  
  // CONTEXT: LRU eviction if cache is too large
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    const toRemove = cache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

/**
 * Refill token bucket for rate limiting
 * 
 * @description Updates token count based on elapsed time since last refill
 * @business_rule Refill at configured rate, cap at maximum tokens
 */
function refillTokens(): void {
  const now = Date.now();
  const elapsed = (now - rateLimiter.lastRefill) / 1000; // seconds
  
  if (elapsed > 0) {
    const tokensToAdd = Math.floor(elapsed * rateLimiter.refillRate);
    rateLimiter.tokens = Math.min(
      rateLimiter.maxTokens,
      rateLimiter.tokens + tokensToAdd
    );
    rateLimiter.lastRefill = now;
  }
}

/**
 * Get cached flight data
 * 
 * @description Retrieves cached enriched flight data if available and not expired
 * @param params - Query parameters used as cache key
 * @returns Cached flight data or null if not found/expired
 * 
 * @example
 * ```typescript
 * const cached = getCached({ flight_iata: "AA100" });
 * if (cached) {
 *   // Use cached data
 * }
 * ```
 */
export function getCached(params: AirlabsQuery): EnrichedFlight | null {
  evictExpired();
  
  const key = getCacheKey(params);
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  if (entry.expires < now) {
    cache.delete(key);
    return null;
  }
  
  // CONTEXT: Update access time for LRU
  entry.lastAccess = now;
  return entry.data;
}

/**
 * Cache flight data with TTL
 * 
 * @description Stores enriched flight data in cache with expiration
 * @param params - Query parameters used as cache key
 * @param data - Flight data to cache (can be null for "not found" results)
 * 
 * @business_rule Cache both successful results and "not found" to prevent repeated API calls
 * @example
 * ```typescript
 * setCached({ flight_iata: "AA100" }, enrichedFlightData);
 * ```
 */
export function setCached(params: AirlabsQuery, data: EnrichedFlight | null): void {
  evictExpired();
  
  const key = getCacheKey(params);
  const now = Date.now();
  
  const entry: CacheEntry = {
    data,
    expires: now + CACHE_TTL_MS,
    lastAccess: now,
  };
  
  cache.set(key, entry);
}

/**
 * Consume a rate limiting token
 * 
 * @description Attempts to consume a token for rate limiting; returns false if exhausted
 * @returns True if token consumed successfully, false if rate limited
 * 
 * @business_rule Use token bucket algorithm with burst capacity
 * @example
 * ```typescript
 * if (!consumeToken()) {
 *   return Response.json({ error: "Rate limited" }, { status: 429 });
 * }
 * ```
 */
export function consumeToken(): boolean {
  refillTokens();
  
  if (rateLimiter.tokens >= 1) {
    rateLimiter.tokens -= 1;
    return true;
  }
  
  return false;
}

/**
 * Get current rate limiting status
 * 
 * @description Returns current token count and rate limiting info for debugging
 * @returns Rate limiter status object
 * 
 * @access Internal debugging helper
 */
export function getRateLimitStatus() {
  refillTokens();
  return {
    tokens: rateLimiter.tokens,
    maxTokens: rateLimiter.maxTokens,
    refillRate: rateLimiter.refillRate,
    lastRefill: rateLimiter.lastRefill,
  };
}

/**
 * Clear cache (for testing/debugging)
 * 
 * @description Removes all cached entries
 * @access Internal testing helper
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 * 
 * @description Returns cache size and statistics for monitoring
 * @returns Cache statistics object
 * 
 * @access Internal debugging helper
 */
export function getCacheStats() {
  evictExpired();
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}
