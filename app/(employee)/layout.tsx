import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check user authentication and role
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }
  
  // If user is a client, redirect to client portal
  if (user.role === 'client') {
    redirect('/c')
  }

  return (
    <div className="employee-portal">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-green-600">Employee Portal</h2>
        <p className="text-muted-foreground">
          Flight management and crew coordination - {user.user?.full_name || user.email} ({user.role})
        </p>
      </div>
      {children}
    </div>
  )
}
