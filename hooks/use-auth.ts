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

  // Get user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching user profile:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Exception fetching user profile:', error)
      setProfile(null)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) {
        // Small delay to ensure auth context is set
        setTimeout(async () => {
          await fetchProfile(session.user.id)
        }, 100)
      }
      setLoading(false)
    }

    getInitialSession()

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
