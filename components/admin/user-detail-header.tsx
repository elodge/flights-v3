/**
 * @fileoverview User Detail Header Component
 * 
 * @description Header component for user detail page showing user information,
 * role, status, and quick actions.
 * 
 * @access Admin users only
 * @security Displays user data from admin server actions
 * @database Shows data from users table
 * @business_rule Displays comprehensive user information for admin management
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserX, UserCheck, Mail, Calendar, Shield } from 'lucide-react'
import type { UserDetail } from '@/types/app'

interface UserDetailHeaderProps {
  user: UserDetail
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default'
      case 'agent': return 'secondary'
      case 'client': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'destructive'
      default: return 'outline'
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {getUserInitials(user.full_name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user.full_name || 'N/A'}</CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getRoleBadgeVariant(user.role)} className="text-sm">
              <Shield className="mr-1 h-3 w-3" />
              {user.role}
            </Badge>
            <Badge variant={getStatusBadgeVariant(user.status)} className="text-sm">
              {user.status === 'active' ? (
                <UserCheck className="mr-1 h-3 w-3" />
              ) : (
                <UserX className="mr-1 h-3 w-3" />
              )}
              {user.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Account Status</p>
            <p className="text-sm">
              {user.is_active ? 'Active Account' : 'Inactive Account'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Artist Assignments</p>
            <p className="text-sm">
              {user.artistAssignments.length > 0 ? (
                `${user.artistAssignments.length} assigned`
              ) : (
                user.role === 'client' ? 'None' : 'All artists'
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Member Since</p>
            <p className="text-sm flex items-center">
              <Calendar className="mr-1 h-3 w-3" />
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {user.pendingInvite && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800">Pending Invitation</p>
            <p className="text-sm text-yellow-700">
              This user has a pending invitation that expires on{' '}
              {new Date(user.pendingInvite.expires_at).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
