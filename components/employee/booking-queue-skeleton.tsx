/**
 * @fileoverview Skeleton loading component for booking queue
 * 
 * @description Provides a loading skeleton that matches the booking queue
 * layout while data is being fetched.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function BookingQueueSkeleton() {
  return (
    <div className="space-y-6">
      {/* Controls skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <Skeleton className="h-6 w-[120px]" />
      </div>

      {/* Queue items skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-[200px]" />
                  <Skeleton className="h-4 w-[160px]" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-[80px]" />
                  <Skeleton className="h-6 w-[60px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[140px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[90px]" />
                </div>
                <div className="flex justify-end space-x-2">
                  <Skeleton className="h-9 w-[100px]" />
                  <Skeleton className="h-9 w-[80px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
