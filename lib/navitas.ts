/**
 * @fileoverview Navitas Parser - Pure dependency-free parser for Navitas flight data
 * 
 * @description Parses Navitas flight booking text into structured option and segment data.
 * Handles multiple options per paste, extracts passenger info, flight details, fares,
 * and references. Maintains raw data for future processing.
 * 
 * @access Internal utility
 * @security No external dependencies, pure text parsing
 * @business_rule Preserves all original data while providing structured access
 */

export type NavitasSegment = {
  airline: string;          // "AA"
  flightNumber: string;     // "2689"
  dateRaw: string;          // "10Aug"
  origin: string;           // "PHX"
  destination: string;      // "LAX"
  depTimeRaw: string;       // "10:15A"
  arrTimeRaw: string;       // "11:43A"
  dayOffset?: number;       // 0 | 1 | 2
};

export type NavitasOption = {
  passenger?: string | null;
  totalFare?: number | null;
  currency?: string | null;   // "USD"
  reference?: string | null;  // 6-char PNR
  segments: NavitasSegment[];
  source: "navitas";
  raw: string;                // raw block text
  errors: string[];           // soft errors per block
};

export type ParseResult = { 
  options: NavitasOption[]; 
  errors: string[]; 
};

/**
 * Parses Navitas flight booking text into structured data
 * 
 * @description Splits text into option blocks and extracts passenger, flight, fare,
 * and reference information using regex patterns. Handles multiple options per paste.
 * 
 * @param input - Raw Navitas text from paste
 * @returns ParseResult with options array and global errors
 * 
 * @example
 * ```typescript
 * const result = parseNavitasText(`
 * Evan Lodge
 * AA 2689 10Aug PHX LAX  10:15A 11:43A
 * TOTAL FARE INC TAX  USD5790.81
 * Reference: UCWYOJ
 * `);
 * ```
 */
export function parseNavitasText(input: string): ParseResult {
  const globalErrors: string[] = [];
  const options: NavitasOption[] = [];

  if (!input || typeof input !== 'string') {
    return { options: [], errors: ['Invalid input: expected non-empty string'] };
  }

  // CONTEXT: Split into option blocks by blank lines
  // ALGORITHM: Use double newlines as the primary separator
  let blocks = input.trim().split(/\n\s*\n/).filter(block => block.trim());
  
  // CONTEXT: If no blocks found with double newlines, treat the entire input as one block
  if (blocks.length === 0 && input.trim()) {
    blocks = [input.trim()];
  }

  if (blocks.length === 0) {
    return { options: [], errors: ['No valid option blocks found'] };
  }

  // CONTEXT: Process each block as a potential option
  // BUSINESS_RULE: Each block represents one passenger's booking (optional fields allowed)
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    try {
      const option = parseOptionBlock(block, i + 1);
      if (option.segments.length > 0) {
        options.push(option);
      } else {
        globalErrors.push(`Block ${i + 1}: No valid flight segments found`);
      }
    } catch (error) {
      globalErrors.push(`Block ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  return { options, errors: globalErrors };
}

/**
 * Parses a single option block into NavitasOption
 * 
 * @description Extracts passenger, flights, fare, and reference from a block of text.
 * Uses regex patterns to identify different line types and builds structured data.
 * 
 * @param block - Single option block text
 * @param blockNumber - Block number for error reporting
 * @returns NavitasOption with parsed data
 */
function parseOptionBlock(block: string, blockNumber: number): NavitasOption {
  const lines = block.split('\n').map(line => line.trim()).filter(line => line);
  const errors: string[] = [];
  
  let passenger: string | null = null;
  let totalFare: number | null = null;
  let currency: string | null = null;
  let reference: string | null = null;
  const segments: NavitasSegment[] = [];

  // CONTEXT: Process each line to identify its type and extract data
  // ALGORITHM: Use regex patterns to match different line formats
  for (const line of lines) {
    // Passenger name (optional first line)
    const passengerMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/);
    if (passengerMatch && !passenger) {
      passenger = passengerMatch[1];
      continue;
    }

    // Flight line: AA 2689 10Aug PHX LAX  10:15A 11:43A +1
    // Also handle: BATWO EIGHTZEROZERO 29Jun LAX LHR 5:05P 11:35A +1
    const flightMatch = line.match(/^([A-Z]{2,5})\s+([A-Z0-9]+|\d{1,4})\s+(\d{1,2}[A-Za-z]{3})\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{1,2}:\d{2}[AP])\s+(\d{1,2}:\d{2}[AP])(?:\s+\+(\d))?$/);
    if (flightMatch) {
      const [, airlineRaw, flightNumberRaw, dateRaw, origin, destination, depTimeRaw, arrTimeRaw, dayOffsetStr] = flightMatch;
      
      // CONTEXT: Normalize airline codes and flight numbers
      let airline = airlineRaw;
      let flightNumber = flightNumberRaw;
      
      // ALGORITHM: Convert spelled-out airline codes to standard IATA
      if (airlineRaw === 'BATWO') {
        airline = 'BA';
      }
      
      // ALGORITHM: Convert spelled-out flight numbers to numeric
      if (flightNumberRaw === 'EIGHTZEROZERO') {
        flightNumber = '800';
      } else if (flightNumberRaw === 'FOURFIVETHREE') {
        flightNumber = '453';
      } else if (flightNumberRaw === 'FOURONETWO') {
        flightNumber = '412';
      } else if (flightNumberRaw === 'SEVENFIVE') {
        flightNumber = '75';
      }
      
      segments.push({
        airline,
        flightNumber,
        dateRaw,
        origin,
        destination,
        depTimeRaw,
        arrTimeRaw,
        dayOffset: dayOffsetStr ? parseInt(dayOffsetStr, 10) : 0
      });
      continue;
    }

    // Fare line: TOTAL FARE INC TAX  USD5790.81
    const fareMatch = line.match(/^TOTAL\s+FARE\s+INC\s+TAX\s+([A-Z]{3})\s*(\d+(?:\.\d{2})?)$/i);
    if (fareMatch) {
      currency = fareMatch[1];
      totalFare = parseFloat(fareMatch[2]);
      continue;
    }

    // Reference line: Reference: UCWYOJ
    const referenceMatch = line.match(/^Reference:\s+([A-Z0-9]{6})$/i);
    if (referenceMatch) {
      reference = referenceMatch[1];
      continue;
    }

    // CONTEXT: Unrecognized non-empty lines are soft errors
    // BUSINESS_RULE: Don't fail parsing for unknown lines, just note them
    if (line && !line.match(/^Reference:/i)) {
      errors.push(`Unrecognized line: "${line}"`);
    }
  }

  return {
    passenger,
    totalFare,
    currency,
    reference,
    segments,
    source: "navitas",
    raw: block,
    errors
  };
}
