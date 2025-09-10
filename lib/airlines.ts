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

// CONTEXT: Aircraft data for converting IATA/ICAO codes to full names
const AIRCRAFT = [
  // Boeing Aircraft
  { "iata": "B703", "icao": "B703", "name": "Boeing 707-300" },
  { "iata": "B712", "icao": "B712", "name": "Boeing 717-200" },
  { "iata": "B721", "icao": "B721", "name": "Boeing 727-100" },
  { "iata": "B722", "icao": "B722", "name": "Boeing 727-200" },
  { "iata": "B732", "icao": "B732", "name": "Boeing 737-200" },
  { "iata": "B733", "icao": "B733", "name": "Boeing 737-300" },
  { "iata": "B734", "icao": "B734", "name": "Boeing 737-400" },
  { "iata": "B735", "icao": "B735", "name": "Boeing 737-500" },
  { "iata": "B736", "icao": "B736", "name": "Boeing 737-600" },
  { "iata": "B737", "icao": "B737", "name": "Boeing 737-700" },
  { "iata": "B738", "icao": "B738", "name": "Boeing 737-800" },
  { "iata": "B739", "icao": "B739", "name": "Boeing 737-900" },
  { "iata": "B37M", "icao": "B37M", "name": "Boeing 737 MAX 7" },
  { "iata": "B38M", "icao": "B38M", "name": "Boeing 737 MAX 8" },
  { "iata": "B39M", "icao": "B39M", "name": "Boeing 737 MAX 9" },
  { "iata": "B3XM", "icao": "B3XM", "name": "Boeing 737 MAX 10" },
  { "iata": "B752", "icao": "B752", "name": "Boeing 757-200" },
  { "iata": "B753", "icao": "B753", "name": "Boeing 757-300" },
  { "iata": "B762", "icao": "B762", "name": "Boeing 767-200" },
  { "iata": "B763", "icao": "B763", "name": "Boeing 767-300" },
  { "iata": "B764", "icao": "B764", "name": "Boeing 767-400" },
  { "iata": "B772", "icao": "B772", "name": "Boeing 777-200" },
  { "iata": "B773", "icao": "B773", "name": "Boeing 777-300" },
  { "iata": "B77L", "icao": "B77L", "name": "Boeing 777-200LR" },
  { "iata": "B77W", "icao": "B77W", "name": "Boeing 777-300ER" },
  { "iata": "B778", "icao": "B778", "name": "Boeing 777-8" },
  { "iata": "B779", "icao": "B779", "name": "Boeing 777-9" },
  { "iata": "B788", "icao": "B788", "name": "Boeing 787-8 Dreamliner" },
  { "iata": "B789", "icao": "B789", "name": "Boeing 787-9 Dreamliner" },
  { "iata": "B78X", "icao": "B78X", "name": "Boeing 787-10 Dreamliner" },
  { "iata": "B744", "icao": "B744", "name": "Boeing 747-400" },
  { "iata": "B748", "icao": "B748", "name": "Boeing 747-8" },
  { "iata": "B772", "icao": "B772", "name": "Boeing 777-200" },
  
  // Airbus Aircraft
  { "iata": "A318", "icao": "A318", "name": "Airbus A318" },
  { "iata": "A319", "icao": "A319", "name": "Airbus A319" },
  { "iata": "A320", "icao": "A320", "name": "Airbus A320" },
  { "iata": "A321", "icao": "A321", "name": "Airbus A321" },
  { "iata": "A20N", "icao": "A20N", "name": "Airbus A320neo" },
  { "iata": "A21N", "icao": "A21N", "name": "Airbus A321neo" },
  { "iata": "A332", "icao": "A332", "name": "Airbus A330-200" },
  { "iata": "A333", "icao": "A333", "name": "Airbus A330-300" },
  { "iata": "A339", "icao": "A339", "name": "Airbus A330-900neo" },
  { "iata": "A342", "icao": "A342", "name": "Airbus A340-200" },
  { "iata": "A343", "icao": "A343", "name": "Airbus A340-300" },
  { "iata": "A345", "icao": "A345", "name": "Airbus A340-500" },
  { "iata": "A346", "icao": "A346", "name": "Airbus A340-600" },
  { "iata": "A350", "icao": "A350", "name": "Airbus A350-900" },
  { "iata": "A351", "icao": "A351", "name": "Airbus A350-1000" },
  { "iata": "A359", "icao": "A359", "name": "Airbus A350-900" },
  { "iata": "A35K", "icao": "A35K", "name": "Airbus A350-1000" },
  { "iata": "A380", "icao": "A388", "name": "Airbus A380-800" },
  
  // Embraer Aircraft
  { "iata": "E135", "icao": "E135", "name": "Embraer ERJ-135" },
  { "iata": "E145", "icao": "E145", "name": "Embraer ERJ-145" },
  { "iata": "E170", "icao": "E170", "name": "Embraer E170" },
  { "iata": "E175", "icao": "E175", "name": "Embraer E175" },
  { "iata": "E190", "icao": "E190", "name": "Embraer E190" },
  { "iata": "E195", "icao": "E195", "name": "Embraer E195" },
  
  // Bombardier Aircraft
  { "iata": "CRJ1", "icao": "CRJ1", "name": "Bombardier CRJ-100" },
  { "iata": "CRJ2", "icao": "CRJ2", "name": "Bombardier CRJ-200" },
  { "iata": "CRJ7", "icao": "CRJ7", "name": "Bombardier CRJ-700" },
  { "iata": "CRJ9", "icao": "CRJ9", "name": "Bombardier CRJ-900" },
  { "iata": "CRJX", "icao": "CRJX", "name": "Bombardier CRJ-1000" },
  
  // Other Common Aircraft
  { "iata": "AT72", "icao": "AT72", "name": "ATR 72-200" },
  { "iata": "AT76", "icao": "AT76", "name": "ATR 72-600" },
  { "iata": "DH8A", "icao": "DH8A", "name": "De Havilland Dash 8-100" },
  { "iata": "DH8B", "icao": "DH8B", "name": "De Havilland Dash 8-200" },
  { "iata": "DH8C", "icao": "DH8C", "name": "De Havilland Dash 8-300" },
  { "iata": "DH8D", "icao": "DH8D", "name": "De Havilland Dash 8-400" },
] as const;

