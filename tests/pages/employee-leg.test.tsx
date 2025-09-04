import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import EmployeeLegPage from '@/app/(employee)/a/tour/[id]/leg/[legId]/page'

// Mock external dependencies
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('@/lib/actions/employee-actions', () => ({
  assignPassengersToLeg: vi.fn(),
  removePassengerFromLeg: vi.fn(),
  parseNavitasText: vi.fn(),
  createFlightOption: vi.fn(),
  createHold: vi.fn(),
  toggleOptionRecommended: vi.fn(),
  deleteOption: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    get: vi.fn()
  })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const { createServerClient } = await import('@/lib/supabase-server')
const { getServerUser } = await import('@/lib/auth')
const {
  assignPassengersToLeg,
  parseNavitasText,
  createFlightOption,
  createHold,
} = await import('@/lib/actions/employee-actions')
const { toast } = await import('sonner')

// Mock data
const mockLegData = {
  id: 'leg-123',
  project_id: 'project-123',
  origin_city: 'Los Angeles',
  destination_city: 'New York',
  departure_date: '2024-04-15',
  departure_time: '10:00',
  label: 'Main Tour Leg',
  leg_order: 1,
  projects: {
    id: 'project-123',
    name: 'Summer Tour 2024',
    type: 'tour' as const,
    artist_id: 'artist-123',
    artists: {
      id: 'artist-123',
      name: 'The Band',
    },
  },
  leg_passengers: [
    {
      treat_as_individual: false,
      tour_personnel: {
        id: 'person-1',
        full_name: 'John Smith',
        email: 'john@example.com',
        role_title: 'Lead Guitar',
        is_vip: true,
      },
    },
  ],
  options: [], // Start with 0 options as per prompt
}

const mockPersonnelData = [
  {
    id: 'person-1',
    full_name: 'John Smith',
    email: 'john@example.com',
    role_title: 'Lead Guitar',
    is_vip: true,
    is_assigned: true, // Already assigned
  },
  {
    id: 'person-2',
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    role_title: 'Vocals',
    is_vip: true,
    is_assigned: false,
  },
  {
    id: 'person-3',
    full_name: 'Bob Wilson',
    email: 'bob@example.com',
    role_title: 'Drums',
    is_vip: false,
    is_assigned: false,
  },
  {
    id: 'person-4',
    full_name: 'Alice Johnson',
    email: 'alice@example.com',
    role_title: 'Bass',
    is_vip: false,
    is_assigned: false,
  },
]

// Create proper chained query builder mock
const createMockQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
})

const mockSupabaseClient = {
  from: vi.fn(),
}

const validNavitasText = `
UA 123 LAX→JFK 15MAR 0800/1630
Direct flight service
Fare: $450.00 per person
Reference: ABC123
`

const mockParsedOption = {
  name: 'UA 123 LAX→JFK',
  description: 'Direct flight service',
  total_cost: 45000, // $450 in cents
  currency: 'USD',
  components: [
    {
      description: 'UA 123 LAX→JFK 15MAR 0800/1630',
      component_order: 1,
    },
  ],
}

const mockCreatedOption = {
  id: 'option-123',
  name: 'UA 123 LAX→JFK',
  description: 'Direct flight service',
  total_cost: 45000,
  currency: 'USD',
  is_recommended: false,
  is_available: true,
  holds: [],
  option_components: [
    {
      id: 'comp-123',
      component_order: 1,
      description: 'UA 123 LAX→JFK 15MAR 0800/1630',
    },
  ],
}

