/**
 * @fileoverview Airline name lookup utility
 * 
 * @description Provides airline name lookup by IATA code using the airlines data.
 * Handles case-insensitive lookups and provides fallback to IATA code for unknown airlines.
 * 
 * @access Internal utility
 * @security No external dependencies, uses local data
 * @business_rule Fallback to IATA code if airline not found in database
 */

// CONTEXT: Airline data converted from JSON to TypeScript for better Turbopack compatibility
// Comprehensive list of major airlines worldwide for flight segment display
const AIRLINES = [
  // US Airlines
  { "iata": "AA", "name": "American Airlines" },
  { "iata": "UA", "name": "United Airlines" },
  { "iata": "DL", "name": "Delta Air Lines" },
  { "iata": "WN", "name": "Southwest Airlines" },
  { "iata": "B6", "name": "JetBlue Airways" },
  { "iata": "AS", "name": "Alaska Airlines" },
  { "iata": "NK", "name": "Spirit Airlines" },
  { "iata": "F9", "name": "Frontier Airlines" },
  { "iata": "HA", "name": "Hawaiian Airlines" },
  { "iata": "VX", "name": "Virgin America" },
  
  // European Airlines
  { "iata": "LH", "name": "Lufthansa" },
  { "iata": "BA", "name": "British Airways" },
  { "iata": "AF", "name": "Air France" },
  { "iata": "KL", "name": "KLM Royal Dutch Airlines" },
  { "iata": "LX", "name": "Swiss International Air Lines" },
  { "iata": "OS", "name": "Austrian Airlines" },
  { "iata": "SN", "name": "Brussels Airlines" },
  { "iata": "IB", "name": "Iberia" },
  { "iata": "AZ", "name": "Alitalia" },
  { "iata": "TP", "name": "TAP Air Portugal" },
  { "iata": "SK", "name": "Scandinavian Airlines" },
  { "iata": "AY", "name": "Finnair" },
  { "iata": "VS", "name": "Virgin Atlantic" },
  { "iata": "EI", "name": "Aer Lingus" },
  { "iata": "FR", "name": "Ryanair" },
  { "iata": "U2", "name": "easyJet" },
  { "iata": "TK", "name": "Turkish Airlines" },
  
  // Asian Airlines
  { "iata": "SQ", "name": "Singapore Airlines" },
  { "iata": "CX", "name": "Cathay Pacific" },
  { "iata": "JL", "name": "Japan Airlines" },
  { "iata": "NH", "name": "All Nippon Airways" },
  { "iata": "CZ", "name": "China Southern Airlines" },
  { "iata": "MU", "name": "China Eastern Airlines" },
  { "iata": "CA", "name": "Air China" },
  { "iata": "KE", "name": "Korean Air" },
  { "iata": "OZ", "name": "Asiana Airlines" },
  { "iata": "TG", "name": "Thai Airways" },
  { "iata": "MH", "name": "Malaysia Airlines" },
  { "iata": "GA", "name": "Garuda Indonesia" },
  { "iata": "PR", "name": "Philippine Airlines" },
  { "iata": "AI", "name": "Air India" },
  { "iata": "6E", "name": "IndiGo" },
  
  // Australian/Oceania Airlines
  { "iata": "QF", "name": "Qantas" },
  { "iata": "JQ", "name": "Jetstar Airways" },
  { "iata": "VA", "name": "Virgin Australia" },
  { "iata": "NZ", "name": "Air New Zealand" },
  
  // Middle Eastern Airlines
  { "iata": "EK", "name": "Emirates" },
  { "iata": "QR", "name": "Qatar Airways" },
  { "iata": "EY", "name": "Etihad Airways" },
  { "iata": "MS", "name": "EgyptAir" },
  { "iata": "RJ", "name": "Royal Jordanian" },
  { "iata": "GF", "name": "Gulf Air" },
  
  // Canadian Airlines
  { "iata": "AC", "name": "Air Canada" },
  { "iata": "WS", "name": "WestJet" },
  
  // Latin American Airlines
  { "iata": "LA", "name": "LATAM Airlines" },
  { "iata": "AM", "name": "Aeroméxico" },
  { "iata": "AV", "name": "Avianca" },
  { "iata": "G3", "name": "Gol Transportes Aéreos" },
  { "iata": "AR", "name": "Aerolíneas Argentinas" },
  
  // African Airlines
  { "iata": "SA", "name": "South African Airways" },
  { "iata": "ET", "name": "Ethiopian Airlines" },
  { "iata": "AT", "name": "Royal Air Maroc" },
  { "iata": "KQ", "name": "Kenya Airways" },
  
  // Low-cost Carriers
  { "iata": "4U", "name": "Germanwings" },
  { "iata": "VY", "name": "Vueling" },
  { "iata": "W6", "name": "Wizz Air" },
  { "iata": "PC", "name": "Pegasus Airlines" },
  { "iata": "3K", "name": "Jetstar Asia" },
  
  // Cargo/Charter Airlines (common ones)
  { "iata": "FX", "name": "FedEx Express" },
  { "iata": "5X", "name": "UPS Airlines" },
  { "iata": "GI", "name": "Atlas Air" }
] as const;

// CONTEXT: Create lookup map for fast IATA code to name resolution
const AIRLINE_MAP: Record<string, string> = Object.fromEntries(
  AIRLINES
  .filter((a: { iata?: string; name?: string }) => a?.iata && a?.name)
  .map((a: { iata: string; name: string }) => [String(a.iata).toUpperCase(), String(a.name)])
);

/**
 * Get airline name by IATA code
 * 
 * @description Looks up airline name from IATA code, with fallback to code itself
 * @param code - IATA airline code (e.g., "AA", "UA")
 * @returns Full airline name or IATA code if not found
 * 
 * @example
 * ```typescript
 * getAirlineName("AA") // "American Airlines"
 * getAirlineName("UA") // "United Airlines"
 * getAirlineName("UNKNOWN") // "UNKNOWN"
 * ```
 */
export function getAirlineName(code?: string | null): string {
  if (!code) return "";
  const key = String(code).toUpperCase();
  return AIRLINE_MAP[key] ?? key;
}
