/**
 * @fileoverview Airline logo component with graceful fallback
 * 
 * @description React component that displays airline logos from Logo.dev proxy
 * with automatic fallback to initials avatar when logos fail to load.
 * 
 * @param airline - IATA airline code
 * @param className - Additional CSS classes  
 * @param size - Logo size in pixels (default 48)
 * @returns JSX.Element - Logo image or initials fallback
 * @access Client-side component
 * @security Uses secure server-side proxy, no API keys exposed
 * @business_rule Fallback to initials when logo fails to load
 */

"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AirlineLogoProps {
  /** IATA airline code (e.g., "AA", "UA") */
  airline?: string | null;
  /** Additional CSS classes */
  className?: string;
  /** Logo size in pixels (default 64 for better quality) */
  size?: number;
}

/**
 * Airline logo component
 * 
 * @description Displays airline logos with robust fallback to initials.
 * Uses fixed dimensions to prevent layout shift and gracefully handles failures.
 * 
 * @param airline - IATA airline code to display logo for
 * @param className - Additional CSS classes for styling
 * @param size - Size of the logo in pixels (defaults to 48)
 * @returns JSX.Element - Logo image or initials avatar
 * 
 * @example
 * ```tsx
 * <AirlineLogo airline="AA" className="h-8 w-8" />
 * <AirlineLogo airline="UA" size={64} />
 * ```
 */
export function AirlineLogo({ 
  airline, 
  className,
  size = 64 
}: AirlineLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // CONTEXT: Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // CONTEXT: Don't render anything if no airline code
  if (!airline || typeof airline !== 'string') {
    return (
      <div className={cn(
        "rounded-full bg-muted text-xs font-medium flex items-center justify-center",
        className
      )} style={{ width: size, height: size }}>
        --
      </div>
    );
  }

  const airlineCode = airline.toUpperCase();
  const initials = airlineCode.slice(0, 2);
  
  // Build our proxy URL
  const logoUrl = `/api/logo/airline?iata=${encodeURIComponent(airlineCode)}&size=${size}`;

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-white border border-gray-200", className)} style={{ width: size, height: size }}>
      {/* CONTEXT: Logo image with error handling - only on client side */}
      {isClient && (
        <img
          src={logoUrl}
          alt={`${airlineCode} logo`}
          className={cn(
            "rounded-lg transition-opacity duration-200",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            padding: '2px'
          }}
        />
      )}
      
      {/* FALLBACK: Initials shown while loading or if image fails */}
      <div className={cn(
        "absolute inset-0 rounded-lg bg-muted text-xs font-medium flex items-center justify-center transition-opacity duration-200",
        isClient && imageLoaded && !imageError ? "opacity-0" : "opacity-100"
      )}>
        {initials}
      </div>
    </div>
  );
}
