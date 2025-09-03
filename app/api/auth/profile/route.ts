import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Fetch the user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
