/**
 * @fileoverview Client-side authentication hooks
 * 
 * @description Custom React hooks for managing user authentication state,
 * role checking, and route protection in client components.
 * 
 * @access Client-side only
 * @security Handles user sessions and role-based access control
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, UserRole } from '@/lib/auth'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/**
 * Return type for the useUser hook
 * 
 * @description Provides complete user state including authentication,
 * profile data, role information, and loading states.
 */
interface UseUserReturn {
  /** Supabase auth user object */
  user: SupabaseUser | null
  /** User profile from our users table */
  profile: User | null
  /** User's role for access control */
  role: UserRole | null
  /** Whether user data is being loaded */
  loading: boolean
  /** Function to sign out the user */
  signOut: () => Promise<void>
}

/**
 * Client-side hook for user authentication and profile management
 * 
 * @description Manages user authentication state, profile data, and role information.
 * Automatically syncs with Supabase auth changes and provides sign-out functionality.
 * 
 * @returns UseUserReturn Object containing user, profile, role, loading state, and signOut function
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, role, loading, signOut } = useUser()
 *   
 *   if (loading) return <div>Loading...</div>
 *   if (!user) return <div>Please log in</div>
 *   
 *   return (
 *     <div>
 *       <p>Welcome, {user.email}!</p>
 *       <p>Role: {role}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  /**
   * Fetches user profile data directly from Supabase
   * 
   * @description Queries the users table directly instead of using API routes
   * to avoid 401 authentication issues in client-side components. Fixed issue
   * where /api/auth/profile was returning 401 due to missing auth headers.
   * 
   * @param userId - UUID of the user to fetch profile for
   * 
   * @security Uses client-side Supabase client with proper auth context
   * @database Queries users table with user's own ID (RLS enforced)
   * @api_fix Replaced /api/auth/profile call with direct Supabase query
   * 
   * @business_rule User can only fetch their own profile (enforced by RLS)
   */
  const fetchProfile = async (userId: string) => {
    try {
      // CONTEXT: Direct Supabase query to avoid API route authentication issues
      // API_FIX: Previously used fetch('/api/auth/profile') which returned 401
      // SECURITY: RLS ensures users can only access their own profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Failed to fetch user profile:', error)
        setProfile(null)
      } else {
        setProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setProfile(null)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      // Clear all local storage and force refresh to ensure clean state
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/login'
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error signing out:', error)
      // Fallback: force navigation to logout route
      if (typeof window !== 'undefined') {
        window.location.href = '/logout'
      }
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // NEXTJS_15_FIX: Ensure session is properly initialized with timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        )
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (error) {
          console.error('Session error:', error)
          setLoading(false)
          return
        }
        
        setUser(session?.user || null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error getting initial session:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // FALLBACK: Set loading to false after 5 seconds to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    return () => clearTimeout(timeout)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    profile,
    role: profile?.role || null,
    loading,
    signOut
  }
}

// Hook to require specific roles (client-side)
export function useRequireRole(allowedRoles: UserRole[]) {
  const { user, role, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && role && !allowedRoles.includes(role)) {
      // Redirect based on role
      if (role === 'client') {
        router.push('/c')
      } else {
        router.push('/a')
      }
    }
  }, [user, role, loading, allowedRoles, router])

  return { user, role, loading }
}
