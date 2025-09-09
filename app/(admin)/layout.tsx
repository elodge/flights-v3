/**
 * @fileoverview Admin Layout Component
 * 
 * @description Layout wrapper for admin-only pages with role-based access control.
 * Redirects non-admin users to appropriate portal based on their role.
 * 
 * @route /admin/*
 * @access Admin users only
 * @security Enforces admin role requirement with server-side checks
 * @business_rule Admins have access to all system management features
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // CONTEXT: Server-side admin role verification
  // SECURITY: Ensure only admin users can access admin routes
  const { user, role } = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }
  
  if (role !== 'admin') {
    // CONTEXT: Redirect non-admin users to their appropriate portal
    // BUSINESS_RULE: Agents go to employee portal, clients to client portal
    if (role === 'agent') {
      redirect('/a')
    } else {
      redirect('/c')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
