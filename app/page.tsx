import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, UserCheck } from 'lucide-react'

export default async function Home() {
  // Check if user is already authenticated and redirect them
  const user = await getServerUser()
  
  if (user) {
    // Redirect based on role
    if (user.role === 'client') {
      redirect('/c')
    } else {
      redirect('/a')
    }
  } else {
    // If not authenticated, redirect to login
    redirect('/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Daysheets Flight Management
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Professional flight management system for artists and crews. 
          Please sign in to access your portal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Client Portal</CardTitle>
            <CardDescription>
              Access your flight information, schedules, and travel details
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/login">
                Sign In as Client
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <UserCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Employee Portal</CardTitle>
            <CardDescription>
              Manage flights, schedules, and crew assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/login">
                Sign In as Employee
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
