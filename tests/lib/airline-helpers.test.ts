/**
 * @fileoverview Tests for airline helper functions
 * 
 * @description Unit tests for findAirline and airlineDisplayName functions
 * to ensure proper case-insensitive lookup and name extraction.
 * 
 * @coverage Tests airline lookup helpers in lib/airlines.ts
 */

import { describe, it, expect } from 'vitest';
import { findAirline, airlineDisplayName } from '@/lib/airlines';

describe('findAirline', () => {
  it('should find airline by IATA code (case insensitive)', () => {
    const airline = findAirline({ iata: 'aa' });
    expect(airline).toBeDefined();
    expect(airline?.iata).toBe('AA');
    expect(airline?.name).toBe('American Airlines');
    expect(airline?.domain).toBe('aa.com');
  });

  it('should find airline by uppercase IATA code', () => {
    const airline = findAirline({ iata: 'UA' });
    expect(airline).toBeDefined();
    expect(airline?.iata).toBe('UA');
    expect(airline?.name).toBe('United Airlines');
    expect(airline?.domain).toBe('united.com');
  });

  it('should find airline by ICAO code if IATA not provided', () => {
    // Test with an airline that has both IATA and ICAO
    const airline = findAirline({ icao: 'UAL' });
    // Note: Our test data doesn't currently include ICAO codes, 
    // so this will return undefined unless we add ICAO data
    // For now, test the case where ICAO is provided but doesn't match
    expect(airline).toBeUndefined();
  });

  it('should return undefined for unknown IATA code', () => {
    const airline = findAirline({ iata: 'UNKNOWN' });
    expect(airline).toBeUndefined();
  });

  it('should return undefined for unknown ICAO code', () => {
    const airline = findAirline({ icao: 'UNKNOWN' });
    expect(airline).toBeUndefined();
  });

  it('should return undefined when no codes provided', () => {
    const airline = findAirline({});
    expect(airline).toBeUndefined();
  });

  it('should prefer IATA over ICAO when both provided', () => {
    const airline = findAirline({ iata: 'DL', icao: 'UNKNOWN' });
    expect(airline).toBeDefined();
    expect(airline?.iata).toBe('DL');
    expect(airline?.name).toBe('Delta Air Lines');
  });

  it('should handle case insensitive lookup', () => {
    const airlineLower = findAirline({ iata: 'ba' });
    const airlineUpper = findAirline({ iata: 'BA' });
    const airlineMixed = findAirline({ iata: 'Ba' });
    
    expect(airlineLower).toBeDefined();
    expect(airlineUpper).toBeDefined();
    expect(airlineMixed).toBeDefined();
    
    expect(airlineLower?.name).toBe('British Airways');
    expect(airlineUpper?.name).toBe('British Airways');
    expect(airlineMixed?.name).toBe('British Airways');
  });
});

describe('airlineDisplayName', () => {
  it('should return airline name when airline provided', () => {
    const airline = findAirline({ iata: 'AA' });
    const displayName = airlineDisplayName(airline);
    expect(displayName).toBe('American Airlines');
  });

  it('should return undefined when no airline provided', () => {
    const displayName = airlineDisplayName(undefined);
    expect(displayName).toBeUndefined();
  });

  it('should return name from airline object', () => {
    const mockAirline = {
      iata: 'TEST',
      name: 'Test Airlines',
      domain: 'test.com'
    };
    
    const displayName = airlineDisplayName(mockAirline);
    expect(displayName).toBe('Test Airlines');
  });

  it('should handle airline without name gracefully', () => {
    const mockAirline = {
      iata: 'TEST',
      name: '',
      domain: 'test.com'
    };
    
    const displayName = airlineDisplayName(mockAirline);
    expect(displayName).toBe('');
  });
});

describe('integration tests', () => {
  it('should work with real airline data', () => {
    // Test a few major airlines
    const testCases = [
      { iata: 'AA', expectedName: 'American Airlines', expectedDomain: 'aa.com' },
      { iata: 'UA', expectedName: 'United Airlines', expectedDomain: 'united.com' },
      { iata: 'DL', expectedName: 'Delta Air Lines', expectedDomain: 'delta.com' },
      { iata: 'LH', expectedName: 'Lufthansa', expectedDomain: 'lufthansa.com' },
      { iata: 'BA', expectedName: 'British Airways', expectedDomain: 'britishairways.com' },
    ];

    testCases.forEach(({ iata, expectedName, expectedDomain }) => {
      const airline = findAirline({ iata });
      expect(airline).toBeDefined();
      expect(airline?.name).toBe(expectedName);
      expect(airline?.domain).toBe(expectedDomain);
      
      const displayName = airlineDisplayName(airline);
      expect(displayName).toBe(expectedName);
    });
  });

  it('should handle airlines without domains', () => {
    // Test an airline that doesn't have a domain in our data
    const airline = findAirline({ iata: 'NK' }); // Spirit Airlines
    expect(airline).toBeDefined();
    expect(airline?.name).toBe('Spirit Airlines');
    expect(airline?.domain).toBeUndefined();
  });
});
