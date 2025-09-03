#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { Database } from '../lib/database.types'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
  process.exit(1)
}

// Create admin client for seeding
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey)

interface SeedData {
  artists: Array<{
    id: string
    name: string
    description: string
    contact_email: string
  }>
  projects: Array<{
    id: string
    artist_id: string
    name: string
    type: 'tour' | 'event'
    start_date: string
    end_date: string
    budget_amount: number
  }>
  legs: Array<{
    id: string
    project_id: string
    label: string
    origin_city: string
    destination_city: string
    departure_date: string
    leg_order: number
  }>
  personnel: Array<{
    id: string
    project_id: string
    full_name: string
    email: string
    role_title: string
    is_vip: boolean
  }>
  leg_passengers: Array<{
    leg_id: string
    passenger_id: string
    treat_as_individual: boolean
  }>
  options: Array<{
    id: string
    leg_id: string
    name: string
    description: string
    total_cost: number
    is_recommended: boolean
  }>
  option_components: Array<{
    option_id: string
    component_order: number
    navitas_text: string
    flight_number: string
    airline: string
    departure_time: string
    arrival_time: string
    cost: number
  }>
  documents: Array<{
    passenger_id: string
    project_id: string
    type: 'itinerary' | 'invoice'
    filename: string
    file_path: string
    is_current: boolean
  }>
}

// Generate deterministic UUIDs for consistent seeding
function generateUUID(seed: string): string {
  // Simple deterministic UUID generation for seeding
  const hash = seed.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `${hex.substring(0, 8)}-${hex.substring(0, 4)}-${hex.substring(0, 4)}-${hex.substring(0, 4)}-${hex.substring(0, 12)}`
}

