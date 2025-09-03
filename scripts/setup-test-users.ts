import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
import path from 'path'
import { Database } from '../lib/database.types'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Test users to create
const testUsers = [
  {
    email: 'client@test.example.com',
    password: 'TestPassword123!',
    role: 'client' as const,
    full_name: 'Test Client User',
    description: 'Client user assigned to test artists'
  },
  {
    email: 'agent@test.example.com', 
    password: 'AgentPassword123!',
    role: 'agent' as const,
    full_name: 'Test Agent User',
    description: 'Agent user with access to all artists'
  },
  {
    email: 'admin@test.example.com',
    password: 'AdminPassword123!', 
    role: 'admin' as const,
    full_name: 'Test Admin User',
    description: 'Admin user with full system access'
  }
]

async function createTestUser(userInfo: typeof testUsers[0]) {
  console.log(`📧 Creating user: ${userInfo.email}`)
  
  let userId: string | undefined

  // Try to create user in Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: userInfo.email,
    password: userInfo.password,
    email_confirm: true,
  })

  if (authError && authError.status !== 422 && !authError.message.includes('already registered')) {
    throw authError
  }

  // Get user ID (either from creation or find existing)
  userId = authUser.user?.id || 
    (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === userInfo.email)?.id

  if (!userId) {
    throw new Error(`Could not create or find user: ${userInfo.email}`)
  }

  // Upsert user in our users table
  const { error: userError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      email: userInfo.email,
      role: userInfo.role,
      full_name: userInfo.full_name,
      is_active: true
    }, {
      onConflict: 'id'
    })

  if (userError) throw userError

  console.log(`✅ Created ${userInfo.role} user: ${userInfo.email}`)
  return { userId, ...userInfo }
}

async function setupTestUsers() {
  console.log('🚀 Setting up test users...\n')

  const createdUsers = []

  for (const userInfo of testUsers) {
    try {
      const user = await createTestUser(userInfo)
      createdUsers.push(user)
    } catch (error) {
      console.error(`❌ Error creating user ${userInfo.email}:`, error)
    }
  }

  // Assign client user to test artist (if exists)
  const clientUser = createdUsers.find(u => u.role === 'client')
  if (clientUser) {
    const { data: artist } = await supabaseAdmin
      .from('artists')
      .select('id')
      .eq('name', 'E2E Test Artist')
      .single()

    if (artist) {
      await supabaseAdmin
        .from('artist_assignments')
        .upsert({
          user_id: clientUser.userId,
          artist_id: artist.id
        }, { onConflict: 'user_id,artist_id' })
      
      console.log('✅ Assigned client to E2E Test Artist')
    }
  }

  console.log('\n🎉 Test users setup complete!\n')
  console.log('📋 **Available Test Users:**\n')
  
  createdUsers.forEach(user => {
    console.log(`**${user.role.toUpperCase()} USER:**`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Password: ${user.password}`)
    console.log(`  Name: ${user.full_name}`)
    console.log(`  Description: ${user.description}`)
    console.log('')
  })

  console.log('🔗 **Login URL:** http://localhost:3003/login')
  console.log('\n💡 **Usage Tips:**')
  console.log('- Client users can only see projects for their assigned artists')
  console.log('- Agent/Admin users can see all projects and artists')
  console.log('- All users can access their respective portals (/c for clients, /a for agents/admins)')
}

setupTestUsers().catch(error => {
  console.error('❌ Error setting up test users:', error)
  process.exit(1)
})
