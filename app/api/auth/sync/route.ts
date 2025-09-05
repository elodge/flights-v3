import { NextRequest, NextResponse } from 'next/server'
import { syncUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      )
    }

    // CONTEXT: Validate userId is a proper UUID format
    // SECURITY: Prevent invalid UUIDs from causing database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      console.error('Invalid UUID format in auth sync:', userId)
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    const user = await syncUser(userId, email)

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