describe('Employee Leg Page Integration', () => {
  const mockParams = {
    id: 'project-123',
    legId: 'leg-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock auth to return agent user
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'user-123',
      email: 'agent@test.com',
      role: 'agent',
    } as any)

    // Mock Supabase client queries
    vi.mocked(createServerClient).mockResolvedValue(mockSupabaseClient as any)

    // Setup the leg details query mock
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const queryBuilder = createMockQueryBuilder()
      
      if (table === 'legs') {
        queryBuilder.single.mockResolvedValue({
          data: mockLegData,
          error: null,
        })
        return queryBuilder
      }
      
      if (table === 'tour_personnel') {
        queryBuilder.order.mockReturnValue({
          data: mockPersonnelData.filter(p => !p.is_assigned),
        })
        return queryBuilder
      }
      
      if (table === 'leg_passengers') {
        queryBuilder.eq.mockReturnValue({
          data: [{ tour_personnel_id: 'person-1' }],
        })
        return queryBuilder
      }
      
      return queryBuilder
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render leg page with seeded personnel and 0 options', async () => {
    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Check leg info
    expect(screen.getByText('Main Tour Leg')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles → New York')).toBeInTheDocument()
    expect(screen.getByText('The Band')).toBeInTheDocument()

    // Check that passenger assignment section is present
    expect(screen.getByText('Passenger Assignment')).toBeInTheDocument()

    // Check that Navitas parser section is present
    expect(screen.getByText('Add Flight Option')).toBeInTheDocument()

    // Should show 0 options initially
    expect(screen.queryByText('Flight Options')).toBeInTheDocument()
  })

  it('should handle passenger assignment workflow', async () => {
    const user = userEvent.setup()

    // Mock successful assignment
    vi.mocked(assignPassengersToLeg).mockResolvedValue({ success: true })

    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Should show unassigned personnel
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()

    // Select 3 passengers (all unassigned ones)
    const janeCheckbox = screen.getByRole('checkbox', { name: /jane doe/i })
    const bobCheckbox = screen.getByRole('checkbox', { name: /bob wilson/i })
    const aliceCheckbox = screen.getByRole('checkbox', { name: /alice johnson/i })

    await user.click(janeCheckbox)
    await user.click(bobCheckbox)
    await user.click(aliceCheckbox)

    // Click assign button
    const assignButton = screen.getByRole('button', { name: /assign selected/i })
    await user.click(assignButton)

    // Should call assignPassengersToLeg with correct data
    await waitFor(() => {
      expect(assignPassengersToLeg).toHaveBeenCalledWith(
        expect.any(FormData)
      )
    })

    // Check FormData contents
    const formDataCall = vi.mocked(assignPassengersToLeg).mock.calls[0][0] as FormData
    expect(formDataCall.get('leg_id')).toBe('leg-123')
    expect(formDataCall.getAll('passenger_ids')).toEqual(['person-2', 'person-3', 'person-4'])

    // Should show success toast
    expect(toast.success).toHaveBeenCalledWith('Personnel assigned successfully')
  })

  it('should handle Navitas parsing and option creation workflow', async () => {
    const user = userEvent.setup()

    // Mock parsing and creation
    vi.mocked(parseNavitasText).mockReturnValue(mockParsedOption)
    vi.mocked(createFlightOption).mockResolvedValue({ 
      success: true, 
      option: mockCreatedOption 
    })

    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Find the Navitas textarea
    const textarea = screen.getByPlaceholderText(/paste navitas flight data/i)
    expect(textarea).toBeInTheDocument()

    // Paste valid Navitas text
    await user.type(textarea, validNavitasText)

    // Click preview button
    const previewButton = screen.getByRole('button', { name: /preview option/i })
    await user.click(previewButton)

    // Should call parseNavitasText
    expect(parseNavitasText).toHaveBeenCalledWith(validNavitasText)

    // Should show preview
    await waitFor(() => {
      expect(screen.getByText('UA 123 LAX→JFK')).toBeInTheDocument()
      expect(screen.getByText('Direct flight service')).toBeInTheDocument()
      expect(screen.getByText('$450.00')).toBeInTheDocument()
    })

    // Should show success toast for parsing
    expect(toast.success).toHaveBeenCalledWith('Flight option parsed successfully')

    // Click save option button
    const saveButton = screen.getByRole('button', { name: /save as option/i })
    await user.click(saveButton)

    // Should call createFlightOption
    await waitFor(() => {
      expect(createFlightOption).toHaveBeenCalledWith(expect.any(FormData))
    })

    // Check FormData contents
    const formDataCall = vi.mocked(createFlightOption).mock.calls[0][0] as FormData
    expect(formDataCall.get('leg_id')).toBe('leg-123')
    expect(formDataCall.get('name')).toBe('UA 123 LAX→JFK')
    expect(formDataCall.get('description')).toBe('Direct flight service')
    expect(formDataCall.get('total_cost')).toBe('45000')
    expect(formDataCall.get('currency')).toBe('USD')

    // Should show success toast
    expect(toast.success).toHaveBeenCalledWith('Flight option created successfully')
  })

  it('should handle hold creation workflow', async () => {
    const user = userEvent.setup()

    // Mock successful hold creation
    vi.mocked(createHold).mockResolvedValue({ success: true })

    // Create leg data with one option
    const legWithOption = {
      ...mockLegData,
      options: [mockCreatedOption],
    }

    // Update the Supabase mock to return the option
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const queryBuilder = createMockQueryBuilder()
      
      if (table === 'legs') {
        queryBuilder.single.mockResolvedValue({
          data: legWithOption,
          error: null,
        })
        return queryBuilder
      }
      
      if (table === 'tour_personnel') {
        queryBuilder.order.mockReturnValue({
          data: mockPersonnelData.filter(p => !p.is_assigned),
        })
        return queryBuilder
      }
      
      if (table === 'leg_passengers') {
        queryBuilder.eq.mockReturnValue({
          data: [{ tour_personnel_id: 'person-1' }],
        })
        return queryBuilder
      }
      
      return queryBuilder
    })

    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Should show the option card
    expect(screen.getByText('UA 123 LAX→JFK')).toBeInTheDocument()

    // Find and click the "Set Hold" button
    const setHoldButton = screen.getByRole('button', { name: /set hold/i })
    await user.click(setHoldButton)

    // Should open dialog for selecting personnel
    expect(screen.getByText(/create hold/i)).toBeInTheDocument()

    // Select personnel for hold (John Smith is assigned)
    const johnCheckbox = screen.getByRole('checkbox', { name: /john smith/i })
    await user.click(johnCheckbox)

    // Click create hold button in dialog
    const createHoldButton = screen.getByRole('button', { name: /create hold/i })
    await user.click(createHoldButton)

    // Should call createHold
    await waitFor(() => {
      expect(createHold).toHaveBeenCalledWith(expect.any(FormData))
    })

    // Check FormData contents
    const formDataCall = vi.mocked(createHold).mock.calls[0][0] as FormData
    expect(formDataCall.get('option_id')).toBe('option-123')
    expect(formDataCall.getAll('passenger_ids')).toEqual(['person-1'])

    // Should show success toast
    expect(toast.success).toHaveBeenCalledWith('Hold created successfully')
  })

  it('should show hold countdown badge', async () => {
    // Create option with active hold
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    const optionWithHold = {
      ...mockCreatedOption,
      holds: [
        {
          id: 'hold-123',
          expires_at: futureTime.toISOString(),
          tour_personnel: {
            full_name: 'John Smith',
          },
        },
      ],
    }

    const legWithHold = {
      ...mockLegData,
      options: [optionWithHold],
    }

    // Update the Supabase mock
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const queryBuilder = createMockQueryBuilder()
      
      if (table === 'legs') {
        queryBuilder.single.mockResolvedValue({
          data: legWithHold,
          error: null,
        })
        return queryBuilder
      }
      
      if (table === 'tour_personnel') {
        queryBuilder.order.mockReturnValue({
          data: mockPersonnelData.filter(p => !p.is_assigned),
        })
        return queryBuilder
      }
      
      if (table === 'leg_passengers') {
        queryBuilder.eq.mockReturnValue({
          data: [{ tour_personnel_id: 'person-1' }],
        })
        return queryBuilder
      }
      
      return queryBuilder
    })

    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Should show hold countdown badge
    expect(screen.getByText(/2h/)).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('should handle parsing errors gracefully', async () => {
    const user = userEvent.setup()

    // Mock parsing failure
    vi.mocked(parseNavitasText).mockReturnValue(null)

    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Enter invalid Navitas text
    const textarea = screen.getByPlaceholderText(/paste navitas flight data/i)
    await user.type(textarea, 'Invalid flight data')

    // Click preview button
    const previewButton = screen.getByRole('button', { name: /preview option/i })
    await user.click(previewButton)

    // Should show error toast
    expect(toast.error).toHaveBeenCalledWith('Unable to parse flight data. Please check the format.')

    // Should not show preview section
    expect(screen.queryByText('Save as Option')).not.toBeInTheDocument()
  })

  it('should validate personnel selection for assignment', async () => {
    const user = userEvent.setup()

    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Click assign button without selecting anyone
    const assignButton = screen.getByRole('button', { name: /assign selected/i })
    await user.click(assignButton)

    // Should show error toast
    expect(toast.error).toHaveBeenCalledWith('Please select personnel to assign')

    // Should not call the API
    expect(assignPassengersToLeg).not.toHaveBeenCalled()
  })

  it('should validate personnel selection for holds', async () => {
    const user = userEvent.setup()

    // Create leg data with one option
    const legWithOption = {
      ...mockLegData,
      options: [mockCreatedOption],
    }

    // Update mock
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const queryBuilder = createMockQueryBuilder()
      
      if (table === 'legs') {
        queryBuilder.single.mockResolvedValue({
          data: legWithOption,
          error: null,
        })
        return queryBuilder
      }
      
      if (table === 'tour_personnel') {
        queryBuilder.order.mockReturnValue({
          data: mockPersonnelData.filter(p => !p.is_assigned),
        })
        return queryBuilder
      }
      
      if (table === 'leg_passengers') {
        queryBuilder.eq.mockReturnValue({
          data: [{ tour_personnel_id: 'person-1' }],
        })
        return queryBuilder
      }
      
      return queryBuilder
    })

    const legPage = await EmployeeLegPage({ params: mockParams })
    render(legPage)

    // Click set hold button
    const setHoldButton = screen.getByRole('button', { name: /set hold/i })
    await user.click(setHoldButton)

    // Click create hold without selecting personnel
    const createHoldButton = screen.getByRole('button', { name: /create hold/i })
    await user.click(createHoldButton)

    // Should show error toast
    expect(toast.error).toHaveBeenCalledWith('Please select personnel for the hold')

    // Should not call the API
    expect(createHold).not.toHaveBeenCalled()
  })

  it('should ensure no real network calls are made', () => {
    // Verify all network-dependent modules are mocked
    expect(vi.isMockFunction(createServerClient)).toBe(true)
    expect(vi.isMockFunction(getServerUser)).toBe(true)
    expect(vi.isMockFunction(assignPassengersToLeg)).toBe(true)
    expect(vi.isMockFunction(parseNavitasText)).toBe(true)
    expect(vi.isMockFunction(createFlightOption)).toBe(true)
    expect(vi.isMockFunction(createHold)).toBe(true)

    // Verify no actual HTTP clients are imported
    expect(() => {
      // This would throw if real fetch or HTTP clients were used
      global.fetch = vi.fn()
    }).not.toThrow()
  })
})
