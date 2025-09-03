import { createServerClient } from './supabase-server'
import { Database } from './database.types'
import { redirect } from 'next/navigation'

export type UserRole = Database['public']['Enums']['user_role']
export type User = Database['public']['Tables']['users']['Row']

export interface AuthUser {
  id: string
  email: string
  user?: User
  role?: UserRole
}

// Server helper to get current user and role
export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Get user profile from our users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email!,
      user: profile || undefined,
      role: profile?.role || 'client'
    }
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

// Server helper to require authentication
export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

// Server helper to require specific roles
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role || 'client')) {
    // Redirect based on role
    if (user.role === 'client') {
      redirect('/c')
    } else {
      redirect('/a')
    }
  }
  
  return user
}

// Server helper to sync user on first login
export async function syncUser(userId: string, email: string): Promise<User> {
  try {
    const supabase = await createServerClient()
    
    // Try to get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingUser) {
      return existingUser
    }

    // Create new user if doesn't exist
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        role: 'client', // Default role
        full_name: email.split('@')[0] // Use email prefix as default name
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      throw error
    }

    return newUser
  } catch (error) {
    console.error('Error syncing user:', error)
    throw error
  }
}
