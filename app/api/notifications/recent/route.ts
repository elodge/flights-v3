/**
 * @fileoverview API route for getting recent notifications
 * 
 * @description Server-side API endpoint for fetching recent notifications
 * @route /api/notifications/recent
 * @access Authenticated users only
 * @security Uses RLS policies for data access
 * @database Queries notification_events with joins
 * @business_rule Returns notifications filtered by artist and other criteria
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentNotifications } from '@/lib/notifications/push';
import { getServerUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getServerUser();
    
    if (!authUser || !authUser.user) {
      return NextResponse.json({ notifications: [] }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artist');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const limit = searchParams.get('limit');

    const notifications = await getRecentNotifications(authUser.id, {
      limit: limit ? parseInt(limit) : undefined,
      artistId: artistId || undefined,
      type: type as any,
      severity: severity as any,
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Error fetching recent notifications:', error);
    return NextResponse.json(
      { notifications: [] },
      { status: 200 }
    );
  }
}
