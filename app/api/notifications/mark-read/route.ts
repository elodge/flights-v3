/**
 * @fileoverview API route for marking notifications as read
 * 
 * @description Server-side API endpoint for marking notifications as read
 * @route /api/notifications/mark-read
 * @access Authenticated users only
 * @security Uses RLS policies for data access
 * @database Updates notification_reads table
 * @business_rule Users can only mark their own notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { markNotificationsAsRead } from '@/lib/notifications/push';
import { getServerUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getServerUser();
    
    if (!authUser || !authUser.user) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const body = await request.json();
    const { eventIds } = body;

    if (!Array.isArray(eventIds)) {
      return NextResponse.json(
        { error: 'eventIds must be an array' },
        { status: 400 }
      );
    }

    await markNotificationsAsRead(authUser.id, eventIds);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  }
}
