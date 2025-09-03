"use client"

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bell, ChevronDown, LogOut, Plane } from 'lucide-react'
import { useUser } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Header() {
  const { user, profile, role, loading, signOut } = useUser()
  const pathname = usePathname()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleSignOut = async () => {
    await signOut()
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
        {/* Logo & Brand */}
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
        
        <div className="flex flex-1 items-center space-x-3">
          {/* Artist Selector - Only show when authenticated and mounted */}
          {hasMounted && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-[200px] justify-between border border-border/50 hover:border-border hover:bg-accent/50">
                  <span className="text-sm font-medium">Select Artist</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                <DropdownMenuItem disabled>No artists available</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications Button - Only show when authenticated and mounted */}
          {hasMounted && user && (
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent/50">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
          )}

          {/* Account Menu */}
          {!hasMounted || loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
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
    </header>
  )
}
