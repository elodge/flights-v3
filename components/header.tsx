/**
 * @fileoverview Header Component with Navigation and User Management
 * 
 * @description Global header component providing navigation, artist filtering, notifications,
 * chat unread counts, and user account management. Includes role-based admin navigation
 * for accessing the RBAC (Role-Based Access Control) system. Logo is clickable and navigates
 * to the appropriate dashboard based on user role.
 * 
 * @access All authenticated users (client/agent/admin)
 * @security Role-based visibility for admin features and employee-only components
 * @database Accesses users, artists, notifications, and chat tables via API routes
 * @business_rule Admin users can access user management via avatar dropdown; logo navigates to role-appropriate dashboard
 */

"use client"

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Bell, ChevronDown, LogOut, Plane, MessageSquare, Shield } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { clientUtils } from '@/lib/employeeArtist'
import { GlobalUnreadClient } from '@/components/chat/GlobalUnreadClient'
import { NotificationBell } from '@/components/employee/notification-bell'

/**
 * Global Header Component
 * 
 * @description Renders the main application header with navigation, user management,
 * artist filtering, notifications, and chat features. Provides role-based access
 * to admin functionality through the user avatar dropdown. Logo is clickable and
 * navigates to the appropriate dashboard based on user role.
 * 
 * @returns JSX.Element - Complete header with navigation and user controls
 * @access All authenticated users (client/agent/admin)
 * @security Role-based visibility for admin panel access
 * @database Fetches artists, notifications, and chat data via API routes
 * @business_rule Admin users see "Admin Panel" option in avatar dropdown; logo navigates to role-appropriate dashboard
 * 
 * @example
 * ```tsx
 * <Header />
 * ```
 */
