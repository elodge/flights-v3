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

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
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
        await new Promise(resolve => setTimeout(resolve, 100))

        // Redirect to home - role-based redirects will happen in layouts
        // Use router.replace to allow error handling, not immediate page reload
        router.replace('/')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
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
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
