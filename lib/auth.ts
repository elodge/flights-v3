/**
 * @fileoverview Authentication and authorization utilities
 * 
 * @description Core authentication helpers for server-side user management,
 * role checking, and route protection. Integrates with Supabase Auth and
 * custom user profiles.
 * 
 * @security All functions handle user sessions and role-based access control
 * @database users table for profile data and role information
 */

import { createServerClient } from './supabase-server'
import { Database } from './database.types'
import { redirect } from 'next/navigation'

/** Valid user roles in the system */
export type UserRole = Database['public']['Enums']['user_role']

/** User profile data from the users table */
export type User = Database['public']['Tables']['users']['Row']

/**
 * Authenticated user object with profile and role information
 * 
 * @description Combines Supabase auth user with our custom profile data
 * including role-based permissions for access control.
 */
export interface AuthUser {
  /** Supabase auth user ID */
  id: string
  /** User's email address */
  email: string
  /** Full user profile from users table */
  user?: User
  /** User's role: client, agent, or admin */
  role?: UserRole
}

/**
 * Gets the current authenticated user with profile and role information
 * 
 * @description Server-side helper to retrieve the current user's session
 * and profile data. Used in server components and API routes for authentication
 * and authorization checks.
 * 
 * @returns Promise<AuthUser | null> User object with profile data or null if not authenticated
 * 
 * @throws {Error} Database connection or query errors
 * @security Safe to call - returns null for unauthenticated users
 * @database Reads from users table to get profile and role
 * 
 * @example
 * ```typescript
 * const user = await getServerUser()
 * if (!user) {
 *   redirect('/login')
 * }
 * 
 * if (user.role !== 'admin') {
 *   return { error: 'Unauthorized' }
 * }
 * ```
 */
export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Get user profile from our users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email!,
      user: profile || undefined,
      role: profile?.role || 'client'
    }
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

// Server helper to require authentication
export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

// Server helper to require specific roles
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role || 'client')) {
    // Redirect based on role
    if (user.role === 'client') {
      redirect('/c')
    } else {
      redirect('/a')
    }
  }
  
  return user
}

// Server helper to sync user on first login
export async function syncUser(userId: string, email: string): Promise<User> {
  try {
    // Use admin client for user sync to bypass RLS restrictions
    const { createAdminClient } = await import('./supabase')
    const supabase = createAdminClient()
    
    // Try to get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingUser) {
      return existingUser
    }

    // Create new user if doesn't exist
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        role: 'client', // Default role
        full_name: email.split('@')[0] // Use email prefix as default name
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      throw error
    }

    return newUser
  } catch (error) {
    console.error('Error syncing user:', error)
    throw error
  }
}