// CONTEXT: Create lookup map for fast IATA code to name resolution
const AIRLINE_MAP: Record<string, string> = Object.fromEntries(
  AIRLINES
  .filter((a: { iata?: string; name?: string }) => a?.iata && a?.name)
  .map((a: { iata: string; name: string }) => [String(a.iata).toUpperCase(), String(a.name)])
);

// CONTEXT: Create lookup map for aircraft codes to full names
const AIRCRAFT_MAP: Record<string, string> = Object.fromEntries(
  AIRCRAFT
  .filter((a: { iata?: string; icao?: string; name?: string }) => a?.iata && a?.name)
  .flatMap((a: { iata: string; icao: string; name: string }) => [
    [String(a.iata).toUpperCase(), String(a.name)],
    [String(a.icao).toUpperCase(), String(a.name)]
  ])
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

/**
 * Get aircraft name by IATA or ICAO code
 * 
 * @description Looks up aircraft name from IATA/ICAO code, with fallback to code itself
 * @param code - IATA or ICAO aircraft code (e.g., "B788", "A319")
 * @returns Full aircraft name or code if not found
 * 
 * @example
 * ```typescript
 * getAircraftName("B788") // "Boeing 787-8 Dreamliner"
 * getAircraftName("A319") // "Airbus A319"
 * getAircraftName("UNKNOWN") // "UNKNOWN"
 * ```
 */
export function getAircraftName(code?: string | null): string {
  if (!code) return "";
  const key = String(code).toUpperCase();
  return AIRCRAFT_MAP[key] ?? key;
}

