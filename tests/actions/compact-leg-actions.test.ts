/**
 * @fileoverview Tests for compact leg management server actions
 * 
 * @description Unit tests for server actions that create flight options from
 * Navitas or manual entry data and attach them to selected passengers.
 * 
 * @coverage Tests option creation, passenger validation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOptionsForPassengers } from '@/lib/actions/compact-leg-actions'
import { createNormalizedFlightKey } from '@/lib/flight-utils'
import { NavitasOption } from '@/lib/navitas'

// Mock server-only modules
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn()
}))
vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn()
}))
vi.mock('@/lib/navitas', () => ({
  parseNavitasText: vi.fn()
}))
vi.mock('@/lib/enrichment-service', () => ({
  enrichFlightSegments: vi.fn()
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        in: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

// Set up the mock chain properly
const mockFrom = mockSupabase.from()
const mockSelect = mockFrom.select()
const mockEq = mockSelect.eq()
const mockInsert = mockFrom.insert()
const mockInsertSelect = mockInsert.select()

const mockUser = {
  id: 'user-1',
  role: 'agent'
}

const mockNavitasOption: NavitasOption = {
  passenger: 'John Doe',
  totalFare: 450.00,
  currency: 'USD',
  reference: 'ABC123',
  segments: [
    {
      airline: 'AA',
      flightNumber: '1234',
      dateRaw: '15Jan',
      origin: 'LAX',
      destination: 'JFK',
      depTimeRaw: '10:00A',
      arrTimeRaw: '6:00P',
      dayOffset: 0
    }
  ],
  source: 'navitas',
  raw: 'Test Navitas text',
  errors: []
}

describe('createOptionsForPassengers', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Mock getServerUser
    const { getServerUser } = await import('@/lib/auth')
    vi.mocked(getServerUser).mockResolvedValue(mockUser)
    
    // Mock createServerClient
    const { createServerClient } = await import('@/lib/supabase-server')
    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
    
    // Mock enrichFlightSegments
    const { enrichFlightSegments } = await import('@/lib/enrichment-service')
    vi.mocked(enrichFlightSegments).mockResolvedValue([
      {
        airline: 'AA',
        flightNumber: '1234',
        origin: 'LAX',
        destination: 'JFK',
        depTimeRaw: '10:00A',
        arrTimeRaw: '6:00P',
        dayOffset: 0,
        navitas_text: 'AA 1234 LAX JFK',
        airline_name: 'American Airlines',
        departure_time: '10:00',
        arrival_time: '18:00',
        dep_time_local: '10:00',
        arr_time_local: '18:00',
        duration_minutes: 480,
        stops: 0,
        enriched_terminal_gate: null
      }
    ])
  })

  it('creates options for multiple passengers', async () => {
    // Mock leg exists
    mockEq.single.mockResolvedValue({
      data: { id: 'leg-1', project_id: 'project-1' },
      error: null
    })

    // Mock passenger assignments
    mockEq.in.mockResolvedValue({
      data: [{ passenger_id: 'passenger-1' }, { passenger_id: 'passenger-2' }],
      error: null
    })

    // Mock option creation
    mockInsertSelect.single.mockResolvedValue({
      data: { id: 'option-1' },
      error: null
    })

    // Mock component creation
    mockInsert.mockResolvedValue({
      error: null
    })

    const result = await createOptionsForPassengers({
      legId: 'leg-1',
      passengerIds: ['passenger-1', 'passenger-2'],
      options: [mockNavitasOption]
    })

    expect(result.success).toBe(true)
    expect(result.count).toBe(2)
  })

  it('returns error for unauthorized user', async () => {
    const { getServerUser } = await import('@/lib/auth')
    vi.mocked(getServerUser).mockResolvedValue(null)

    const result = await createOptionsForPassengers({
      legId: 'leg-1',
      passengerIds: ['passenger-1'],
      options: [mockNavitasOption]
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error for client role', async () => {
    const { getServerUser } = await import('@/lib/auth')
    vi.mocked(getServerUser).mockResolvedValue({ ...mockUser, role: 'client' })

    const result = await createOptionsForPassengers({
      legId: 'leg-1',
      passengerIds: ['passenger-1'],
      options: [mockNavitasOption]
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error for non-existent leg', async () => {
    mockEq.single.mockResolvedValue({
      data: null,
      error: { message: 'Not found' }
    })

    const result = await createOptionsForPassengers({
      legId: 'leg-1',
      passengerIds: ['passenger-1'],
      options: [mockNavitasOption]
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Leg not found')
  })

  it('returns error for invalid passengers', async () => {
    // Mock leg exists
    mockEq.single.mockResolvedValue({
      data: { id: 'leg-1', project_id: 'project-1' },
      error: null
    })

    // Mock passenger assignments (only one passenger assigned)
    mockEq.in.mockResolvedValue({
      data: [{ passenger_id: 'passenger-1' }],
      error: null
    })

    const result = await createOptionsForPassengers({
      legId: 'leg-1',
      passengerIds: ['passenger-1', 'passenger-2'], // passenger-2 not assigned
      options: [mockNavitasOption]
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid passengers: passenger-2')
  })

  it('handles missing required parameters', async () => {
    const result = await createOptionsForPassengers({
      legId: '',
      passengerIds: [],
      options: []
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Missing required parameters')
  })
})

describe('createNormalizedFlightKey', () => {
  it('creates normalized flight key correctly', () => {
    const flightData = {
      airline: 'AA',
      flightNumber: '1234',
      depDate: '2024-01-15',
      depIata: 'LAX',
      arrIata: 'JFK'
    }

    const key = createNormalizedFlightKey(flightData)
    expect(key).toBe('AA-1234-2024-01-15-LAX-JFK')
  })

  it('handles different airline codes', () => {
    const flightData = {
      airline: 'UA',
      flightNumber: '5678',
      depDate: '2024-02-20',
      depIata: 'SFO',
      arrIata: 'ORD'
    }

    const key = createNormalizedFlightKey(flightData)
    expect(key).toBe('UA-5678-2024-02-20-SFO-ORD')
  })
})
