/**
 * @fileoverview Employee Booking Queue page
 * 
 * @description Main queue interface for agents to manage client selections, place holds,
 * and process ticketing. Shows prioritized list with hold timers and progress tracking.
 * @route /a/queue
 * @access Employees (agents/admins) only
 * @security Role-based route protection via middleware
 * @database Displays data from client_selections, holds, ticketings via server actions
 */

import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

import { BookingQueueContent } from '@/components/employee/booking-queue-content';
import { BookingQueueSkeleton } from '@/components/employee/booking-queue-skeleton';

/**
 * Employee Booking Queue page component
 * 
 * @description Server component that handles authentication and renders the booking
 * queue interface. Redirects non-employees to appropriate pages.
 * @returns JSX.Element
 * @access Employees only - agents and admins
 * @security Server-side authentication and role validation
 * @database Validates user role through users table
 * @example
 * ```typescript
 * // Accessed via /a/queue route
 * // Shows prioritized list of client selections
 * ```
 */
export default async function BookingQueuePage() {
  // SECURITY: Validate authentication and role
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // SECURITY: Check user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || (userData.role !== 'agent' && userData.role !== 'admin')) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-6">
      {/* CONTEXT: Page header with title and description */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Queue
        </h1>
        <p className="text-gray-600">
          Manage client selections, place holds, and process ticketing
        </p>
      </div>

      {/* CONTEXT: Main queue content with loading fallback */}
      <Suspense fallback={<BookingQueueSkeleton />}>
        <BookingQueueContent />
      </Suspense>
    </div>
  );
}