export function Header() {
  const { user, profile, role, loading, signOut } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  
  // CONTEXT: Debug authentication state changes
  useEffect(() => {
    console.log('Header auth state:', { user: user?.email, profile: profile?.full_name, role, loading })
  }, [user, profile, role, loading])
  
  // CONTEXT: Force re-render when authentication state changes to ensure UI updates
  const [authKey, setAuthKey] = useState(0)
  useEffect(() => {
    if (user && profile) {
      setAuthKey(prev => prev + 1)
    }
  }, [user, profile])
  
  const [artists, setArtists] = useState<Array<{id: string, name: string}>>([])
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)
  const [selectedArtistName, setSelectedArtistName] = useState<string>('All Artists')
  const [unreadCount, setUnreadCount] = useState<number>(0)

  const handleSignOut = async () => {
    await signOut()
  }

  // Fetch initial unread count
  const fetchInitialUnreadCount = useCallback(async () => {
    if (!user || !profile || !['agent', 'admin'].includes(role || '')) return
    
    try {
      const url = new URL('/api/chat/global-unread', window.location.origin)
      if (selectedArtistId) {
        url.searchParams.set('artist', selectedArtistId)
      }
      
      const response = await fetch(url.toString())
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching initial unread count:', error)
    }
  }, [user, profile, role, selectedArtistId])

  // Load artists when user is available and is employee
  useEffect(() => {
    if (user && profile && ['agent', 'admin'].includes(role || '')) {
      fetchArtists()
      loadSelectedArtist()
      fetchInitialUnreadCount()
    }
  }, [user, profile, role, fetchInitialUnreadCount])

  // Load current selection from URL/cookie
  useEffect(() => {
    loadSelectedArtist()
  }, [pathname])



  const updateSelectedArtistName = useCallback((artistId: string) => {
    const artist = artists.find(a => a.id === artistId)
    setSelectedArtistName(artist?.name || 'All Artists')
  }, [artists])

  // Update artist name when artists array or selectedArtistId changes
  useEffect(() => {
    if (selectedArtistId && artists.length > 0) {
      updateSelectedArtistName(selectedArtistId)
    }
  }, [artists, selectedArtistId, updateSelectedArtistName])

  // Update unread count when artist selection changes
  useEffect(() => {
    if (user && profile && ['agent', 'admin'].includes(role || '')) {
      fetchInitialUnreadCount()
    }
  }, [selectedArtistId, user, profile, role, fetchInitialUnreadCount])

  const fetchArtists = async () => {
    try {
      console.log('Fetching artists...')
      const response = await fetch('/api/artists')
      console.log('Artists API response:', response.status, response.ok)
      if (response.ok) {
        const artistData = await response.json()
        console.log('Artists data:', artistData)
        setArtists(artistData)
      } else {
        console.error('Failed to fetch artists:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch artists:', error)
    }
  }

  const loadSelectedArtist = () => {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search)
    const urlArtistId = urlParams.get('artist')
    
    if (urlArtistId) {
      setSelectedArtistId(urlArtistId)
      updateSelectedArtistName(urlArtistId)
    } else {
      // Fall back to cookie
      const cookieArtistId = clientUtils.getSelectedArtistId()
      if (cookieArtistId) {
        setSelectedArtistId(cookieArtistId)
        updateSelectedArtistName(cookieArtistId)
      } else {
        setSelectedArtistId(null)
        setSelectedArtistName('All Artists')
      }
    }
  }



  const handleArtistSelect = (artistId: string | null) => {
    // Update local state immediately for instant UI feedback
    setSelectedArtistId(artistId)
    if (artistId && artists.length > 0) {
      updateSelectedArtistName(artistId)
    } else {
      setSelectedArtistName('All Artists')
    }
    
    // Update URL and cookie
    clientUtils.setSelectedArtistId(artistId, router)
  }

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 max-w-screen-2xl items-center px-4">
        {/* Logo & Brand - Clickable to navigate to dashboard */}
        <button
          onClick={() => {
            // CONTEXT: Navigate to appropriate dashboard based on user role
            // BUSINESS_RULE: Clients go to /c, employees go to /a, unauthenticated go to /
            if (user && role) {
              if (role === 'client') {
                router.push('/c')
              } else if (['agent', 'admin'].includes(role)) {
                router.push('/a')
              } else {
                router.push('/')
              }
            } else {
              router.push('/')
            }
          }}
          className="flex items-center space-x-3 mr-6 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to dashboard"
        >
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
        </button>
        
        <div className="flex flex-1 items-center space-x-3">
          {/* Artist Selector - Only show when authenticated as employee */}
          {user && profile && ['agent', 'admin'].includes(role || '') && (() => {
            console.log('Rendering artist selector:', { user: user?.email, role, artists: artists.length })
            return true
          })() && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-[200px] justify-between border border-border/50 hover:border-border hover:bg-accent/50">
                  <span className="text-sm font-medium truncate">{selectedArtistName}</span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                <DropdownMenuItem 
                  onClick={() => handleArtistSelect(null)}
                  className={selectedArtistId === null ? 'bg-accent' : ''}
                >
                  All Artists
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {artists.map(artist => (
                  <DropdownMenuItem 
                    key={artist.id}
                    onClick={() => handleArtistSelect(artist.id)}
                    className={selectedArtistId === artist.id ? 'bg-accent' : ''}
                  >
                    {artist.name}
                  </DropdownMenuItem>
                ))}
                {artists.length === 0 && (
                  <DropdownMenuItem disabled>Loading artists...</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications Bell - Only show for employees */}
          {user && profile && ['agent', 'admin'].includes(role || '') && (
            <NotificationBell userId={user.id} artistId={selectedArtistId || undefined} />
          )}

          {/* Chat Unread Count - Only show for employees */}
          {user && profile && ['agent', 'admin'].includes(role || '') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent/50 relative">
                    <MessageSquare className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                    <span className="sr-only">Chat messages</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unread chat messages{selectedArtistId ? ` (filtered by ${selectedArtistName})` : ' (all artists)'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Account Menu */}
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user && profile ? (
            <DropdownMenu key={`user-menu-${user.id}-${authKey}`}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 rounded-full p-0 hover:bg-accent/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Open user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 text-sm">
                  <div className="font-semibold">{profile?.full_name || user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  {role && (
                    <div className="text-xs text-muted-foreground capitalize mt-1">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {role}
                      </span>
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Profile</DropdownMenuItem>
                <DropdownMenuItem disabled>Settings</DropdownMenuItem>
                {/* CONTEXT: Admin Panel navigation - only visible to admin users */}
                {/* SECURITY: Role-based access control for RBAC system */}
                {/* BUSINESS_RULE: Admin users can access user management via dropdown */}
                {role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : pathname !== '/login' ? (
            <Button variant="default" size="sm" className="h-9" onClick={() => window.location.href = '/login'}>
              Sign In
            </Button>
          ) : null}
        </div>
      </div>
      
      {/* Real-time unread count updates - Only for employees */}
      {user && profile && ['agent', 'admin'].includes(role || '') && (
        <GlobalUnreadClient
          initialCount={unreadCount}
          artistId={selectedArtistId}
          userId={user.id}
          onCountUpdate={setUnreadCount}
        />
      )}
    </header>
  )
}
