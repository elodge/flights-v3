/**
 * @fileoverview Health check endpoint for deployment verification
 * 
 * @description Simple health check endpoint that returns service status
 * and timestamp. Used by Vercel and monitoring systems to verify
 * application deployment and basic functionality.
 * 
 * @route GET /api/health
 * @access Public (no authentication required)
 * @security No sensitive data exposed
 * @database No database operations
 * @business_rule Always returns 200 OK with basic status information
 */

import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Health check endpoint
 * 
 * @description Returns basic health status and timestamp for monitoring.
 * Uses edge runtime for fast response times and global availability.
 * 
 * @returns Response with health status and timestamp
 * 
 * @example
 * ```typescript
 * // Response format
 * {
 *   "ok": true,
 *   "timestamp": 1703123456789,
 *   "status": "healthy"
 * }
 * ```
 */
export function GET() {
  return NextResponse.json({ 
    ok: true, 
    timestamp: Date.now(),
    status: "healthy"
  });
}
