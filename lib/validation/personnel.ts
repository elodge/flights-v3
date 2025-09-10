/**
 * @fileoverview Validation schemas for tour personnel management
 * 
 * @description Zod schemas for validating personnel data in the Employee Portal.
 * Includes international phone number validation using E.164 format.
 * @access Employee only (agent/admin)
 * @security Validates input data for personnel creation and updates
 * @database tour_personnel table operations
 * @business_rule Personnel must be assigned to parties and have valid contact info
 * @business_rule Phone numbers stored in E.164 format for international compatibility
 */

import { z } from "zod";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

/**
 * Party enum for personnel assignment
 * @description Validates that personnel are assigned to one of the four parties
 * @business_rule All personnel must be assigned to A, B, C, or D Party
 */
export const PartyEnum = z.enum(['A Party','B Party','C Party','D Party']);

/**
 * Schema for adding new personnel
 * @description Validates required and optional fields for personnel creation
 * @param full_name - Required, 3-120 characters, trimmed
 * @param party - Required, must be one of the four parties
 * @param email - Optional, must be valid email format
 * @param phone - Optional, max 40 characters
 * @param seat_pref - Optional, max 40 characters
 * @param ff_numbers - Optional, max 200 characters
 * @param notes - Optional, max 1000 characters
 * @business_rule Full name and party are required, all other fields optional
 */
export const addPersonSchema = z.object({
  full_name: z.string().trim().min(3, "Full name must be at least 3 characters").max(120, "Full name must be less than 120 characters"),
  party: PartyEnum,
  email: z.string().trim().optional().refine((val) => {
    if (!val || val === '') return true;
    return z.string().email().safeParse(val).success;
  }, {
    message: "Invalid email format"
  }),
  phone: z.string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      return isValidPhoneNumber(val);
    }, {
      message: "Please enter a valid phone number"
    })
    .or(z.literal('').transform(() => undefined)),
  seat_pref: z.string().trim().max(40, "Seat preference must be less than 40 characters").optional().or(z.literal('').transform(() => undefined)),
  ff_numbers: z.string().trim().max(200, "Frequent flyer numbers must be less than 200 characters").optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal('').transform(() => undefined)),
});

/**
 * Schema for updating existing personnel
 * @description Allows partial updates of personnel data
 * @param status - Optional, must be 'active' or 'inactive'
 * @business_rule All fields from addPersonSchema are optional for updates
 */
export const updatePersonSchema = addPersonSchema.partial().extend({
  status: z.enum(['active','inactive']).optional(),
});

/**
 * Type definitions for TypeScript
 */
export type AddPersonInput = z.infer<typeof addPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

/**
 * Phone number processing utilities
 * 
 * @description Helper functions for parsing and formatting international phone numbers
 * @business_rule All phone numbers are stored in E.164 format in the database
 * @security Phone numbers are validated before processing
 */

/**
 * Parse phone number into E.164 and component parts
 * 
 * @description Parses a phone number string into E.164 format and extracts country/national components
 * @param phoneInput - Raw phone number string from user input
 * @param defaultCountry - Default country code to assume if number is national format
 * @returns Parsed phone data or null if invalid
 * 
 * @security Validates phone number before parsing
 * @database Prepares data for tour_personnel phone fields
 * 
 * @example
 * ```typescript
 * const result = parsePhoneInput("+1 (555) 123-4567");
 * // Returns: { e164: "+15551234567", country: "US", nationalNumber: "5551234567" }
 * ```
 */
export function parsePhoneInput(phoneInput: string | undefined, defaultCountry?: string) {
  if (!phoneInput || phoneInput.trim() === '') {
    return null;
  }

  try {
    // Parse with optional default country
    const parsed = parsePhoneNumber(phoneInput, defaultCountry as any);
    
    if (!parsed) {
      return null;
    }

    // Use isPossible() instead of isValid() for more lenient validation
    // This allows test numbers and numbers that might be valid but not in the strict database
    if (!parsed.isPossible()) {
      return null;
    }

    return {
      e164: parsed.format('E.164'),
      country: parsed.country || null,
      nationalNumber: parsed.nationalNumber,
      extension: parsed.ext || null,
    };
  } catch (error) {
    console.warn('Failed to parse phone number:', phoneInput, error);
    return null;
  }
}

/**
 * Format phone number for display
 * 
 * @description Formats a phone number in national or international format for display
 * @param e164Number - Phone number in E.164 format from database
 * @param format - Display format ('national' | 'international')
 * @returns Formatted phone number string
 * 
 * @business_rule Use national format for domestic display, international for multi-country
 * 
 * @example
 * ```typescript
 * formatPhoneDisplay("+15551234567", "national"); // "(555) 123-4567"
 * formatPhoneDisplay("+15551234567", "international"); // "+1 555 123 4567"
 * ```
 */
export function formatPhoneDisplay(e164Number: string | null, format: 'national' | 'international' = 'international'): string {
  if (!e164Number) return '';

  try {
    const parsed = parsePhoneNumber(e164Number);
    if (!parsed || !parsed.isValid()) {
      return e164Number; // Fallback to raw value
    }

    return format === 'national' ? parsed.formatNational() : parsed.formatInternational();
  } catch (error) {
    console.warn('Failed to format phone number:', e164Number, error);
    return e164Number; // Fallback to raw value
  }
}

export type PartyType = z.infer<typeof PartyEnum>;
