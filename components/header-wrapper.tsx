"use client"

import dynamic from 'next/dynamic'
import { Plane } from 'lucide-react'

// Dynamically import the Header component with no SSR
const Header = dynamic(() => import('./header').then(mod => ({ default: mod.Header })), {
  ssr: false,
  loading: () => (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 max-w-screen-2xl items-center px-4">
        <div className="flex items-center space-x-3 mr-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Plane className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight tracking-tight">
              Daysheets
            </span>
            <span className="text-xs text-muted-foreground font-medium hidden sm:block">
              Flight Management
            </span>
          </div>
        </div>
        <div className="flex flex-1"></div>
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </header>
  )
})

/**
 * Header wrapper component with dynamic loading
 * 
 * @description Wraps the main Header component with dynamic loading
 * to prevent hydration mismatches. Provides a loading fallback that
 * matches the expected header structure.
 */
export function HeaderWrapper() {
  return <Header />
}
