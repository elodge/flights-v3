'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type LoginForm = z.infer<typeof loginSchema>
type MagicLinkForm = z.infer<typeof magicLinkSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLoading, setIsMagicLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password')
  const [magicEmail, setMagicEmail] = useState('')
  const router = useRouter()

  // Clear errors when switching modes
  const handleModeChange = (mode: 'password' | 'magic') => {
    setLoginMode(mode)
    setError(null)
    setSuccess(null)
  }

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const magicForm = useForm<MagicLinkForm>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: ''
    }
  })

  // CONTEXT: Clear any stale auth tokens on login page load
  // SECURITY: Prevents "Invalid Refresh Token" errors from stale sessions
  // FALLBACK: Silently handles token cleanup without affecting UX
  useEffect(() => {
    const clearStaleSession = async () => {
      try {
        // SECURITY: Sign out any existing stale session
        // This clears invalid refresh tokens without showing errors
        await supabase.auth.signOut({ scope: 'local' })
        
        // CONTEXT: Clear all browser storage to prevent "test" user ID issues
        // SECURITY: Ensures clean authentication state
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
          
          // Clear any Supabase-specific storage
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase') || key.includes('sb-')) {
              localStorage.removeItem(key)
            }
          })
        }
      } catch (error) {
        // FALLBACK: Ignore signOut errors - we're already on login page
        console.debug('Session cleanup (expected):', error)
      }
    }

    clearStaleSession()
  }, [])

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)

    try {
      // CONTEXT: Clear any existing session before attempting new login
      // SECURITY: Ensures clean state for authentication
      await supabase.auth.signOut({ scope: 'local' })

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        // CONTEXT: Handle specific refresh token errors gracefully
        if (authError.message.includes('refresh') || authError.message.includes('token')) {
          setError('Session expired. Please try signing in again.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        console.log('Auth data:', {
          userId: authData.user.id,
          email: authData.user.email,
          userIdType: typeof authData.user.id
        })

        // CONTEXT: Validate user ID is a proper UUID before syncing
        // SECURITY: Prevent invalid UUIDs from causing database errors
        const userId = authData.user.id
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        
        if (!uuidRegex.test(userId)) {
          console.error('Invalid user ID format:', userId)
          setError('Authentication error: Invalid user ID format')
          return
        }

        // Sync user to our database
        const response = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            email: authData.user.email
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Failed to sync user:', errorData)
          setError(`Authentication sync failed: ${errorData.error || 'Unknown error'}`)
          return
        }

        const userData = await response.json()
        const role = userData.user?.role || 'client'

        // CONTEXT: Wait for auth state to be fully synchronized before navigation
        // ALGORITHM: Give the useUser hook time to process the auth state change
        await new Promise(resolve => setTimeout(resolve, 500))

        // CONTEXT: Force a hard refresh to ensure auth state is properly synced on Vercel
        // SECURITY: This prevents the "sign in button still showing" issue after successful login
        // FALLBACK: Use window.location.href for Vercel deployment compatibility
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        } else {
          router.replace('/')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const onMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!magicEmail) {
      setError('Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(magicEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsMagicLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: {
          // Redirect to auth callback page to handle token and sync user
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Magic link sent! Check your email and click the link to sign in.')
    } catch (error) {
      console.error('Magic link error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsMagicLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your Daysheets Flight Management account
          </CardDescription>
          <div className="flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => handleModeChange('password')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                loginMode === 'password'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('magic')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                loginMode === 'magic'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Magic Link
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loginMode === 'password' ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>
          ) : (
            <form onSubmit={onMagicLinkSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="magic-email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email
                </label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="Enter your email"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  disabled={isMagicLoading}
                  className="w-full"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isMagicLoading}>
                {isMagicLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Magic Link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
