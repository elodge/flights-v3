/**
 * @fileoverview Admin Users Table Component
 * 
 * @description Client-side component for displaying and managing users in the admin panel.
 * Includes search, filtering, and user management actions.
 * 
 * @access Admin users only
 * @security Uses admin server actions with role enforcement
 * @database Displays data from users, artist_assignments, and invites tables
 * @business_rule Shows all users with role-based filtering and management options
 * 
 * @example
 * ```tsx
 * <UsersTable 
 *   initialUsers={users} 
 *   initialTotal={total} 
 * />
 * ```
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Eye, UserX, UserCheck, MoreHorizontal } from 'lucide-react'
import { adminSearchUsers, adminSuspendUser, adminReactivateUser } from '@/app/(admin)/admin/users/_actions/user-actions'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  avatar_url: string | null
  artist_assignments?: Array<{
    artist_id: string
    artists: { name: string }
  }>
}

interface UsersTableProps {
  initialUsers?: User[]
  initialTotal?: number
}

export function UsersTable({ initialUsers = [], initialTotal = 0 }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [total, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(false)
  const [isRealtimeUpdating, setIsRealtimeUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const router = useRouter()
  const subscriptionRef = useRef<any>(null)

  // CONTEXT: Fetch users with current filters
  // ALGORITHM: Debounced search with role and status filtering
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const result = await adminSearchUsers({
        q: searchQuery || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter as any,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        page,
        limit: 20
      })
      
      setUsers(result.users)
      setTotal(result.total)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  // CONTEXT: Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchUsers()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, roleFilter, statusFilter])

  // CONTEXT: Fetch users when page changes
  useEffect(() => {
    fetchUsers()
  }, [page])

  // CONTEXT: Set up real-time subscription for users table changes
  // ALGORITHM: Listen for INSERT, UPDATE, DELETE events and refresh data
  // SECURITY: Only admins can see these changes due to RLS policies
  useEffect(() => {
    // CONTEXT: Subscribe to users table changes
    // BUSINESS_RULE: Refresh user list when new users are added or existing users are modified
    const subscription = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('Users table changed:', payload)
          
          // CONTEXT: Show real-time update indicator
          setIsRealtimeUpdating(true)
          
          // CONTEXT: Refresh the user list when changes occur
          // ALGORITHM: Debounce refresh to avoid excessive API calls
          setTimeout(() => {
            fetchUsers().finally(() => {
              setIsRealtimeUpdating(false)
            })
          }, 500)
        }
      )
      .subscribe()

    subscriptionRef.current = subscription

    // CONTEXT: Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, []) // Empty dependency array - only run once on mount

  const handleSuspendUser = async (userId: string) => {
    try {
      await adminSuspendUser(userId)
      toast.success('User suspended successfully')
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error suspending user:', error)
      toast.error('Failed to suspend user')
    }
  }

  const handleReactivateUser = async (userId: string) => {
    try {
      await adminReactivateUser(userId)
      toast.success('User reactivated successfully')
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error reactivating user:', error)
      toast.error('Failed to reactivate user')
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default'
      case 'agent': return 'secondary'
      case 'client': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'default' : 'destructive'
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users ({total})</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            {isRealtimeUpdating && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Updating...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Artists</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.is_active)}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.artist_assignments && user.artist_assignments.length > 0 ? (
                          <span className="text-sm text-muted-foreground">
                            {user.artist_assignments.length} assigned
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {user.role === 'client' ? 'None' : 'All'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {user.is_active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuspendUser(user.id)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivateUser(user.id)}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * 20 >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
