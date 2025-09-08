/**
 * @fileoverview Time utility tests
 * 
 * @description Unit tests for time parsing and formatting functions.
 * Tests edge cases like 12A/12P and various time formats.
 * 
 * @coverage Time parsing, formatting, and duration calculations
 */

import { describe, it, expect } from 'vitest';
import { parseLocalClock, formatClock, computeDurationMin, formatDuration } from '../time';

describe('parseLocalClock', () => {
  it('should parse morning times correctly', () => {
    expect(parseLocalClock('9A')).toBe(540); // 9:00 AM
    expect(parseLocalClock('12A')).toBe(0); // 12:00 AM (midnight)
    expect(parseLocalClock('1A')).toBe(60); // 1:00 AM
  });

  it('should parse afternoon/evening times correctly', () => {
    expect(parseLocalClock('12P')).toBe(720); // 12:00 PM (noon)
    expect(parseLocalClock('1P')).toBe(780); // 1:00 PM
    expect(parseLocalClock('11P')).toBe(1380); // 11:00 PM
  });

  it('should parse times with minutes', () => {
    expect(parseLocalClock('9:30A')).toBe(570); // 9:30 AM
    expect(parseLocalClock('2:15P')).toBe(855); // 2:15 PM
    expect(parseLocalClock('11:45P')).toBe(1425); // 11:45 PM
  });

  it('should handle edge cases', () => {
    expect(parseLocalClock('')).toBe(null);
    expect(parseLocalClock('invalid')).toBe(null);
    expect(parseLocalClock('25A')).toBe(null);
    expect(parseLocalClock('12:60A')).toBe(null);
  });
});

describe('formatClock', () => {
  it('should format times correctly', () => {
    expect(formatClock('9A')).toBe('9:00 AM');
    expect(formatClock('12A')).toBe('12:00 AM');
    expect(formatClock('12P')).toBe('12:00 PM');
    expect(formatClock('11:30P')).toBe('11:30 PM');
  });

  it('should handle invalid input', () => {
    expect(formatClock('invalid')).toBe('invalid');
    expect(formatClock('')).toBe('');
    expect(formatClock(null)).toBe('');
  });
});

describe('computeDurationMin', () => {
  it('should calculate same-day durations', () => {
    expect(computeDurationMin('9A', '11A', 0)).toBe(120); // 2 hours
    expect(computeDurationMin('2P', '4:30P', 0)).toBe(150); // 2.5 hours
  });

  it('should calculate next-day durations', () => {
    expect(computeDurationMin('11P', '1A', 1)).toBe(120); // 2 hours next day
    expect(computeDurationMin('10:30P', '6A', 1)).toBe(450); // 7.5 hours next day
  });

  it('should handle invalid input', () => {
    expect(computeDurationMin('invalid', '11A', 0)).toBe(null);
    expect(computeDurationMin('9A', 'invalid', 0)).toBe(null);
  });
});

describe('formatDuration', () => {
  it('should format durations correctly', () => {
    expect(formatDuration(60)).toBe('1h00');
    expect(formatDuration(90)).toBe('1h30');
    expect(formatDuration(120)).toBe('2h00');
    expect(formatDuration(150)).toBe('2h30');
  });

  it('should handle null input', () => {
    expect(formatDuration(null)).toBe('—');
  });
});
