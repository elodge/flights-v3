/**
 * @fileoverview Admin Users List Page
 * 
 * @description Admin-only page for listing, searching, and managing all users
 * in the system. Includes user search, role/status filtering, and invite functionality.
 * 
 * @route /admin/users
 * @access Admin users only
 * @security Protected by admin layout and server-side role checks
 * @database Queries users, artist_assignments, and invites tables
 * @business_rule Admins can manage all users, roles, and artist assignments
 */

import { Suspense } from 'react'
import { UsersTable } from '@/components/admin/users-table'
import { InviteUserDialog } from '@/components/admin/invite-user-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users } from 'lucide-react'

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and artist assignments across the system
          </p>
        </div>
        <InviteUserDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </InviteUserDialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Suspense fallback="...">
                {/* TODO: Add user count component */}
                --
              </Suspense>
            </div>
            <p className="text-xs text-muted-foreground">
              All active and suspended users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Suspense fallback="...">
                {/* TODO: Add active user count component */}
                --
              </Suspense>
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Suspense fallback="...">
                {/* TODO: Add pending invites count component */}
                --
              </Suspense>
            </div>
            <p className="text-xs text-muted-foreground">
              Unaccepted invitations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Search and manage all users in the system. Use filters to find specific users by role or status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading users...</div>}>
            <UsersTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
