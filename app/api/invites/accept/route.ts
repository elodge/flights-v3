/**
 * @fileoverview Invite Acceptance API Route
 * 
 * @description API endpoint for accepting user invitations and creating accounts.
 * Creates Supabase auth user, updates user profile, and sets artist assignments.
 * 
 * @route /api/invites/accept
 * @access Public (token-based)
 * @security Validates invite tokens and creates secure user accounts
 * @database Creates auth users, updates users table, and sets artist_assignments
 * @business_rule Invited users get appropriate role and artist assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, fullName } = body;

    if (!token || !password || !fullName) {
      return NextResponse.json(
        { error: 'Token, password, and full name are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // CONTEXT: Validate invite token
    // SECURITY: Check token exists, not expired, and not already accepted
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 400 }
      );
    }

    // CONTEXT: Create or get existing Supabase auth user
    // SECURITY: Use service role key for admin operations

    // CONTEXT: Check if user already exists in Supabase Auth
    // ALGORITHM: Try to get existing user first, create if doesn't exist
    let authUser;
    let authError;

    // First, try to get existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(user => user.email === invite.email);

    if (existingUser) {
      // CONTEXT: User already exists in Supabase Auth
      // BUSINESS_RULE: Update password and confirm email for existing user
      const { data: updatedUser, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          email_confirm: true
        }
      );
      
      authUser = { user: updatedUser.user };
      authError = updateAuthError;
    } else {
      // CONTEXT: Create new Supabase Auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password: password,
        email_confirm: true,
      });
      
      authUser = newUser;
      authError = createError;
    }

    if (authError || !authUser?.user) {
      console.error('Error creating/updating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // CONTEXT: Update or create user profile with auth_user_id
    // ALGORITHM: Link Supabase auth user with our users table
    // SECURITY: Use admin client to bypass RLS for user creation
    const { data: existingUserProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', invite.email)
      .single();

    if (existingUserProfile) {
      // CONTEXT: User already exists in our users table
      // BUSINESS_RULE: Update existing user with auth_user_id and full_name
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          auth_user_id: authUser.user.id,
          full_name: fullName,
          role: invite.role,
          status: 'active'
        })
        .eq('email', invite.email);

      if (updateError) {
        console.error('Error updating user profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user profile' },
          { status: 500 }
        );
      }
    } else {
      // CONTEXT: Create new user profile
      // BUSINESS_RULE: Insert new user record with all required fields
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          email: invite.email,
          full_name: fullName,
          role: invite.role,
          status: 'active',
          auth_user_id: authUser.user.id
        });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        // Clean up auth user if profile creation fails
        if (!existingUser) {
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        }
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
    }

    // CONTEXT: Set artist assignments for clients
    // BUSINESS_RULE: Clients get assigned artists; agents can access all
    if (invite.role === 'client' && invite.artist_ids.length > 0) {
      // CONTEXT: Get the user ID from our users table (not auth user ID)
      // ALGORITHM: Use the email to find the correct user record
      const { data: userRecord } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', invite.email)
        .single();

      if (userRecord) {
        const assignments = invite.artist_ids.map((artistId: string) => ({
          user_id: userRecord.id,
          artist_id: artistId
        }));

        const { error: assignmentError } = await supabaseAdmin
          .from('artist_assignments')
          .insert(assignments);

        if (assignmentError) {
          console.error('Error setting artist assignments:', assignmentError);
          // Don't fail the entire process for assignment errors
        }
      }
    }

    // CONTEXT: Mark invite as accepted
    // ALGORITHM: Set accepted_at timestamp to prevent reuse
    const { error: acceptError } = await supabaseAdmin
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (acceptError) {
      console.error('Error marking invite as accepted:', acceptError);
      // Don't fail the entire process for this
    }

    return NextResponse.json({
      success: true,
      role: invite.role,
      userId: authUser.user.id
    });
  } catch (error: any) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
