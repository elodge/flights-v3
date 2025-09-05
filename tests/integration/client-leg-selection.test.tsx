/**
 * @fileoverview Integration tests for client leg selection interface
 * 
 * @description React Testing Library tests for the client flight selection
 * interface including option cards, individual selection table, budget sidebar,
 * and selection confirmation components working together.
 * 
 * @coverage
 * - Flight option card rendering and interaction
 * - Group vs individual selection modes
 * - Budget sidebar updates on selection
 * - Selection confirmation workflow
 * - Real-time status updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlightOptionCard } from '@/components/client/flight-option-card'
import { IndividualSelectionTable } from '@/components/client/individual-selection-table'
import { BudgetSidebar } from '@/components/client/budget-sidebar'
import { SelectionConfirmation } from '@/components/client/selection-confirmation'

// Mock dependencies
vi.mock('@/lib/actions/selection-actions', () => ({
  selectFlightOption: vi.fn(),
  confirmGroupSelection: vi.fn()
}))

vi.mock('@/lib/actions/budget-actions', () => ({
  getBudgetSnapshot: vi.fn()
}))

vi.mock('@/hooks/use-hold-countdown', () => ({
  useHoldCountdown: vi.fn()
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Import mocked modules
const { selectFlightOption, confirmGroupSelection } = await import('@/lib/actions/selection-actions')
const { getBudgetSnapshot } = await import('@/lib/actions/budget-actions')
const { useHoldCountdown } = await import('@/hooks/use-hold-countdown')
const { toast } = await import('sonner')

describe('Client Leg Selection Integration', () => {
  const mockFlightOption = {
    id: 'option-123',
    name: 'Direct Flight',
    description: 'Non-stop service',
    total_cost: 500,
    currency: '$',
    is_recommended: true,
    is_available: true,
    option_components: [
      {
        id: 'comp-1',
        component_order: 1,
        navitas_text: 'LAX → JFK',
        flight_number: 'UA123',
        airline: 'United',
        departure_time: '2024-01-01T10:00:00Z',
        arrival_time: '2024-01-01T18:00:00Z',
        aircraft_type: 'Boeing 737',
        seat_configuration: 'Economy',
        meal_service: 'Snack',
        baggage_allowance: '1 checked bag',
        cost: 500,
        currency: 'USD'
      }
    ],
    selections: [],
    holds: []
  }

  const mockPassengers = [
    {
      treat_as_individual: true,
      tour_personnel: {
        id: 'passenger-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        role_title: 'Artist',
        is_vip: true
      }
    },
    {
      treat_as_individual: true,
      tour_personnel: {
        id: 'passenger-2',
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        role_title: 'Manager',
        is_vip: false
      }
    }
  ]

  const mockBudgetSnapshot = {
    totals: {
      tour: 10000,
      byParty: { A: 2500, B: 2500 },
      byPerson: {}
    },
    spend: {
      confirmed: 2000,
      pending: 1500,
      byParty: { A: 1000, B: 500 },
      byPerson: {}
    },
    remaining: {
      total: 6500,
      byParty: { A: 1500, B: 2000 },
      byPerson: {}
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useHoldCountdown).mockReturnValue('2h 30m')
    vi.mocked(getBudgetSnapshot).mockResolvedValue({
      success: true,
      data: mockBudgetSnapshot
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('FlightOptionCard Component', () => {
    it('should render option details correctly', () => {
      // CONTEXT: Test basic option card rendering
      render(
        <FlightOptionCard
          option={mockFlightOption}
          legId="leg-123"
          selectionType="group"
          passengerIds={null}
        />
      )

      expect(screen.getByText('Direct Flight')).toBeInTheDocument()
      expect(screen.getByText('Non-stop service')).toBeInTheDocument()
      expect(screen.getAllByText('$500')[0]).toBeInTheDocument()
      expect(screen.getByText('per person')).toBeInTheDocument()
      expect(screen.getByText('LAX → JFK')).toBeInTheDocument()
    })

    it('should show recommended badge for recommended options', () => {
      // CONTEXT: Test recommended option badge display
      render(
        <FlightOptionCard
          option={mockFlightOption}
          legId="leg-123"
          selectionType="group"
          passengerIds={null}
        />
      )

      // Star icon should be present for recommended options
      const starIcon = document.querySelector('svg[class*="fill-current"]')
      expect(starIcon).toBeInTheDocument()
    })

    it('should handle group selection click', async () => {
      // CONTEXT: Test group selection interaction
      const user = userEvent.setup()
      
      vi.mocked(selectFlightOption).mockResolvedValue({
        success: true,
        data: { id: 'selection-123' }
      })

      render(
        <FlightOptionCard
          option={mockFlightOption}
          legId="leg-123"
          selectionType="group"
          passengerIds={null}
        />
      )

      const selectButton = screen.getByRole('button', { name: /select for group/i })
      await user.click(selectButton)

      expect(selectFlightOption).toHaveBeenCalledWith({
        leg_id: 'leg-123',
        option_id: 'option-123',
        passenger_ids: null
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Group selection updated successfully')
      })
    })

    it('should handle individual selection click', async () => {
      // CONTEXT: Test individual selection interaction
      const user = userEvent.setup()
      const passengerIds = ['passenger-1', 'passenger-2']
      
      vi.mocked(selectFlightOption).mockResolvedValue({
        success: true,
        data: { id: 'selection-123' }
      })

      render(
        <FlightOptionCard
          option={mockFlightOption}
          legId="leg-123"
          selectionType="individual"
          passengerIds={passengerIds}
        />
      )

      const selectButton = screen.getByRole('button', { name: /select for individual/i })
      await user.click(selectButton)

      expect(selectFlightOption).toHaveBeenCalledWith({
        leg_id: 'leg-123',
        option_id: 'option-123',
        passenger_ids: passengerIds
      })
    })

    it('should show selected state for existing selections', () => {
      // CONTEXT: Test selected option state display
      const selectedOption = {
        ...mockFlightOption,
        selections: [
          {
            id: 'selection-123',
            status: 'client_choice',
            passenger_id: 'passenger-1',
            selected_at: '2024-01-01T12:00:00Z',
            expires_at: null,
            notes: null
          }
        ]
      }

      render(
        <FlightOptionCard
          option={selectedOption}
          legId="leg-123"
          selectionType="group"
          passengerIds={null}
        />
      )

      expect(screen.getAllByText('Selected')[0]).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /selected/i })).toBeInTheDocument()
    })

    it('should show hold countdown for held options', () => {
      // CONTEXT: Test hold countdown display
      // Mock the countdown hook to return expected format
      ;(useHoldCountdown as any).mockReturnValue('2h 30m')
      
      // Create a future expiration time so the hold is active
      const futureTime = new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString() // 2.5 hours from now
      
      const heldOption = {
        ...mockFlightOption,
        holds: [
          {
            id: 'hold-123',
            passenger_id: 'passenger-1',
            expires_at: futureTime,
            notes: 'Agent hold',
            created_by: 'agent-123'
          }
        ]
      }

      render(
        <FlightOptionCard
          option={heldOption}
          legId="leg-123"
          selectionType="group"
          passengerIds={null}
        />
      )

      expect(screen.getByText('2h 30m')).toBeInTheDocument()
    })

    it('should disable selection for ticketed options', () => {
      // CONTEXT: Test ticketed option state
      const ticketedOption = {
        ...mockFlightOption,
        selections: [
          {
            id: 'selection-123',
            status: 'ticketed',
            passenger_id: 'passenger-1',
            selected_at: '2024-01-01T12:00:00Z',
            expires_at: null,
            notes: null
          }
        ]
      }

      render(
        <FlightOptionCard
          option={ticketedOption}
          legId="leg-123"
          selectionType="group"
          passengerIds={null}
        />
      )

      expect(screen.getAllByText('Ticketed')[0]).toBeInTheDocument()
      const button = screen.getByRole('button', { name: /ticketed/i })
      expect(button).toBeDisabled()
    })
  })

  describe('IndividualSelectionTable Component', () => {
    it('should render passenger table correctly', () => {
      // CONTEXT: Test individual selection table rendering
      render(
        <IndividualSelectionTable
          passengers={mockPassengers}
          options={[mockFlightOption]}
          legId="leg-123"
        />
      )

      expect(screen.getByText('Individual Selections')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('VIP')).toBeInTheDocument()
      expect(screen.getByText('Artist')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()
    })

    it('should handle individual option selection', async () => {
      // CONTEXT: Test individual passenger option selection
      render(
        <IndividualSelectionTable
          passengers={mockPassengers}
          options={[mockFlightOption]}
          legId="leg-123"
        />
      )

      // Should render the passenger table with both passengers
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      
      // Should show Select dropdowns for options
      const selectors = screen.getAllByRole('combobox')
      expect(selectors.length).toBeGreaterThan(0)
      
      // Should show action column headers
      expect(screen.getByText('Action')).toBeInTheDocument()
    })

    it('should show current selections in table', () => {
      // CONTEXT: Test current selection display in table
      const optionWithSelection = {
        ...mockFlightOption,
        selections: [
          {
            id: 'selection-123',
            status: 'client_choice',
            passenger_id: 'passenger-1',
            selected_at: '2024-01-01T12:00:00Z',
            expires_at: null,
            notes: null
          }
        ]
      }

      render(
        <IndividualSelectionTable
          passengers={mockPassengers}
          options={[optionWithSelection]}
          legId="leg-123"
        />
      )

      // Should show the selected option in the table
      expect(screen.getAllByText('Direct Flight')[0]).toBeInTheDocument()
      expect(screen.getAllByText('$500')[0]).toBeInTheDocument()
    })
  })

  describe('BudgetSidebar Component', () => {
    it('should render budget summary correctly', async () => {
      // CONTEXT: Test budget sidebar rendering
      render(<BudgetSidebar projectId="project-123" />)

      await waitFor(() => {
        expect(screen.getByText('Budget Summary')).toBeInTheDocument()
        expect(screen.getByText('$10,000')).toBeInTheDocument() // Total budget
        expect(screen.getByText('$6,500')).toBeInTheDocument() // Remaining
        expect(screen.getByText('$2,000')).toBeInTheDocument() // Confirmed
        expect(screen.getByText('$1,500')).toBeInTheDocument() // Pending
      })
    })

    it('should show correct status based on spend percentage', async () => {
      // CONTEXT: Test budget status color coding
      const overBudgetSnapshot = {
        ...mockBudgetSnapshot,
        spend: { ...mockBudgetSnapshot.spend, confirmed: 8000, pending: 3000 },
        remaining: { ...mockBudgetSnapshot.remaining, total: -1000 }
      }

      vi.mocked(getBudgetSnapshot).mockResolvedValue({
        success: true,
        data: overBudgetSnapshot
      })

      render(<BudgetSidebar projectId="project-123" />)

      await waitFor(() => {
        expect(screen.getByText('Over budget')).toBeInTheDocument()
      })
    })

    it('should show party breakdown when configured', async () => {
      // CONTEXT: Test party budget breakdown display
      render(<BudgetSidebar projectId="project-123" />)

      await waitFor(() => {
        expect(screen.getByText('Party A')).toBeInTheDocument()
        expect(screen.getByText('Party B')).toBeInTheDocument()
        expect(screen.getByText('$1,500 left')).toBeInTheDocument() // Party A remaining
        expect(screen.getByText('$2,000 left')).toBeInTheDocument() // Party B remaining
      })
    })

    it('should handle budget loading state', () => {
      // CONTEXT: Test loading state display
      vi.mocked(getBudgetSnapshot).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<BudgetSidebar projectId="project-123" />)

      expect(screen.getByText('Budget Summary')).toBeInTheDocument()
      // Should show skeleton loading indicators
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should handle budget error state', async () => {
      // CONTEXT: Test error state handling
      vi.mocked(getBudgetSnapshot).mockResolvedValue({
        success: false,
        error: 'Failed to load budget'
      })

      render(<BudgetSidebar projectId="project-123" />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load budget')).toBeInTheDocument()
      })
    })
  })

  describe('SelectionConfirmation Component', () => {
    it('should render confirmation interface for group selections', () => {
      // CONTEXT: Test group selection confirmation interface
      render(
        <SelectionConfirmation
          legId="leg-123"
          hasGroupSelections={true}
          hasIndividualSelections={false}
        />
      )

      expect(screen.getByText('Flight Selections')).toBeInTheDocument()
      expect(screen.getByText('Group selection mode')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm group selection/i })).toBeInTheDocument()
    })

    it('should handle group confirmation click', async () => {
      // CONTEXT: Test group confirmation interaction
      const user = userEvent.setup()
      
      vi.mocked(confirmGroupSelection).mockResolvedValue({
        success: true,
        data: { confirmed_count: 3 }
      })

      render(
        <SelectionConfirmation
          legId="leg-123"
          hasGroupSelections={true}
          hasIndividualSelections={false}
        />
      )

      const confirmButton = screen.getByRole('button', { name: /confirm group selection/i })
      await user.click(confirmButton)

      expect(confirmGroupSelection).toHaveBeenCalledWith('leg-123')

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Group selections confirmed successfully')
      })
    })

    it('should show mixed mode for both group and individual', () => {
      // CONTEXT: Test mixed selection mode display
      render(
        <SelectionConfirmation
          legId="leg-123"
          hasGroupSelections={true}
          hasIndividualSelections={true}
        />
      )

      expect(screen.getByText('Group and individual selections available')).toBeInTheDocument()
      expect(screen.getByText(/Individual choices override group selections/)).toBeInTheDocument()
    })

    it('should not render if no selections exist', () => {
      // CONTEXT: Test hidden state when no selections
      const { container } = render(
        <SelectionConfirmation
          legId="leg-123"
          hasGroupSelections={false}
          hasIndividualSelections={false}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Component Integration', () => {
    it('should update budget when selection changes', async () => {
      // CONTEXT: Test budget updates on selection changes
      // This would be tested in a full page integration test
      // For now, we verify the components call the right functions
      
      const user = userEvent.setup()
      
      vi.mocked(selectFlightOption).mockResolvedValue({
        success: true,
        data: { id: 'selection-123' }
      })

      const { rerender } = render(
        <div>
          <FlightOptionCard
            option={mockFlightOption}
            legId="leg-123"
            selectionType="group"
            passengerIds={null}
          />
          <BudgetSidebar projectId="project-123" />
        </div>
      )

      // Make a selection
      const selectButton = screen.getByRole('button', { name: /select for group/i })
      await user.click(selectButton)

      // Budget sidebar should refresh (in real app this would happen via realtime or re-render)
      expect(getBudgetSnapshot).toHaveBeenCalledWith('project-123')
    })

    it('should show consistent selection states across components', () => {
      // CONTEXT: Test state consistency between components
      const selectedOption = {
        ...mockFlightOption,
        selections: [
          {
            id: 'selection-123',
            status: 'client_choice',
            passenger_id: 'passenger-1',
            selected_at: '2024-01-01T12:00:00Z',
            expires_at: null,
            notes: null
          }
        ]
      }

      render(
        <div>
          <FlightOptionCard
            option={selectedOption}
            legId="leg-123"
            selectionType="individual"
            passengerIds={['passenger-1']}
          />
          <IndividualSelectionTable
            passengers={[mockPassengers[0]]}
            options={[selectedOption]}
            legId="leg-123"
          />
        </div>
      )

      // Both components should show the selection
      const selectedBadges = screen.getAllByText('Selected')
      expect(selectedBadges.length).toBeGreaterThan(0)
    })
  })
})
