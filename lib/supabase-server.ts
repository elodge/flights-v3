import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { type NextRequest, type NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zcnvpckrxyytrbumrpeh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnZwY2tyeHl5dHJidW1ycGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjQxMDcsImV4cCI6MjA3MjQwMDEwN30.XViR6bade9nwxXu41MM4a10gzCQsLAKmf5M0nXcQrFY'

// Server client (for use in Server Components)
export const createServerClient = async () => {
  const cookieStore = await cookies()
  
  return createSSRServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Middleware client
export const createMiddlewareClient = (request: NextRequest, response: NextResponse) => {
  return createSSRServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}
