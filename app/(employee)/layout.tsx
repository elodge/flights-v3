/**
 * @fileoverview Employee portal layout with navigation and queue count
 * 
 * @description Main layout for employee-facing pages. Handles authentication,
 * fetches booking queue count for navigation badge, and provides consistent
 * employee portal structure.
 * 
 * @route /a/*
 * @access Employee only (agent, admin roles)
 * @security Redirects non-employees to login
 * @database Reads from selections table via admin client to bypass RLS
 */

import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeeNav } from '@/components/employee/employee-nav'
import { createAdminClient } from '@/lib/supabase'

/**
 * Employee portal layout component
 * 
 * @description Provides authentication, navigation, and queue count for all
 * employee pages. Uses admin client to fetch queue count across all artists
 * to bypass RLS restrictions.
 * 
 * @param children - Child components to render within the layout
 * @returns Promise<JSX.Element> - Layout with employee navigation and content
 * 
 * @security Requires authenticated employee (agent/admin)
 * @database Queries selections table for queue count
 * @business_rule Shows total queue count across all artists for now
 * 
 * @example
 * ```tsx
 * // Automatically wraps all /a/* routes
 * <EmployeeLayout>
 *   <EmployeeDashboard />
 * </EmployeeLayout>
 * ```
 */
export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check user authentication and role
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }
  
  // If user is a client, redirect to client portal
  if (user.role === 'client') {
    redirect('/c')
  }

  // CONTEXT: Queue count for navigation badge
  // BUSINESS_RULE: Show total count across all artists (not filtered)
  // SECURITY: Uses admin client to bypass RLS - employees should see all selections
  // DATABASE: Excludes expired and ticketed selections from count
  let queueCount = { count: 0 }
  try {
    const adminSupabase = createAdminClient()
    const { data: selections } = await adminSupabase
      .from('selections')
      .select('id')
      .not('status', 'eq', 'expired')
      .not('status', 'eq', 'ticketed')
    
    queueCount = { count: selections?.length || 0 }
  } catch (error) {
    // FALLBACK: If admin client fails (e.g., missing service role key), show 0
    // This prevents layout from crashing in development environments
    console.warn('Unable to fetch queue count:', error)
    queueCount = { count: 0 }
  }

  return (
    <div className="employee-portal">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-green-600">Employee Portal</h2>
        <p className="text-muted-foreground">
          Flight management and crew coordination - {user.user?.full_name || user.email} ({user.role})
        </p>
      </div>
      
      <EmployeeNav queueCount={queueCount?.count || 0} />
      
      {children}
    </div>
  )
}
