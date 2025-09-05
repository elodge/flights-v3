/**
 * @fileoverview Admin User Detail Page
 * 
 * @description Admin-only page for viewing and editing individual user details,
 * including profile information, role management, artist assignments, and security settings.
 * 
 * @route /admin/users/[id]
 * @access Admin users only
 * @security Protected by admin layout and server-side role checks
 * @database Queries users, artist_assignments, and invites tables
 * @business_rule Admins can modify all user properties and assignments
 */

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { UserDetailHeader } from '@/components/admin/user-detail-header'
import { UserDetailTabs } from '@/components/admin/user-detail-tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adminGetUserDetail } from '@/app/(admin)/admin/users/_actions/user-actions'

interface UserDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params
  
  // CONTEXT: Fetch user details with server-side validation
  // SECURITY: Only admins can access this data via RLS policies
  const userDetail = await adminGetUserDetail(id)
  
  if (!userDetail) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* User Header */}
      <Suspense fallback={<div>Loading user details...</div>}>
        <UserDetailHeader user={userDetail} />
      </Suspense>

      {/* User Detail Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user profile, artist assignments, and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading user management...</div>}>
            <UserDetailTabs user={userDetail} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
