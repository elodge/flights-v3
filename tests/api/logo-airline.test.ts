/**
 * @fileoverview Tests for logo airline API route
 * 
 * @description Integration tests for /api/logo/airline endpoint
 * including success cases, error handling, and rate limiting.
 * 
 * @coverage Tests app/api/logo/airline/route.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, HEAD, resetRateLimiter } from '@/app/api/logo/airline/route';

// Mock the airlines module
vi.mock('@/lib/airlines', () => ({
  findAirline: vi.fn(),
  airlineDisplayName: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('/api/logo/airline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    resetRateLimiter(); // Reset for each test to avoid interference
    
    // Set up environment
    process.env.LOGO_DEV_API_KEY = 'test-api-key';
    process.env.NODE_ENV = 'test';
  });

  describe('GET /api/logo/airline', () => {
    it('should return 204 when API key missing', async () => {
      delete process.env.LOGO_DEV_API_KEY;
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=AA');
      const response = await GET(request);
      
      expect(response.status).toBe(204);
    });

    it('should return 429 when rate limit exceeded', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      // Mock airline lookup to return valid airline so we hit rate limiter
      vi.mocked(findAirline).mockReturnValue({
        iata: 'AA',
        name: 'American Airlines',
        domain: 'aa.com'
      });
      vi.mocked(airlineDisplayName).mockReturnValue('American Airlines');
      
      // Mock successful fetch
      mockFetch.mockResolvedValue(new Response(new Blob(), { status: 200 }));
      
      // Exhaust rate limit (10 allowed, 11th should be blocked)
      for (let i = 0; i < 11; i++) {
        const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=AA');
        const response = await GET(request);
        
        if (i < 10) {
          expect(response.status).not.toBe(429);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });

    it('should handle unknown airline gracefully', async () => {
      const { findAirline } = await import('@/lib/airlines');
      vi.mocked(findAirline).mockReturnValue(undefined);
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=UNKNOWN');
      const response = await GET(request);
      
      expect(response.status).toBe(204);
    });

    it('should fetch logo for known airline with domain', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue({
        iata: 'AA',
        name: 'American Airlines',
        domain: 'aa.com'
      });
      vi.mocked(airlineDisplayName).mockReturnValue('American Airlines');
      
      // Mock successful fetch
      const mockImageResponse = new Response(new Blob(['fake-image-data'], { type: 'image/png' }), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': '1234'
        }
      });
      mockFetch.mockResolvedValueOnce(mockImageResponse);
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=AA&size=64');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
      expect(response.headers.get('Content-Length')).toBe('1234');
      expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=604800, stale-while-revalidate=86400');
      expect(response.headers.get('X-Logo-Source')).toBe('logo.dev');
      expect(response.headers.get('Vary')).toBe('Accept');
      
      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('img.logo.dev/aa.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'Fllights-V3/1.0'
          })
        })
      );
    });

    it('should fetch logo using name fallback when no domain', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue({
        iata: 'NK',
        name: 'Spirit Airlines'
        // No domain
      });
      vi.mocked(airlineDisplayName).mockReturnValue('Spirit Airlines');
      
      const mockImageResponse = new Response(new Blob(['fake-image-data'], { type: 'image/png' }), {
        status: 200,
        headers: { 'Content-Type': 'image/png' }
      });
      mockFetch.mockResolvedValueOnce(mockImageResponse);
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=NK');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      // Verify fetch was called with name-based URL
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('img.logo.dev/logo?name=Spirit%20Airlines'),
        expect.any(Object)
      );
    });

    it('should handle Logo.dev 404 response', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue({
        iata: 'AA',
        name: 'American Airlines',
        domain: 'aa.com'
      });
      vi.mocked(airlineDisplayName).mockReturnValue('American Airlines');
      
      // Mock 404 response
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=AA');
      const response = await GET(request);
      
      expect(response.status).toBe(204);
    });

    it('should handle fetch errors gracefully', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue({
        iata: 'AA',
        name: 'American Airlines',
        domain: 'aa.com'
      });
      vi.mocked(airlineDisplayName).mockReturnValue('American Airlines');
      
      // Mock fetch error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=AA');
      const response = await GET(request);
      
      expect(response.status).toBe(204);
    });

    it('should validate and clamp size parameter', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue({
        iata: 'AA',
        name: 'American Airlines',
        domain: 'aa.com'
      });
      vi.mocked(airlineDisplayName).mockReturnValue('American Airlines');
      
      mockFetch.mockResolvedValueOnce(new Response(new Blob(), { status: 200 }));
      
      // Test size clamping
      const testCases = [
        { input: '10', expected: '32' },   // Below minimum
        { input: '64', expected: '64' },   // Valid
        { input: '200', expected: '128' }, // Above maximum
        { input: 'invalid', expected: '64' }, // Invalid, use default
      ];
      
      for (const { input, expected } of testCases) {
        mockFetch.mockClear();
        
        const request = new NextRequest(`http://localhost:3000/api/logo/airline?iata=AA&size=${input}`);
        await GET(request);
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`size=${expected}`),
          expect.any(Object)
        );
      }
    });

    it('should use explicit domain parameter', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue(undefined); // No airline found
      vi.mocked(airlineDisplayName).mockReturnValue(undefined);
      
      mockFetch.mockResolvedValueOnce(new Response(new Blob(), { status: 200 }));
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?domain=example.com');
      await GET(request);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('img.logo.dev/example.com'),
        expect.any(Object)
      );
    });

    it('should use explicit name parameter', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue(undefined); // No airline found
      vi.mocked(airlineDisplayName).mockReturnValue(undefined);
      
      mockFetch.mockResolvedValueOnce(new Response(new Blob(), { status: 200 }));
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?name=Test Airlines');
      await GET(request);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('img.logo.dev/logo?name=Test%20Airlines'),
        expect.any(Object)
      );
    });
  });

  describe('HEAD /api/logo/airline', () => {
    it('should return same headers as GET without body', async () => {
      const { findAirline, airlineDisplayName } = await import('@/lib/airlines');
      
      vi.mocked(findAirline).mockReturnValue({
        iata: 'AA',
        name: 'American Airlines',
        domain: 'aa.com'
      });
      vi.mocked(airlineDisplayName).mockReturnValue('American Airlines');
      
      const mockImageResponse = new Response(new Blob(['fake-image-data'], { type: 'image/png' }), {
        status: 200,
        headers: { 'Content-Type': 'image/png' }
      });
      mockFetch.mockResolvedValueOnce(mockImageResponse);
      
      const request = new NextRequest('http://localhost:3000/api/logo/airline?iata=AA');
      const response = await HEAD(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
      expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=604800, stale-while-revalidate=86400');
      
      // HEAD should not have body
      expect(response.body).toBeNull();
    });
  });
});
