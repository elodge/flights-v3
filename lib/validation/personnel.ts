/**
 * @fileoverview Validation schemas for tour personnel management
 * 
 * @description Zod schemas for validating personnel data in the Employee Portal
 * @access Employee only (agent/admin)
 * @security Validates input data for personnel creation and updates
 * @database tour_personnel table operations
 * @business_rule Personnel must be assigned to parties and have valid contact info
 */

import { z } from "zod";

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
  email: z.string().email("Invalid email format").optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().trim().max(40, "Phone must be less than 40 characters").optional().or(z.literal('').transform(() => undefined)),
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
export type PartyType = z.infer<typeof PartyEnum>;
