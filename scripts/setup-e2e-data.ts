import { createClient } from '@supabase/supabase-js'
import { Database } from '../lib/database.types'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key in environment variables')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test credentials from environment
const testClientEmail = process.env.E2E_CLIENT_EMAIL || 'client@test.example.com'
const testClientPassword = process.env.E2E_CLIENT_PASSWORD || 'TestPassword123!'

async function setupE2EData() {
  console.log('🚀 Setting up E2E test data...')

  try {
    // 1. Create test client user in Supabase Auth
    console.log('📧 Creating test client user...')
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testClientEmail,
      password: testClientPassword,
      email_confirm: true
    })

    if (authError && authError.status !== 422 && !authError.message.includes('already registered')) {
      throw authError
    }

    const userId = authUser.user?.id || (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === testClientEmail)?.id

    if (!userId) {
      throw new Error('Could not create or find test user')
    }

    console.log(`✅ Test user created/found: ${userId}`)

    // 2. Upsert user in our users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: testClientEmail,
        role: 'client',
        full_name: 'E2E Test Client',
        is_active: true
      }, {
        onConflict: 'id'
      })

    if (userError) throw userError
    console.log('✅ User record created in users table')

    // 3. Ensure we have a test artist
    const { data: existingArtist } = await supabaseAdmin
      .from('artists')
      .select('id')
      .eq('name', 'E2E Test Artist')
      .single()

    let artistId = existingArtist?.id

    if (!artistId) {
      const { data: artist, error: artistError } = await supabaseAdmin
        .from('artists')
        .insert({
          id: uuidv4(),
          name: 'E2E Test Artist',
          description: 'Test artist for E2E testing',
          contact_email: 'artist@test.example.com'
        })
        .select('id')
        .single()

      if (artistError) throw artistError
      artistId = artist.id
      console.log('✅ Test artist created')
    } else {
      console.log('✅ Test artist already exists')
    }

    // 4. Assign client to artist
    const { error: assignmentError } = await supabaseAdmin
      .from('artist_assignments')
      .upsert({
        user_id: userId,
        artist_id: artistId
      }, {
        onConflict: 'user_id,artist_id'
      })

    if (assignmentError) throw assignmentError
    console.log('✅ Client assigned to test artist')

    // 5. Create a test project
    const { data: existingProject } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('name', 'E2E Test Tour')
      .single()

    let projectId = existingProject?.id

    if (!projectId) {
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .insert({
          id: uuidv4(),
          name: 'E2E Test Tour',
          type: 'tour',
          artist_id: artistId,
          description: 'Test tour for E2E testing'
        })
        .select('id')
        .single()

      if (projectError) throw projectError
      projectId = project.id
      console.log('✅ Test project created')
    } else {
      console.log('✅ Test project already exists')
    }

    // 6. Create test legs and options
    const { data: existingLeg } = await supabaseAdmin
      .from('legs')
      .select('id')
      .eq('project_id', projectId)
      .single()

    let legId = existingLeg?.id

    if (!legId) {
      const { data: leg, error: legError } = await supabaseAdmin
        .from('legs')
        .insert({
          id: uuidv4(),
          project_id: projectId,
          label: 'E2E Test Leg',
          origin_city: 'Los Angeles, CA',
          destination_city: 'New York, NY',
          departure_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          leg_order: 1
        })
        .select('id')
        .single()

      if (legError) throw legError
      legId = leg.id
      console.log('✅ Test leg created')

      // Create test personnel and passengers
      const personnelId = uuidv4()
      await supabaseAdmin
        .from('tour_personnel')
        .insert({
          id: personnelId,
          project_id: projectId,
          full_name: 'Test Client User',
          email: testClientEmail,
          role_title: 'VIP',
          is_vip: true
        })

      await supabaseAdmin
        .from('leg_passengers')
        .insert({
          leg_id: legId,
          passenger_id: personnelId,
          treat_as_individual: false
        })

      // Create test options
      const option1Id = uuidv4()
      const option2Id = uuidv4()

      await supabaseAdmin
        .from('options')
        .insert([
          {
            id: option1Id,
            leg_id: legId,
            name: 'Premium Charter',
            description: 'Direct private jet charter',
            total_cost: 50000,
            currency: 'USD',
            is_recommended: true,
            is_available: true
          },
          {
            id: option2Id,
            leg_id: legId,
            name: 'Economy Option',
            description: 'Commercial flight with upgrades',
            total_cost: 15000,
            currency: 'USD',
            is_recommended: false,
            is_available: true
          }
        ])

      console.log('✅ Test personnel, passengers, and options created')
    } else {
      console.log('✅ Test leg already exists with data')
    }

    console.log('\n🎉 E2E test data setup complete!')
    console.log('\nTest credentials:')
    console.log(`Email: ${testClientEmail}`)
    console.log(`Password: ${testClientPassword}`)
    console.log(`Artist: E2E Test Artist`)
    console.log(`Project: E2E Test Tour`)
    console.log('\nYou can now run E2E tests!')

  } catch (error) {
    console.error('❌ Error setting up E2E data:', error)
    process.exit(1)
  }
}

setupE2EData().catch(console.error)
