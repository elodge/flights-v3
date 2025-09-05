/**
 * @fileoverview Supabase client configuration for browser and admin operations
 * 
 * @description Provides configured Supabase clients for different contexts:
 * - Browser client for client-side operations with RLS
 * - Admin client for server-side operations with elevated permissions
 * 
 * @security Browser client uses anon key with RLS, admin client bypasses RLS
 * @database All operations go through Supabase with TypeScript types
 */

import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// SECURITY: These are public environment variables, safe for browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zcnvpckrxyytrbumrpeh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnZwY2tyeHl5dHJidW1ycGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjQxMDcsImV4cCI6MjA3MjQwMDEwN30.XViR6bade9nwxXu41MM4a10gzCQsLAKmf5M0nXcQrFY'

/**
 * Browser Supabase client for client-side operations
 * 
 * @description Configured with anon key for RLS-protected operations.
 * Automatically handles user sessions and respects Row Level Security policies.
 * Properly configured for SSR with cookie-based session persistence.
 * 
 * @security Uses anonymous key - RLS policies control data access
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase'
 * 
 * const { data: user } = await supabase.auth.getUser()
 * const { data: projects } = await supabase.from('projects').select('*')
 * ```
 */
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Creates an admin Supabase client with elevated permissions
 * 
 * @description Uses service role key to bypass RLS for server-side operations
 * like user management, bulk operations, and system maintenance.
 * 
 * @returns Supabase client with admin privileges
 * 
 * @throws {Error} When SUPABASE_SERVICE_ROLE_KEY environment variable is missing
 * @security Uses service role key - bypasses all RLS policies
 * @warning Only use for trusted server-side operations
 * 
 * @example
 * ```typescript
 * const adminClient = createAdminClient()
 * // Can access any data regardless of RLS policies
 * const { data } = await adminClient.from('users').select('*')
 * ```
 */
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
