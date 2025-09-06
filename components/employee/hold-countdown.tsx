/**
 * @fileoverview Hold Countdown component
 * 
 * @description Real-time countdown timer showing time remaining until a hold expires.
 * Updates every second and shows urgency through color coding.
 * @param expiresAt - ISO timestamp when the hold expires
 * @returns JSX.Element
 * @access Internal component for hold timing
 * @example
 * ```typescript
 * <HoldCountdown expiresAt="2024-01-01T12:00:00Z" />
 * ```
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface HoldCountdownProps {
  /** ISO timestamp when the hold expires */
  expiresAt: string;
}

/**
 * Hold Countdown component
 * 
 * @description Displays a real-time countdown showing time remaining until hold expiration.
 * Color codes urgency: green (>2h), yellow (30m-2h), red (<30m), expired.
 * @param props - Component props
 * @param props.expiresAt - ISO timestamp of hold expiration
 * @returns JSX.Element
 * @access Internal countdown component
 * @business_rule Updates every second, shows expired state
 * @example
 * ```typescript
 * <HoldCountdown expiresAt="2024-12-25T15:30:00Z" />
 * // Displays: "2h 15m" with appropriate color
 * ```
 */
export function HoldCountdown({ expiresAt }: HoldCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'safe' | 'warning' | 'critical'>('safe');

  useEffect(() => {
    // CONTEXT: Update countdown every second
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        setIsExpired(true);
        setUrgencyLevel('critical');
        return;
      }

      // CONTEXT: Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // CONTEXT: Format time display
      let timeStr = '';
      if (hours > 0) {
        timeStr = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        timeStr = `${minutes}m ${seconds}s`;
      } else {
        timeStr = `${seconds}s`;
      }

      setTimeRemaining(timeStr);

      // CONTEXT: Set urgency level based on remaining time
      const totalMinutes = Math.floor(diff / (1000 * 60));
      if (totalMinutes > 120) { // > 2 hours
        setUrgencyLevel('safe');
      } else if (totalMinutes > 30) { // 30min - 2h
        setUrgencyLevel('warning');
      } else { // < 30 minutes
        setUrgencyLevel('critical');
      }
    };

    // CONTEXT: Initial update and set interval
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // CONTEXT: Determine styles based on urgency
  const getStyles = () => {
    if (isExpired) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    
    switch (urgencyLevel) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className={`
      inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium
      ${getStyles()}
    `}>
      <Clock className="h-3 w-3 mr-1" />
      {timeRemaining}
    </div>
  );
}
