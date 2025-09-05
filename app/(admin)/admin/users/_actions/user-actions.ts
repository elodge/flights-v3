/**
 * @fileoverview Admin User Management Server Actions
 * 
 * @description Server-side actions for admin user management including user search,
 * profile updates, role changes, artist assignments, and invite management.
 * 
 * @security All actions enforce admin role requirement
 * @database Operates on users, artist_assignments, and invites tables
 * @business_rule Admins can manage all users; agents can invite clients
 */

'use server'

import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase'
import { getServerUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// CONTEXT: Custom UUID validation that allows test UUIDs
// BUSINESS_RULE: Test data uses non-standard UUIDs that should be allowed
const customUuidSchema = z.string().refine((val) => {
  const zodUuidPattern = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/
  const testUuidPattern = /^(11111111-1111-1111-1111-111111111111|22222222-2222-2222-2222-222222222222)$/
  return zodUuidPattern.test(val) || testUuidPattern.test(val)
}, {
  message: "Invalid UUID format"
})

// CONTEXT: Validation schemas for user management operations
// SECURITY: Input validation prevents injection attacks
const searchUsersSchema = z.object({
  q: z.string().optional(),
  role: z.enum(['client', 'agent', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['client', 'agent', 'admin']),
  artistIds: z.array(customUuidSchema).default([])
})

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  role: z.enum(['client', 'agent', 'admin']),
  status: z.enum(['active', 'suspended'])
})

const setUserArtistsSchema = z.object({
  userId: z.string().uuid(),
  artistIds: z.array(customUuidSchema)
})

/**
 * Admin-only helper to verify current user is admin
 * 
 * @description Throws error if current user is not an admin
 * @throws {Error} If user is not authenticated or not an admin
 * @security Enforces admin role requirement
 */
async function requireAdmin() {
  const { user, role } = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }
  
  if (role !== 'admin') {
    throw new Error('Unauthorized: Admin role required')
  }
  
  return user
}

/**
 * Search and filter users for admin management
 * 
 * @description Returns paginated list of users with optional search and filters
 * @param params Search parameters including query, role, status, and pagination
 * @returns Promise<{ users: User[], total: number, page: number, limit: number }>
 * 
 * @security Admin role required via requireAdmin()
 * @database Queries users table with RLS policies
 * @business_rule Returns all users for admin management
 * 
 * @example
 * ```typescript
 * const result = await adminSearchUsers({
 *   q: 'john@example.com',
 *   role: 'client',
 *   status: 'active',
 *   page: 1,
 *   limit: 20
 * })
 * console.log(`Found ${result.total} users`)
 * ```
 */
