/**
 * @fileoverview Employee portal navigation component
 * 
 * @description Navigation tabs for employee portal sections including
 * dashboard, booking queue, and other management areas.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, Clock, Plane, Users } from 'lucide-react'

interface EmployeeNavProps {
  queueCount?: number
}

/**
 * Employee portal navigation component
 * 
 * @description Provides navigation between employee portal sections with
 * active state indication and optional queue item count badge.
 * 
 * @param queueCount - Optional count of items in booking queue
 */
export function EmployeeNav({ queueCount }: EmployeeNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/a',
      label: 'Dashboard',
      icon: Home,
      description: 'Tour overview'
    },
    {
      href: '/a/queue',
      label: 'Booking Queue',
      icon: Clock,
      description: 'Process selections',
      badge: queueCount
    }
  ]

  return (
    <div className="flex items-center space-x-1 mb-6 p-1 bg-muted/50 rounded-lg">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                "gap-2 relative",
                isActive && "shadow-sm"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.badge && item.badge > 0 && (
                <Badge variant={isActive ? 'secondary' : 'default'} className="ml-1">
                  {item.badge}
                </Badge>
              )}
            </Button>
          </Link>
        )
      })}
    </div>
  )
}
