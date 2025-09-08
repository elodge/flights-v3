/**
 * @fileoverview Unit tests for Navitas parser
 * 
 * @description Tests the parseNavitasText function with various input formats
 * including single options, multiple options, and edge cases.
 * 
 * @coverage Tests all parsing logic, regex patterns, and error handling
 */

import { describe, it, expect } from 'vitest';
import { parseNavitasText } from '../navitas';

describe('parseNavitasText', () => {
  describe('Case 1: Single option with multiple segments', () => {
    const singleOptionText = `Evan Lodge
AA 2689 10Aug PHX LAX  10:15A 11:43A
AA 8453 10Aug LAX HND  2:15P 5:25P +1
AA 170  15Aug HND LAX 11:55A 6:00A
AA 1668 15Aug LAX PHX 10:00A 11:26A
TOTAL FARE INC TAX  USD5790.81
Reference: UCWYOJ`;

    it('should parse single option correctly', () => {
      const result = parseNavitasText(singleOptionText);
      
      expect(result.options).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      
      const option = result.options[0];
      expect(option.passenger).toBe('Evan Lodge');
      expect(option.totalFare).toBe(5790.81);
      expect(option.currency).toBe('USD');
      expect(option.reference).toBe('UCWYOJ');
      expect(option.source).toBe('navitas');
      expect(option.segments).toHaveLength(4);
    });

    it('should parse all segments correctly', () => {
      const result = parseNavitasText(singleOptionText);
      const option = result.options[0];
      
      // First segment
      expect(option.segments[0]).toEqual({
        airline: 'AA',
        flightNumber: '2689',
        dateRaw: '10Aug',
        origin: 'PHX',
        destination: 'LAX',
        depTimeRaw: '10:15A',
        arrTimeRaw: '11:43A',
        dayOffset: 0
      });
      
      // Second segment with day offset
      expect(option.segments[1]).toEqual({
        airline: 'AA',
        flightNumber: '8453',
        dateRaw: '10Aug',
        origin: 'LAX',
        destination: 'HND',
        depTimeRaw: '2:15P',
        arrTimeRaw: '5:25P',
        dayOffset: 1
      });
      
      // Third segment
      expect(option.segments[2]).toEqual({
        airline: 'AA',
        flightNumber: '170',
        dateRaw: '15Aug',
        origin: 'HND',
        destination: 'LAX',
        depTimeRaw: '11:55A',
        arrTimeRaw: '6:00A',
        dayOffset: 0
      });
      
      // Fourth segment
      expect(option.segments[3]).toEqual({
        airline: 'AA',
        flightNumber: '1668',
        dateRaw: '15Aug',
        origin: 'LAX',
        destination: 'PHX',
        depTimeRaw: '10:00A',
        arrTimeRaw: '11:26A',
        dayOffset: 0
      });
    });
  });

  describe('Case 2: Two options in one paste', () => {
    const twoOptionsText = `John Smith
UA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD450.00
Reference: ABC123

Jane Doe
DL 456 16Mar JFK LAX 12:00P 3:00P
TOTAL FARE INC TAX USD380.50
Reference: DEF456`;

    it('should parse two separate options', () => {
      const result = parseNavitasText(twoOptionsText);
      
      expect(result.options).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      
      // First option
      const option1 = result.options[0];
      expect(option1.passenger).toBe('John Smith');
      expect(option1.totalFare).toBe(450.00);
      expect(option1.currency).toBe('USD');
      expect(option1.reference).toBe('ABC123');
      expect(option1.segments).toHaveLength(1);
      expect(option1.segments[0].airline).toBe('UA');
      expect(option1.segments[0].flightNumber).toBe('123');
      
      // Second option
      const option2 = result.options[1];
      expect(option2.passenger).toBe('Jane Doe');
      expect(option2.totalFare).toBe(380.50);
      expect(option2.currency).toBe('USD');
      expect(option2.reference).toBe('DEF456');
      expect(option2.segments).toHaveLength(1);
      expect(option2.segments[0].airline).toBe('DL');
      expect(option2.segments[0].flightNumber).toBe('456');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty input', () => {
      const result = parseNavitasText('');
      expect(result.options).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid input');
    });

    it('should handle invalid input type', () => {
      const result = parseNavitasText(null as any);
      expect(result.options).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid input');
    });

    it('should handle text with no valid segments', () => {
      const result = parseNavitasText('Just some random text\nwith no flight data');
      expect(result.options).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle option without passenger name', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD450.00
Reference: ABC123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].passenger).toBeNull();
      expect(result.options[0].segments).toHaveLength(1);
    });

    it('should handle option without fare information', () => {
      const text = `John Smith
AA 123 15Mar LAX JFK 8:00A 4:30P
Reference: ABC123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].totalFare).toBeNull();
      expect(result.options[0].currency).toBeNull();
    });

    it('should handle option without reference', () => {
      const text = `John Smith
AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD450.00`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].reference).toBeNull();
    });

    it('should handle unrecognized lines as soft errors', () => {
      const text = `John Smith
AA 123 15Mar LAX JFK 8:00A 4:30P
Some unrecognized line
TOTAL FARE INC TAX USD450.00
Reference: ABC123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].errors).toHaveLength(1);
      expect(result.options[0].errors[0]).toContain('Unrecognized line');
    });

    it('should handle different currency formats', () => {
      const text = `John Smith
AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX EUR450.00
Reference: ABC123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].currency).toBe('EUR');
    });

    it('should handle fare with decimal places', () => {
      const text = `John Smith
AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD1234.56
Reference: ABC123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].totalFare).toBe(1234.56);
    });

    it('should handle fare without decimal places', () => {
      const text = `John Smith
AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD500
Reference: ABC123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].totalFare).toBe(500);
    });
  });

  describe('Flight segment parsing', () => {
    it('should handle segments with day offset', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P +1
TOTAL FARE INC TAX USD450.00`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].segments[0].dayOffset).toBe(1);
    });

    it('should handle segments without day offset', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD450.00`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].segments[0].dayOffset).toBe(0);
    });

    it('should handle different time formats', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P
BB 456 16Mar JFK LAX 12:00P 3:00P
TOTAL FARE INC TAX USD450.00`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].segments).toHaveLength(2);
      expect(result.options[0].segments[0].depTimeRaw).toBe('8:00A');
      expect(result.options[0].segments[0].arrTimeRaw).toBe('4:30P');
      expect(result.options[0].segments[1].depTimeRaw).toBe('12:00P');
      expect(result.options[0].segments[1].arrTimeRaw).toBe('3:00P');
    });

    it('should handle different date formats', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P
BB 456 1Jan JFK LAX 12:00P 3:00P
CC 789 25Dec LAX SFO 6:00A 7:30A
TOTAL FARE INC TAX USD450.00`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].segments).toHaveLength(3);
      expect(result.options[0].segments[0].dateRaw).toBe('15Mar');
      expect(result.options[0].segments[1].dateRaw).toBe('1Jan');
      expect(result.options[0].segments[2].dateRaw).toBe('25Dec');
    });
  });

  describe('Reference parsing', () => {
    it('should handle 6-character alphanumeric references', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD450.00
Reference: ABC123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].reference).toBe('ABC123');
    });

    it('should handle numeric references', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD450.00
Reference: 123456`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].reference).toBe('123456');
    });

    it('should handle case-insensitive reference parsing', () => {
      const text = `AA 123 15Mar LAX JFK 8:00A 4:30P
TOTAL FARE INC TAX USD450.00
reference: abc123`;
      
      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].reference).toBe('abc123');
    });

    it('should parse British Airways BATWO format', () => {
      const text = `BATWO EIGHTZEROZERO 29Jun LAX LHR 5:05P 11:35A +1
BATWO FOURFIVETHREE 30Jun LHR IBZ 2:00P 5:30P
BATWO FOURONETWO 05Sep IBZ LHR 3:10P 4:40P
BATWO SEVENFIVE 05Sep LHR LAS 5:30P 8:10P`;

      const result = parseNavitasText(text);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].segments).toHaveLength(4);
      
      // Check first segment
      expect(result.options[0].segments[0].airline).toBe('BA');
      expect(result.options[0].segments[0].flightNumber).toBe('800');
      expect(result.options[0].segments[0].origin).toBe('LAX');
      expect(result.options[0].segments[0].destination).toBe('LHR');
      
      // Check flight number conversions
      expect(result.options[0].segments[1].flightNumber).toBe('453');
      expect(result.options[0].segments[2].flightNumber).toBe('412');
      expect(result.options[0].segments[3].flightNumber).toBe('75');
      
      // Should handle missing optional fields gracefully
      expect(result.options[0].passenger).toBeNull();
      expect(result.options[0].totalFare).toBeNull();
      expect(result.options[0].reference).toBeNull();
    });
  });
});
