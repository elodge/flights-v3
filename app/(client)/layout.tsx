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
    <>
      {children}
    </>
  )
}