function createSeedData(): SeedData {
  // Artists
  const taylorSwiftId = generateUUID('artist-taylor-swift')
  const drakeId = generateUUID('artist-drake')
  
  const artists = [
    {
      id: taylorSwiftId,
      name: 'Taylor Swift',
      description: 'Global pop superstar with record-breaking tours',
      contact_email: 'management@taylorswift.com'
    },
    {
      id: drakeId,
      name: 'Drake',
      description: 'Multi-platinum hip-hop artist and cultural icon',
      contact_email: 'booking@octobersfirm.com'
    }
  ]

  // Projects
  const taylorTourId = generateUUID('project-taylor-tour')
  const taylorEventId = generateUUID('project-taylor-event')
  const drakeTourId = generateUUID('project-drake-tour')
  const drakeEventId = generateUUID('project-drake-event')

  const projects = [
    {
      id: taylorTourId,
      artist_id: taylorSwiftId,
      name: 'Eras Tour 2024',
      type: 'tour' as const,
      start_date: '2024-03-01',
      end_date: '2024-11-30',
      budget_amount: 2500000
    },
    {
      id: taylorEventId,
      artist_id: taylorSwiftId,
      name: 'Grammy Awards Performance',
      type: 'event' as const,
      start_date: '2024-02-15',
      end_date: '2024-02-16',
      budget_amount: 150000
    },
    {
      id: drakeTourId,
      artist_id: drakeId,
      name: 'For All The Dogs Tour',
      type: 'tour' as const,
      start_date: '2024-04-15',
      end_date: '2024-09-15',
      budget_amount: 1800000
    },
    {
      id: drakeEventId,
      artist_id: drakeId,
      name: 'OVO Fest 2024',
      type: 'event' as const,
      start_date: '2024-08-10',
      end_date: '2024-08-11',
      budget_amount: 300000
    }
  ]

  // Legs
  const legs = [
    // Taylor Eras Tour
    {
      id: generateUUID('leg-taylor-tour-1'),
      project_id: taylorTourId,
      label: 'Opening Night - Miami',
      origin_city: 'Nashville, TN',
      destination_city: 'Miami, FL',
      departure_date: '2024-03-01',
      leg_order: 1
    },
    {
      id: generateUUID('leg-taylor-tour-2'),
      project_id: taylorTourId,
      label: 'West Coast Run',
      origin_city: 'Miami, FL',
      destination_city: 'Los Angeles, CA',
      departure_date: '2024-03-15',
      leg_order: 2
    },
    // Taylor Grammy Event
    {
      id: generateUUID('leg-taylor-grammy'),
      project_id: taylorEventId,
      label: 'Grammy Performance',
      origin_city: 'Nashville, TN',
      destination_city: 'Los Angeles, CA',
      departure_date: '2024-02-14',
      leg_order: 1
    },
    // Drake Tour
    {
      id: generateUUID('leg-drake-tour-1'),
      project_id: drakeTourId,
      label: 'Tour Kickoff',
      origin_city: 'Toronto, ON',
      destination_city: 'New York, NY',
      departure_date: '2024-04-15',
      leg_order: 1
    },
    {
      id: generateUUID('leg-drake-tour-2'),
      project_id: drakeTourId,
      label: 'Southern Circuit',
      origin_city: 'New York, NY',
      destination_city: 'Atlanta, GA',
      departure_date: '2024-05-01',
      leg_order: 2
    },
    // Drake OVO Fest
    {
      id: generateUUID('leg-drake-ovo'),
      project_id: drakeEventId,
      label: 'OVO Fest Return',
      origin_city: 'Los Angeles, CA',
      destination_city: 'Toronto, ON',
      departure_date: '2024-08-09',
      leg_order: 1
    }
  ]

  // Personnel for each project
  const personnel = [
    // Taylor Eras Tour Personnel
    {
      id: generateUUID('personnel-taylor-1'),
      project_id: taylorTourId,
      full_name: 'Taylor Swift',
      email: 'taylor@taylorswift.com',
      role_title: 'Lead Artist',
      is_vip: true
    },
    {
      id: generateUUID('personnel-taylor-2'),
      project_id: taylorTourId,
      full_name: 'Andrea Swift',
      email: 'andrea@taylorswift.com',
      role_title: 'Manager',
      is_vip: true
    },
    {
      id: generateUUID('personnel-taylor-3'),
      project_id: taylorTourId,
      full_name: 'Tree Paine',
      email: 'tree@premierpr.com',
      role_title: 'Publicist',
      is_vip: false
    },
    {
      id: generateUUID('personnel-taylor-4'),
      project_id: taylorTourId,
      full_name: 'Jack Antonoff',
      email: 'jack@bleachersmusic.com',
      role_title: 'Producer/Collaborator',
      is_vip: false
    },
    // Taylor Grammy Personnel  
    {
      id: generateUUID('personnel-taylor-grammy-1'),
      project_id: taylorEventId,
      full_name: 'Taylor Swift',
      email: 'taylor@taylorswift.com',
      role_title: 'Performer',
      is_vip: true
    },
    {
      id: generateUUID('personnel-taylor-grammy-2'),
      project_id: taylorEventId,
      full_name: 'Andrea Swift',
      email: 'andrea@taylorswift.com',
      role_title: 'Manager',
      is_vip: true
    },
    {
      id: generateUUID('personnel-taylor-grammy-3'),
      project_id: taylorEventId,
      full_name: 'Joseph Kahn',
      email: 'joe@josephkahn.com',
      role_title: 'Creative Director',
      is_vip: false
    },
    // Drake Tour Personnel
    {
      id: generateUUID('personnel-drake-1'),
      project_id: drakeTourId,
      full_name: 'Drake',
      email: 'drake@octobersfirm.com',
      role_title: 'Lead Artist',
      is_vip: true
    },
    {
      id: generateUUID('personnel-drake-2'),
      project_id: drakeTourId,
      full_name: 'Oliver El-Khatib',
      email: 'oliver@octobersfirm.com',
      role_title: 'Manager',
      is_vip: true
    },
    {
      id: generateUUID('personnel-drake-3'),
      project_id: drakeTourId,
      full_name: 'Noah Shebib',
      email: 'noah@40ent.com',
      role_title: 'Producer',
      is_vip: false
    },
    {
      id: generateUUID('personnel-drake-4'),
      project_id: drakeTourId,
      full_name: 'Chubbs',
      email: 'chubbs@octobersfirm.com',
      role_title: 'Security',
      is_vip: false
    },
    // Drake OVO Personnel
    {
      id: generateUUID('personnel-drake-ovo-1'),
      project_id: drakeEventId,
      full_name: 'Drake',
      email: 'drake@octobersfirm.com',
      role_title: 'Headliner',
      is_vip: true
    },
    {
      id: generateUUID('personnel-drake-ovo-2'),
      project_id: drakeEventId,
      full_name: 'Oliver El-Khatib',
      email: 'oliver@octobersfirm.com',
      role_title: 'Event Producer',
      is_vip: true
    },
    {
      id: generateUUID('personnel-drake-ovo-3'),
      project_id: drakeEventId,
      full_name: 'Party Next Door',
      email: 'party@octobersfirm.com',
      role_title: 'Supporting Act',
      is_vip: false
    }
  ]

  // Assign personnel to legs
  const leg_passengers = [
    // Taylor tour legs - all main personnel on both legs
    ...legs.filter(l => l.project_id === taylorTourId).flatMap(leg => 
      personnel.filter(p => p.project_id === taylorTourId).map(person => ({
        leg_id: leg.id,
        passenger_id: person.id,
        treat_as_individual: person.is_vip
      }))
    ),
    // Taylor Grammy - all personnel  
    ...legs.filter(l => l.project_id === taylorEventId).flatMap(leg =>
      personnel.filter(p => p.project_id === taylorEventId).map(person => ({
        leg_id: leg.id,
        passenger_id: person.id,
        treat_as_individual: person.is_vip
      }))
    ),
    // Drake tour legs
    ...legs.filter(l => l.project_id === drakeTourId).flatMap(leg =>
      personnel.filter(p => p.project_id === drakeTourId).map(person => ({
        leg_id: leg.id,
        passenger_id: person.id,
        treat_as_individual: person.is_vip
      }))
    ),
    // Drake OVO
    ...legs.filter(l => l.project_id === drakeEventId).flatMap(leg =>
      personnel.filter(p => p.project_id === drakeEventId).map(person => ({
        leg_id: leg.id,
        passenger_id: person.id,
        treat_as_individual: person.is_vip
      }))
    )
  ]

  // Options for each leg
  const options = legs.map(leg => ({
    id: generateUUID(`option-${leg.id}`),
    leg_id: leg.id,
    name: `Premium Charter Option`,
    description: `Private jet charter for ${leg.label}`,
    total_cost: Math.floor(Math.random() * 50000) + 25000,
    is_recommended: true
  }))

  // Option components
  const option_components = options.map(option => ({
    option_id: option.id,
    component_order: 1,
    navitas_text: `PRIVATE JET CHARTER\n${option.description}\nLuxury cabin configuration\nCatering and ground transportation included`,
    flight_number: `PJ${Math.floor(Math.random() * 9000) + 1000}`,
    airline: Math.random() > 0.5 ? 'NetJets' : 'Flexjet',
    departure_time: '2024-03-01T10:00:00Z',
    arrival_time: '2024-03-01T14:00:00Z',
    cost: option.total_cost
  }))

  // Documents
  const documents = personnel.map(person => [
    {
      passenger_id: person.id,
      project_id: person.project_id,
      type: 'itinerary' as const,
      filename: `${person.full_name.replace(' ', '_')}_Itinerary.pdf`,
      file_path: `/documents/itineraries/${person.id}_itinerary.pdf`,
      is_current: true
    },
    {
      passenger_id: person.id,
      project_id: person.project_id,
      type: 'invoice' as const,
      filename: `${person.full_name.replace(' ', '_')}_Invoice.pdf`,
      file_path: `/documents/invoices/${person.id}_invoice.pdf`,
      is_current: true
    }
  ]).flat()

  return {
    artists,
    projects,
    legs,
    personnel,
    leg_passengers,
    options,
    option_components,
    documents
  }
}

