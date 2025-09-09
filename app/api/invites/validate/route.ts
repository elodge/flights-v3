/**
 * @fileoverview Invite Validation API Route
 * 
 * @description API endpoint for validating invite tokens before acceptance.
 * Checks token validity, expiry, and acceptance status.
 * 
 * @route /api/invites/validate
 * @access Public (token-based)
 * @security Validates invite tokens and prevents expired/invalid invites
 * @database Queries invites table
 * @business_rule Only valid, unexpired, unaccepted invites can be used
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // CONTEXT: Validate invite token
    // SECURITY: Check token exists, not expired, and not already accepted
    // CONTEXT: invites table exists but not in generated types
    // DATABASE: Using type assertion for missing table in generated types
    const { data: invite, error } = await (supabase as any)
      .from('invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expires_at,
      isValid: true
    });
  } catch (error: any) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
}
