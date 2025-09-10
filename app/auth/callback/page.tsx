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
        // CONTEXT: Extract auth parameters from URL
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')
        const tokenHash = urlParams.get('token_hash')
        const type = urlParams.get('type')
        
        // CONTEXT: Handle magic link authentication
        if ((token || tokenHash) && (type === 'magiclink' || type === 'email')) {
          console.log('Processing magic link token...')
          
          // SECURITY: Verify the magic link token
          // Handle both 'token' and 'token_hash' parameters for compatibility
          const tokenToUse = tokenHash || token
          if (!tokenToUse) {
            console.error('No token found in URL parameters')
            router.push('/login?error=no-token')
            return
          }
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenToUse,
            type: 'email'
          })
          
          if (error) {
            console.error('Magic link verification error:', error)
            router.push('/login?error=magic-link-verification-failed')
            return
          }
          
          if (data.session?.user) {
            console.log('Magic link authentication successful')
            // Continue with user sync below
          } else {
            console.error('No session after magic link verification')
            router.push('/login?error=no-session-after-verification')
            return
          }
        } else {
          // CONTEXT: Handle other auth callbacks (OAuth, etc.)
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Auth callback error:', error)
            router.push('/login?error=auth-callback-failed')
            return
          }
          
          if (!data.session?.user) {
            console.error('No session found')
            router.push('/login?error=no-session')
            return
          }
        }

        // CONTEXT: Get the current session (either from magic link or other auth)
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (sessionData.session?.user) {
          // CONTEXT: Sync the user to our database (same as password login)
          // SECURITY: Ensures user exists in our users table with proper role
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: sessionData.session.user.id,
              email: sessionData.session.user.email
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
