/**
 * @fileoverview Canonical Application Types
 * 
 * @description Strongly-typed shapes derived from Supabase generated types.
 * These types provide a single source of truth for UI components and data flow.
 * 
 * @database Maps to Database types from @/lib/database.types
 * @business_rule Normalizes database fields for consistent UI consumption
 */

import type { Database } from '@/lib/database.types';

export type Db = Database;

// ============================================================================
// RAW DATABASE TYPES
// ============================================================================

// Core tables
export type UserRow = Db['public']['Tables']['users']['Row'];
export type InviteRow = Db['public']['Tables']['invites']['Row'];
export type ArtistRow = Db['public']['Tables']['artists']['Row'];
export type ArtistAssignmentRow = Db['public']['Tables']['employee_artists']['Row'];
export type TourRow = Db['public']['Tables']['tours']['Row'];
export type LegRow = Db['public']['Tables']['legs']['Row'];
export type FlightOptionRow = Db['public']['Tables']['flight_options']['Row'];
export type SelectionRow = Db['public']['Tables']['selections']['Row'];

// Enums
export type UserRole = Db['public']['Enums']['user_role'];
export type PartyType = Db['public']['Enums']['party_type'];

// ============================================================================
// COMPOSITE TYPES FOR UI
// ============================================================================

/**
 * Artist assignment with related artist data
 */
export type ArtistAssignment = {
  artist_id: string;
  artists: Pick<ArtistRow, 'id' | 'name'>;
};

/**
 * Pending invite information
 */
export type PendingInvite = Pick<InviteRow, 'email' | 'expires_at' | 'accepted_at'> | null;

/**
 * Complete user detail for admin management
 * Maps DB "is_active" into normalized "status" field for UI consistency
 */
export type UserDetail = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;    // Raw DB field (source of truth)
  status: 'active' | 'inactive'; // Derived from is_active for UI
  created_at: string;
  updated_at: string;
  artistAssignments: ArtistAssignment[];
  pendingInvite: PendingInvite;
};

/**
 * Simplified user for general use
 */
export type User = Pick<UserDetail, 'id' | 'email' | 'full_name' | 'role' | 'is_active' | 'status'>;

/**
 * Artist with assignment information
 */
export type ArtistWithAssignments = ArtistRow & {
  assignments?: ArtistAssignment[];
};

/**
 * Tour with related data
 */
export type TourDetail = TourRow & {
  legs?: LegRow[];
  artist?: Pick<ArtistRow, 'id' | 'name'>;
};

/**
 * Leg with flight options
 */
export type LegDetail = LegRow & {
  flight_options?: FlightOptionRow[];
  tour?: Pick<TourRow, 'id' | 'name'>;
};

/**
 * Flight option with enriched data
 */
export type FlightOptionDetail = FlightOptionRow & {
  leg?: Pick<LegRow, 'id' | 'departure_city' | 'arrival_city'>;
};

/**
 * Selection with related data
 */
export type SelectionDetail = SelectionRow & {
  flight_option?: FlightOptionDetail;
  leg?: Pick<LegRow, 'id' | 'departure_city' | 'arrival_city'>;
  tour?: Pick<TourRow, 'id' | 'name'>;
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Safe JSON type for API responses
 */
export type Json = Record<string, unknown>;

/**
 * String map for simple key-value pairs
 */
export type StringMap = Record<string, string>;

/**
 * Pagination parameters
 */
export type PaginationParams = {
  page: number;
  limit: number;
};

/**
 * Paginated response wrapper
 */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

/**
 * API response wrapper
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// ============================================================================
// FORM TYPES
// ============================================================================

/**
 * User creation/update form data
 */
export type UserFormData = {
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  artistIds: string[];
};

/**
 * Invite creation form data
 */
export type InviteFormData = {
  email: string;
  role: UserRole;
  artistIds: string[];
};

/**
 * Tour creation form data
 */
export type TourFormData = {
  name: string;
  artist_id: string;
  start_date: string;
  end_date: string;
};

/**
 * Leg creation form data
 */
export type LegFormData = {
  tour_id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  arrival_date: string;
};

// ============================================================================
// SEARCH/FILTER TYPES
// ============================================================================

/**
 * User search parameters
 */
export type UserSearchParams = {
  q?: string;
  role?: UserRole;
  is_active?: boolean;
  page?: number;
  limit?: number;
};

/**
 * Tour search parameters
 */
export type TourSearchParams = {
  q?: string;
  artist_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ['client', 'agent', 'admin'].includes(value);
}

/**
 * Type guard to check if value is a valid PartyType
 */
export function isPartyType(value: unknown): value is PartyType {
  return typeof value === 'string' && ['artist', 'crew', 'guest'].includes(value);
}

/**
 * Type guard to check if user is active
 */
export function isActiveUser(user: User | UserDetail): boolean {
  return user.is_active === true;
}

/**
 * Type guard to check if user has admin role
 */
export function isAdminUser(user: User | UserDetail): boolean {
  return user.role === 'admin';
}

/**
 * Type guard to check if user has agent role
 */
export function isAgentUser(user: User | UserDetail): boolean {
  return user.role === 'agent';
}

/**
 * Type guard to check if user has client role
 */
export function isClientUser(user: User | UserDetail): boolean {
  return user.role === 'client';
}