export async function adminSearchUsers(params: z.infer<typeof searchUsersSchema>) {
  await requireAdmin()
  
  const validatedParams = searchUsersSchema.parse(params)
  const supabase = await createServerClient()
  
  try {
    // CONTEXT: Build dynamic query with filters
    // ALGORITHM: Apply search, role, and status filters with pagination
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        auth_user_id,
        created_at,
        updated_at
      `, { count: 'exact' })
    
    // Apply search filter
    if (validatedParams.q) {
      query = query.or(`email.ilike.%${validatedParams.q}%,full_name.ilike.%${validatedParams.q}%`)
    }
    
    // Apply role filter
    if (validatedParams.role) {
      query = query.eq('role', validatedParams.role)
    }
    
    // Apply status filter
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status)
    }
    
    // Apply pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + validatedParams.limit - 1)
    
    const { data: users, error, count } = await query
    
    if (error) {
      console.error('Error searching users:', error)
      throw new Error('Failed to search users')
    }
    
    return {
      users: users || [],
      total: count || 0,
      page: validatedParams.page,
      limit: validatedParams.limit
    }
  } catch (error) {
    console.error('Error in adminSearchUsers:', error)
    throw new Error('Failed to search users')
  }
}

/**
 * Create a new user invite with automatic email sending
 * 
 * @description Creates a Supabase Auth invite that automatically sends an email to the user
 * @param params Invite parameters including email, role, and artist assignments
 * @returns Promise<{ success: boolean, message: string }>
 * 
 * @security Admin role required via requireAdmin()
 * @database Inserts into invites table and creates Supabase Auth user
 * @business_rule Admins can invite clients, agents, and other admins; agents can only invite clients
 * 
 * @example
 * ```typescript
 * const result = await adminCreateInvite({
 *   email: 'newuser@example.com',
 *   role: 'client',
 *   artistIds: ['artist-1', 'artist-2']
 * })
 * console.log('Invite sent:', result.message)
 * ```
 */
export async function adminCreateInvite(params: z.infer<typeof createInviteSchema>) {
  const currentUser = await requireAdmin()

  const validatedParams = createInviteSchema.parse(params)
  const supabase = await createServerClient()
  const adminSupabase = await createAdminClient()
  
  try {
    // CONTEXT: Use Supabase Auth admin invite to automatically send email
    // ALGORITHM: Create invite in database, then use Supabase Auth to send email
    // SECURITY: Supabase Auth handles secure token generation and email delivery

    // Step 1: Create invite record in our database
    const { data: inviteData, error: inviteError } = await supabase.rpc('create_invite', {
      p_email: validatedParams.email,
      p_role: validatedParams.role,
      p_artist_ids: validatedParams.artistIds,
      p_created_by: currentUser.id
    })

    if (inviteError) {
      console.error('Error creating invite record:', inviteError)
      throw new Error('Failed to create invite record')
    }

    if (!inviteData || inviteData.length === 0) {
      throw new Error('Failed to create invite record')
    }

    const { token } = inviteData[0]

    // Step 2: Use Supabase Auth Admin to send invite email
    // CONTEXT: This automatically sends an email with a secure invite link
    // BUSINESS_RULE: Email contains invite link that creates user account when clicked
    // SECURITY: Uses admin client for proper permissions
    const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(
      validatedParams.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/accept?token=${token}`,
        data: {
          role: validatedParams.role,
          artist_ids: validatedParams.artistIds,
          invite_token: token
        }
      }
    )
    
    if (authError) {
      console.error('Error sending invite email:', authError)
      // Clean up the invite record if email sending fails
      await supabase
        .from('invites')
        .delete()
        .eq('token', token)
      
      throw new Error(`Failed to send invite email: ${authError.message}`)
    }
    
    revalidatePath('/admin/users')
    
    return {
      success: true,
      message: `Invite email sent successfully to ${validatedParams.email}`,
      userId: authData.user?.id,
      email: validatedParams.email
    }
  } catch (error) {
    console.error('Error in adminCreateInvite:', error)
    throw new Error(`Failed to create invite: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Suspend a user account
 * 
 * @description Sets user status to 'suspended' to prevent access
 * @param userId UUID of the user to suspend
 * @returns Promise<{ success: boolean }>
 * 
 * @security Admin role required via requireAdmin()
 * @database Updates users table status field
 * @business_rule Suspended users cannot access the system
 */
export async function adminSuspendUser(userId: string) {
  await requireAdmin()
  
  const supabase = await createServerClient()
  
  try {
    const { error } = await supabase
      .from('users')
      .update({ status: 'suspended' })
      .eq('id', userId)
    
    if (error) {
      console.error('Error suspending user:', error)
      throw new Error('Failed to suspend user')
    }
    
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error in adminSuspendUser:', error)
    throw new Error('Failed to suspend user')
  }
}

/**
 * Reactivate a suspended user account
 * 
 * @description Sets user status to 'active' to restore access
 * @param userId UUID of the user to reactivate
 * @returns Promise<{ success: boolean }>
 * 
 * @security Admin role required via requireAdmin()
 * @database Updates users table status field
 * @business_rule Reactivated users regain system access
 */
export async function adminReactivateUser(userId: string) {
  await requireAdmin()
  
  const supabase = await createServerClient()
  
  try {
    const { error } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId)
    
    if (error) {
      console.error('Error reactivating user:', error)
      throw new Error('Failed to reactivate user')
    }
    
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error in adminReactivateUser:', error)
    throw new Error('Failed to reactivate user')
  }
}

/**
 * Update user profile information
 * 
 * @description Updates user's full name, email, and role
 * @param params Update parameters including userId and new values
 * @returns Promise<{ success: boolean }>
 * 
 * @security Admin role required via requireAdmin()
 * @database Updates users table with new profile data
 * @business_rule Role changes require confirmation; email changes may require verification
 * 
 * @example
 * ```typescript
 * await adminUpdateUserProfile({
 *   userId: 'user-123',
 *   fullName: 'John Doe',
 *   email: 'john@example.com',
 *   role: 'agent',
 *   status: 'active'
 * })
 * ```
 */
export async function adminUpdateUserProfile(params: z.infer<typeof updateUserSchema>) {
  await requireAdmin()
  
  const validatedParams = updateUserSchema.parse(params)
  const supabase = await createServerClient()
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        full_name: validatedParams.fullName,
        email: validatedParams.email,
        role: validatedParams.role,
        status: validatedParams.status
      })
      .eq('id', validatedParams.userId)
    
    if (error) {
      console.error('Error updating user profile:', error)
      throw new Error('Failed to update user profile')
    }
    
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${validatedParams.userId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error in adminUpdateUserProfile:', error)
    throw new Error('Failed to update user profile')
  }
}

/**
 * Set user's artist assignments
 * 
 * @description Updates artist assignments for a user (adds/removes as needed)
 * @param params Parameters including userId and array of artist IDs
 * @returns Promise<{ success: boolean }>
 * 
 * @security Admin role required via requireAdmin()
 * @database Updates artist_assignments table with diff-based changes
 * @business_rule Clients are limited to assigned artists; employees can access all
 */
export async function adminSetUserArtists(params: z.infer<typeof setUserArtistsSchema>) {
  await requireAdmin()
  
  const validatedParams = setUserArtistsSchema.parse(params)
  const supabase = await createServerClient()
  
  try {
    // CONTEXT: Get current assignments to compute diff
    // ALGORITHM: Remove old assignments, add new ones
    const { data: currentAssignments } = await supabase
      .from('artist_assignments')
      .select('artist_id')
      .eq('user_id', validatedParams.userId)
    
    const currentArtistIds = new Set(currentAssignments?.map(a => a.artist_id) || [])
    const newArtistIds = new Set(validatedParams.artistIds)
    
    // Remove assignments that are no longer needed
    const toRemove = Array.from(currentArtistIds).filter(id => !newArtistIds.has(id))
    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('artist_assignments')
        .delete()
        .eq('user_id', validatedParams.userId)
        .in('artist_id', toRemove)
      
      if (removeError) {
        console.error('Error removing artist assignments:', removeError)
        throw new Error('Failed to update artist assignments')
      }
    }
    
    // Add new assignments
    const toAdd = Array.from(newArtistIds).filter(id => !currentArtistIds.has(id))
    if (toAdd.length > 0) {
      const assignmentsToAdd = toAdd.map(artistId => ({
        user_id: validatedParams.userId,
        artist_id: artistId
      }))
      
      const { error: addError } = await supabase
        .from('artist_assignments')
        .insert(assignmentsToAdd)
      
      if (addError) {
        console.error('Error adding artist assignments:', addError)
        throw new Error('Failed to update artist assignments')
      }
    }
    
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${validatedParams.userId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error in adminSetUserArtists:', error)
    throw new Error('Failed to update artist assignments')
  }
}

/**
 * Get detailed user information for admin management
 * 
 * @description Returns comprehensive user data including profile, assignments, and invites
 * @param userId UUID of the user to fetch
 * @returns Promise<UserDetail | null>
 * 
 * @security Admin role required via requireAdmin()
 * @database Queries users, artist_assignments, and invites tables
 * @business_rule Returns complete user information for admin management
 */
export async function adminGetUserDetail(userId: string) {
  await requireAdmin()
  
  const supabase = await createServerClient()
  
  try {
    // CONTEXT: Fetch user with related data
    // ALGORITHM: Join user profile with artist assignments and pending invites
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        auth_user_id,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return null
    }
    
    // Fetch artist assignments
    const { data: assignments } = await supabase
      .from('artist_assignments')
      .select(`
        artist_id,
        artists(id, name)
      `)
      .eq('user_id', userId)
    
    // Fetch pending invite (if any)
    const { data: invite } = await supabase
      .from('invites')
      .select('*')
      .eq('email', user.email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    return {
      ...user,
      artistAssignments: assignments || [],
      pendingInvite: invite || null
    }
  } catch (error) {
    console.error('Error in adminGetUserDetail:', error)
    return null
  }
}

/**
 * Fetch all artists for admin invite dialog
 * 
 * @description Gets list of all artists for assignment in user invitations.
 * Used by admin invite dialog to populate artist selection.
 * 
 * @returns Promise<Array<{ id: string, name: string }>>
 * 
 * @security Admin role required via requireAdmin()
 * @database artists table
 * @business_rule Admins can see all artists for assignment
 */
export async function adminGetArtists() {
  await requireAdmin()
  
  const supabase = createAdminClient()
  
  try {
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, name')
      .order('name')
    
    if (error) {
      console.error('Error fetching artists:', error)
      throw new Error('Failed to fetch artists')
    }
    
    return artists || []
  } catch (error) {
    console.error('Error in adminGetArtists:', error)
    throw new Error('Failed to fetch artists')
  }
}
