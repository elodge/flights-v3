/**
 * @fileoverview Booking Queue Skeleton component
 * 
 * @description Loading skeleton for the booking queue page while data is being fetched.
 * Provides visual feedback during initial load.
 * @param N/A - No props required
 * @returns JSX.Element
 * @access Internal component for loading states
 * @example
 * ```typescript
 * <BookingQueueSkeleton />
 * ```
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/**
 * Booking Queue Skeleton component
 * 
 * @description Displays loading placeholders matching the structure of the actual
 * booking queue content to provide smooth loading experience.
 * @returns JSX.Element
 * @access Internal loading component
 * @example
 * ```typescript
 * <Suspense fallback={<BookingQueueSkeleton />}>
 *   <BookingQueueContent />
 * </Suspense>
 * ```
 */
export function BookingQueueSkeleton() {
  return (
    <div className="space-y-6">
      {/* CONTEXT: Filters skeleton */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse ml-auto" />
      </div>

      {/* CONTEXT: Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center mb-2">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-2" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CONTEXT: Queue items skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Option details skeleton */}
              <div>
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse mt-1" />
              </div>

              {/* Stats skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>

              <Separator />

              {/* Action buttons skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}