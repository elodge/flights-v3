/**
 * @fileoverview API route for getting unread notification count
 * 
 * @description Server-side API endpoint for fetching unread notification count
 * @route /api/notifications/unread-count
 * @access Authenticated users only
 * @security Uses RLS policies for data access
 * @database Queries notification_events and notification_reads
 * @business_rule Returns count filtered by artist if provided
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnreadCount } from '@/lib/notifications/push';
import { getServerUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getServerUser();
    
    if (!authUser || !authUser.user) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artist');

    const count = await getUnreadCount(authUser.id, artistId || undefined);

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { count: 0 },
      { status: 200 }
    );
  }
}
