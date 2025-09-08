/**
 * @fileoverview Time parsing and formatting utilities
 * 
 * @description Handles parsing of various time formats (9A, 9:05A, 12P, 08:00A) and
 * provides duration calculations with day offset support for flight segments.
 * 
 * @access Internal utility
 * @security No external dependencies, pure time parsing
 * @business_rule Supports 12-hour format with AM/PM indicators
 */

/**
 * Parse local clock time to minutes since midnight
 * 
 * @description Accepts "9A", "9:05A", "12P", "08:00A" etc. and converts to minutes
 * @param raw - Raw time string in 12-hour format
 * @returns Minutes since midnight or null if invalid
 * 
 * @example
 * ```typescript
 * parseLocalClock("9A") // 540 (9:00 AM)
 * parseLocalClock("12P") // 720 (12:00 PM)
 * parseLocalClock("11:30P") // 1410 (11:30 PM)
 * ```
 */
export function parseLocalClock(raw?: string): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?([AP])$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2] ?? "00", 10);
  const ap = m[3].toUpperCase();
  
  // CONTEXT: Validate hour and minute ranges
  if (h < 1 || h > 12 || mm < 0 || mm > 59) return null;
  
  if (ap === "P" && h !== 12) h += 12;
  if (ap === "A" && h === 12) h = 0;
  return h * 60 + mm;
}

/**
 * Format time string to standardized 12-hour format
 * 
 * @description Converts raw time to "H:MM AM/PM" format
 * @param raw - Raw time string
 * @returns Formatted time string or original if invalid
 * 
 * @example
 * ```typescript
 * formatClock("9A") // "9:00 AM"
 * formatClock("12P") // "12:00 PM"
 * formatClock("11:30P") // "11:30 PM"
 * ```
 */
export function formatClock(raw?: string): string {
  const mins = parseLocalClock(raw);
  if (mins == null) return raw ?? "";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/**
 * Compute flight duration in minutes
 * 
 * @description Calculates duration between departure and arrival times with day offset
 * @param depRaw - Departure time string
 * @param arrRaw - Arrival time string  
 * @param dayOffset - Days to add to arrival (0, 1, 2)
 * @returns Duration in minutes or null if invalid
 * 
 * @example
 * ```typescript
 * computeDurationMin("9A", "11A", 0) // 120 (2 hours)
 * computeDurationMin("11P", "1A", 1) // 120 (2 hours, next day)
 * ```
 */
export function computeDurationMin(
  depRaw?: string,
  arrRaw?: string,
  dayOffset: number = 0
): number | null {
  const dep = parseLocalClock(depRaw);
  const arr = parseLocalClock(arrRaw);
  if (dep == null || arr == null) return null;
  let delta = arr - dep + dayOffset * 24 * 60;
  if (delta < 0) delta += 24 * 60; // safety for wrap
  return delta >= 0 ? delta : null;
}

/**
 * Format duration in minutes to readable string
 * 
 * @description Converts minutes to "XhYY" format
 * @param mins - Duration in minutes
 * @returns Formatted duration string or "—" if null
 * 
 * @example
 * ```typescript
 * formatDuration(120) // "2h00"
 * formatDuration(90) // "1h30"
 * formatDuration(null) // "—"
 * ```
 */
export function formatDuration(mins: number | null): string {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? String(m).padStart(2, "0") : "00"}`;
}
