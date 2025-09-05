/**
 * @fileoverview Invite Acceptance Page
 * 
 * @description Public page for accepting user invitations via Supabase Auth invites.
 * Handles both Supabase Auth invite flow and legacy token-based invites.
 * 
 * @route /invite/accept
 * @access Public (invite-based)
 * @security Validates invite tokens and prevents expired/invalid invites
 * @database Queries invites table and creates users/auth accounts
 * @business_rule Invited users get appropriate role and artist assignments
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'

const acceptInviteSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(1, 'Full name is required').max(100)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type AcceptInviteForm = z.infer<typeof acceptInviteSchema>

interface InviteInfo {
  email: string
  role: string
  expiresAt: string
  isValid: boolean
}

export default function AcceptInvitePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()
  
  const token = searchParams.get('token')

  const form = useForm<AcceptInviteForm>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      fullName: ''
    }
  })

  // CONTEXT: Handle both Supabase Auth invite flow and legacy token flow
  // ALGORITHM: Check if user is authenticated (Supabase Auth) or validate token (legacy)
  useEffect(() => {
    const validateInvite = async () => {
      // Wait for user loading to complete
      if (userLoading) return

      // CONTEXT: Supabase Auth invite flow - user is already authenticated
      if (user && !token) {
        // User came from Supabase Auth invite, redirect to appropriate portal
        try {
          const response = await fetch('/api/auth/me')
          const userData = await response.json()
          
          if (userData.role === 'client') {
            router.push('/c')
          } else {
            router.push('/a')
          }
        } catch (error) {
          console.error('Error getting user data:', error)
          setError('Failed to get user information')
          setIsValidating(false)
        }
        return
      }

      // CONTEXT: Legacy token-based invite flow
      if (!token) {
        setError('Invalid invite link')
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/invites/validate?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invite link')
          setIsValidating(false)
          return
        }

        setInviteInfo(data)
        form.setValue('fullName', data.fullName || '')
        setIsValidating(false)
      } catch (error) {
        console.error('Error validating invite:', error)
        setError('Failed to validate invite')
        setIsValidating(false)
      }
    }

    validateInvite()
  }, [token, form, user, userLoading, router])

  const onSubmit = async (data: AcceptInviteForm) => {
    if (!token || !inviteInfo) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password: data.password,
          fullName: data.fullName
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to accept invite')
        return
      }

      // CONTEXT: Redirect to appropriate portal based on role
      // BUSINESS_RULE: Clients go to /c, agents go to /a
      if (result.role === 'client') {
        router.push('/c')
      } else {
        router.push('/a')
      }
    } catch (error) {
      console.error('Error accepting invite:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Validating invite...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!inviteInfo || !inviteInfo.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>
              This invite link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join as a <strong>{inviteInfo.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>Email:</strong> {inviteInfo.email}</p>
                <p><strong>Role:</strong> {inviteInfo.role}</p>
                <p><strong>Expires:</strong> {new Date(inviteInfo.expiresAt).toLocaleDateString()}</p>
              </div>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
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
                        placeholder="Create a password"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
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
                Accept Invitation
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
