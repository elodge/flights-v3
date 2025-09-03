import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeeNav } from '@/components/employee/employee-nav'
import { createServerClient } from '@/lib/supabase-server'

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

  // Get queue count for navigation badge
  const supabase = await createServerClient()
  const { data: queueCount } = await supabase
    .from('selections')
    .select('id', { count: 'exact', head: true })
    .not('status', 'eq', 'expired')
    .not('status', 'eq', 'ticketed')

  return (
    <div className="employee-portal">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-green-600">Employee Portal</h2>
        <p className="text-muted-foreground">
          Flight management and crew coordination - {user.user?.full_name || user.email} ({user.role})
        </p>
      </div>
      
      <EmployeeNav queueCount={queueCount?.count || 0} />
      
      {children}
    </div>
  )
}
