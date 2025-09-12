/**
 * @fileoverview Clickable leg row component for tour page
 * 
 * @description Client-side component that makes table rows clickable for navigation
 * to leg management pages. Uses Next.js router for proper client-side navigation
 * with hover effects and accessibility.
 * 
 * @access Employee only (used in tour pages)
 * @security Client-side navigation component, no direct database access
 * @business_rule Navigates to leg management interface when row is clicked
 */

'use client'

import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'
import { ReactNode } from 'react'

/**
 * Clickable table row component for leg navigation
 * 
 * @description Wraps table row content with click handling for navigation.
 * Provides hover effects and cursor pointer styling. Handles event bubbling
 * to prevent conflicts with interactive elements inside the row.
 * 
 * @param children - ReactNode content to render inside the table row
 * @param href - String URL to navigate to when row is clicked
 * @param className - Optional additional CSS classes
 * @returns JSX.Element - Clickable table row component
 * 
 * @security Uses Next.js router for client-side navigation
 * @business_rule Prevents event bubbling from nested interactive elements
 * 
 * @example
 * ```tsx
 * <ClickableLegRow href="/a/tour/123/leg/456">
 *   <TableCell>Leg Content</TableCell>
 * </ClickableLegRow>
 * ```
 */
export function ClickableLegRow({ 
  children, 
  href, 
  className = '',
  ...props 
}: {
  children: ReactNode
  href: string
  className?: string
  [key: string]: any
}) {
  const router = useRouter()

  const handleRowClick = (e: React.MouseEvent) => {
    // CONTEXT: Prevent navigation if clicking on interactive elements
    const target = e.target as HTMLElement
    const isInteractiveElement = target.closest('button, a, input, select, textarea')
    
    if (!isInteractiveElement) {
      router.push(href)
    }
  }

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/80 hover:shadow-sm transition-all duration-200 ${className}`}
      onClick={handleRowClick}
      {...props}
    >
      {children}
    </TableRow>
  )
}
