/**
 * @fileoverview Employee Notifications Page
 * 
 * @description Comprehensive notifications management page for employees
 * @route /a/notifications
 * @access Employee only (agent/admin)
 * @security Uses notification system with RLS policies
 * @database Reads from notification_events and notification_reads
 * @business_rule Notifications filtered by artist access and user permissions
 */

import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Filter, Check, Clock, AlertTriangle, Info, MessageSquare, CreditCard, FileText, User } from 'lucide-react';
import { getServerUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NotificationsList } from '@/components/employee/notifications-list';
import { NotificationFilters } from '@/components/employee/notification-filters';

/**
 * Employee notifications management page
 * 
 * @description Provides comprehensive notification management with filtering and grouping
 * @returns JSX.Element - Notifications page with filters and list
 * @security Requires employee authentication (agent/admin)
 * @database Queries notification_events with user-specific access
 * @business_rule Notifications grouped by type and filtered by artist access
 */
export default async function NotificationsPage() {
  const { user, profile } = await getServerUser();
  
  if (!user || !profile) {
    redirect('/login');
  }

  if (profile.role !== 'agent' && profile.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated on client activity, system alerts, and important events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              All time notifications
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Activity</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Selections & messages
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Holds & deadlines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter notifications by type, severity, and time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading filters...</div>}>
                <NotificationFilters />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Notifications</CardTitle>
                  <CardDescription>
                    Latest notifications across all artists
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading notifications...</div>}>
                <NotificationsList userId={user.id} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notification Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Understanding different notification categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                <Badge variant="outline">Client Selection</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                New flight selections from clients
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <Badge variant="outline">Chat Message</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                New messages in leg chat
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <Badge variant="outline">Hold Expiring</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Seat holds approaching expiration
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <Badge variant="outline">Document Upload</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                New documents uploaded by clients
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-500" />
                <Badge variant="outline">Budget Updated</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Budget changes by agents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
