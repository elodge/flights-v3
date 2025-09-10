'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

/**
 * Auth Callback Page
 * 
 * @description Handles authentication callbacks from magic links and other auth providers.
 * Processes the auth token and redirects users to the appropriate dashboard.
 * 
 * @access Public (callback handler)
 * @security Validates auth tokens and syncs users to database
 */
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // CONTEXT: Handle the auth callback from magic link
        // SECURITY: Supabase automatically validates the token in the URL
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=auth-callback-failed')
          return
        }

        if (data.session?.user) {
          // CONTEXT: Sync the user to our database (same as password login)
          // SECURITY: Ensures user exists in our users table with proper role
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: data.session.user.id,
              email: data.session.user.email
            })
          })

          if (!response.ok) {
            console.error('Failed to sync user after magic link')
            router.push('/login?error=sync-failed')
            return
          }

          // CONTEXT: Force a hard refresh to ensure auth state is properly synced
          // FALLBACK: Same approach as password login for consistency
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          } else {
            router.replace('/')
          }
        } else {
          // No session found, redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error)
        router.push('/login?error=unexpected-error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  )
}