async function clearExistingData() {
  console.log('🧹 Clearing existing seed data...')
  
  // Delete in reverse dependency order
  await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('option_components').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('options').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('leg_passengers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('tour_personnel').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('legs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('artist_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('artists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

async function seedData() {
  console.log('🌱 Starting database seeding...')
  
  const data = createSeedData()
  
  try {
    // Clear existing data first
    await clearExistingData()
    
    // Insert artists
    console.log('📸 Inserting artists...')
    const { error: artistsError } = await supabase
      .from('artists')
      .insert(data.artists)
    if (artistsError) throw artistsError
    
    // Insert projects
    console.log('🎯 Inserting projects...')
    const { error: projectsError } = await supabase
      .from('projects')
      .insert(data.projects)
    if (projectsError) throw projectsError
    
    // Insert legs
    console.log('✈️ Inserting legs...')
    const { error: legsError } = await supabase
      .from('legs')
      .insert(data.legs)
    if (legsError) throw legsError
    
    // Insert personnel
    console.log('👥 Inserting tour personnel...')
    const { error: personnelError } = await supabase
      .from('tour_personnel')
      .insert(data.personnel)
    if (personnelError) throw personnelError
    
    // Insert leg passengers
    console.log('🎫 Inserting leg passenger assignments...')
    const { error: legPassengersError } = await supabase
      .from('leg_passengers')
      .insert(data.leg_passengers)
    if (legPassengersError) throw legPassengersError
    
    // Insert options
    console.log('⚙️ Inserting flight options...')
    const { error: optionsError } = await supabase
      .from('options')
      .insert(data.options)
    if (optionsError) throw optionsError
    
    // Insert option components
    console.log('🔧 Inserting option components...')
    const { error: componentsError } = await supabase
      .from('option_components')
      .insert(data.option_components)
    if (componentsError) throw componentsError
    
    // Insert documents
    console.log('📄 Inserting documents...')
    const { error: documentsError } = await supabase
      .from('documents')
      .insert(data.documents)
    if (documentsError) throw documentsError
    
    console.log('✅ Seeding completed successfully!')
    
    // Display summary
    console.log('\n📊 Seeded Data Summary:')
    console.log(`   • ${data.artists.length} Artists`)
    console.log(`   • ${data.projects.length} Projects (${data.projects.filter(p => p.type === 'tour').length} tours, ${data.projects.filter(p => p.type === 'event').length} events)`)
    console.log(`   • ${data.legs.length} Legs`)
    console.log(`   • ${data.personnel.length} Personnel`)
    console.log(`   • ${data.leg_passengers.length} Leg-Passenger assignments`)
    console.log(`   • ${data.options.length} Flight options`)
    console.log(`   • ${data.option_components.length} Option components`)
    console.log(`   • ${data.documents.length} Documents`)
    
    console.log('\n🎯 Next Steps:')
    console.log('   1. Create a test client user in Supabase Auth (if not already done)')
    console.log('   2. Assign the client to Taylor Swift using:')
    console.log(`      INSERT INTO artist_assignments (user_id, artist_id)`)
    console.log(`      VALUES ('CLIENT_USER_ID', '${data.artists[0].id}');`)
    console.log('   3. Login as the client and verify you only see Taylor Swift projects')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding
seedData().then(() => {
  console.log('🎉 Database seeding completed!')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Fatal error during seeding:', error)
  process.exit(1)
})
