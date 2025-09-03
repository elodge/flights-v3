import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zcnvpckrxyytrbumrpeh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnZwY2tyeHl5dHJidW1ycGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjQxMDcsImV4cCI6MjA3MjQwMDEwN30.XViR6bade9nwxXu41MM4a10gzCQsLAKmf5M0nXcQrFY'

// Browser client
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Admin client (for server-side operations requiring elevated permissions)
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
