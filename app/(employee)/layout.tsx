import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeeNav } from '@/components/employee/employee-nav'
import { createAdminClient } from '@/lib/supabase'

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

  // Get queue count for navigation badge (show total across all artists for now)
  let queueCount = { count: 0 }
  try {
    const adminSupabase = createAdminClient()
    const { data: selections } = await adminSupabase
      .from('selections')
      .select('id')
      .not('status', 'eq', 'expired')
      .not('status', 'eq', 'ticketed')
    
    queueCount = { count: selections?.length || 0 }
  } catch (error) {
    // If admin client fails (e.g., missing service role key), fall back to 0
    console.warn('Unable to fetch queue count:', error)
    queueCount = { count: 0 }
  }

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
