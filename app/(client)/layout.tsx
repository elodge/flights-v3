import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check user authentication and role
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }
  
  // If user is not a client, redirect to appropriate portal
  if (user.role !== 'client') {
    redirect('/a')
  }

  return (
    <div className="client-portal">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-blue-600">Client Portal</h2>
        <p className="text-muted-foreground">Welcome to your flight management dashboard, {user.user?.full_name || user.email}</p>
      </div>
      {children}
    </div>
  )
}
