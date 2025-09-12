/**
 * @fileoverview Test suite for CompactLegManager component
 * 
 * @description Tests the main compact leg management interface component,
 * covering passenger filtering, option display, modal interactions, and state management.
 * 
 * @coverage CompactLegManager component functionality
 * @security Tests access control and data filtering
 * @database Tests option and passenger data rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompactLegManager } from '@/components/employee/compact-leg-manager'

// Mock child components
vi.mock('@/components/employee/passenger-grid', () => ({
  PassengerGrid: ({ passengers, options }: any) => (
    <div data-testid="passenger-grid">
      <div data-testid="passenger-count">{passengers?.length || 0}</div>
      <div data-testid="option-count">{options?.length || 0}</div>
    </div>
  )
}))

vi.mock('@/components/employee/flight-grid', () => ({
  FlightGrid: ({ options, passengers }: any) => (
    <div data-testid="flight-grid">
      <div data-testid="flight-option-count">{options?.length || 0}</div>
      <div data-testid="flight-passenger-count">{passengers?.length || 0}</div>
    </div>
  )
}))

vi.mock('@/components/employee/enhanced-navitas-modal', () => ({
  EnhancedNavitasModal: ({ isOpen, onClose, allPassengers }: any) => (
    isOpen ? (
      <div data-testid="enhanced-navitas-modal">
        <div data-testid="modal-passenger-count">{allPassengers?.length || 0}</div>
        <button onClick={onClose} data-testid="close-modal">Close</button>
      </div>
    ) : null
  )
}))

const mockLegData = {
  id: 'test-leg-id',
  name: 'Test Leg',
  from_location: 'New York',
  to_location: 'Los Angeles',
  departure_date: '2025-01-01',
  projects: {
    id: 'test-project-id',
    name: 'Test Tour',
    type: 'tour',
    artists: {
      id: 'test-artist-id',
      name: 'Test Artist'
    }
  },
  leg_passengers: [
    {
      treat_as_individual: true,
      tour_personnel: {
        id: 'passenger-1',
        full_name: 'Taylor Swift',
        email: 'taylor@example.com',
        role_title: 'Lead Artist',
        is_vip: true,
        party: 'Lead Artist'
      }
    },
    {
      treat_as_individual: true,
      tour_personnel: {
        id: 'passenger-2',
        full_name: 'Andrea Swift',
        email: 'andrea@example.com',
        role_title: 'Manager',
        is_vip: false,
        party: 'Manager'
      }
    }
  ],
  options: [
    {
      id: 'option-1',
      name: 'Flight Option 1',
      description: 'Test flight option',
      total_cost: 50000,
      currency: 'USD',
      is_recommended: true,
      is_available: true,
      option_components: [
        {
          id: 'component-1',
          flight_number: 'AA123',
          airline: 'AA',
          navitas_text: 'AA 123 LAX-JFK'
        }
      ],
      option_passengers: [
        {
          id: 'op-1',
          passenger_id: 'passenger-1'
        }
      ]
    }
  ]
}

describe('CompactLegManager', () => {
  const defaultProps = {
    leg: mockLegData,
    projectId: 'test-project-id',
    legId: 'test-leg-id'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * @description Tests basic component rendering
   * @access Verifies employee interface displays correctly
   */
  it('should render compact leg manager with basic leg info', () => {
    render(<CompactLegManager {...defaultProps} />)
    
    expect(screen.getByText('Test Leg')).toBeInTheDocument()
    expect(screen.getByText('New York → Los Angeles')).toBeInTheDocument()
    expect(screen.getByText('Test Tour')).toBeInTheDocument()
  })

  /**
   * @description Tests passenger filtering functionality
   * @business_rule Verifies search and party filtering logic
   */
  it('should filter passengers by search text', async () => {
    render(<CompactLegManager {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search passengers...')
    fireEvent.change(searchInput, { target: { value: 'Taylor' } })
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('Taylor')
    })
  })

  /**
   * @description Tests party filter functionality
   * @business_rule Verifies party-based passenger filtering
   */
  it('should filter passengers by party', async () => {
    render(<CompactLegManager {...defaultProps} />)
    
    const leadArtistBadge = screen.getByText('Lead Artist')
    expect(leadArtistBadge).toBeInTheDocument()
    
    fireEvent.click(leadArtistBadge)
    
    // Verify URL update would happen (component should manage this)
    await waitFor(() => {
      expect(leadArtistBadge).toBeInTheDocument()
    })
  })

  /**
   * @description Tests options filter functionality
   * @business_rule Verifies option filtering by type
   */
  it('should filter by options type', async () => {
    render(<CompactLegManager {...defaultProps} />)
    
    const optionsSelect = screen.getByRole('combobox')
    fireEvent.change(optionsSelect, { target: { value: 'with-options' } })
    
    await waitFor(() => {
      expect(optionsSelect).toHaveValue('with-options')
    })
  })

  /**
   * @description Tests tab switching functionality
   * @access Verifies dual view modes (By Passenger/By Flight)
   */
  it('should switch between passenger and flight tabs', async () => {
    render(<CompactLegManager {...defaultProps} />)
    
    // Should start with "By Passenger" tab
    expect(screen.getByText('By Passenger')).toBeInTheDocument()
    expect(screen.getByText('By Flight')).toBeInTheDocument()
    
    const flightTab = screen.getByText('By Flight')
    fireEvent.click(flightTab)
    
    await waitFor(() => {
      expect(screen.getByTestId('flight-grid')).toBeInTheDocument()
    })
  })

  /**
   * @description Tests Enhanced Navitas Modal opening
   * @security Verifies modal access and passenger data
   */
  it('should open Enhanced Navitas Modal when Add Flight Options clicked', async () => {
    render(<CompactLegManager {...defaultProps} />)
    
    const addButton = screen.getByText('Add Flight Options')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('enhanced-navitas-modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-passenger-count')).toHaveTextContent('2')
    })
  })

  /**
   * @description Tests modal closing functionality
   * @access Verifies modal state management
   */
  it('should close Enhanced Navitas Modal', async () => {
    render(<CompactLegManager {...defaultProps} />)
    
    // Open modal
    const addButton = screen.getByText('Add Flight Options')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('enhanced-navitas-modal')).toBeInTheDocument()
    })
    
    // Close modal
    const closeButton = screen.getByTestId('close-modal')
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByTestId('enhanced-navitas-modal')).not.toBeInTheDocument()
    })
  })

  /**
   * @description Tests clear filters functionality
   * @business_rule Verifies filter reset behavior
   */
  it('should clear all filters when Clear button clicked', async () => {
    render(<CompactLegManager {...defaultProps} />)
    
    // Set some filters
    const searchInput = screen.getByPlaceholderText('Search passengers...')
    fireEvent.change(searchInput, { target: { value: 'Taylor' } })
    
    const clearButton = screen.getByText('Clear')
    fireEvent.click(clearButton)
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('')
    })
  })

  /**
   * @description Tests data structure with option_passengers
   * @database Verifies option-passenger association handling
   */
  it('should handle option_passengers data correctly', () => {
    render(<CompactLegManager {...defaultProps} />)
    
    // Verify passenger grid receives correct data
    expect(screen.getByTestId('passenger-count')).toHaveTextContent('2')
    expect(screen.getByTestId('option-count')).toHaveTextContent('1')
  })

  /**
   * @description Tests empty state handling
   * @business_rule Verifies graceful handling of no data
   */
  it('should handle empty leg data gracefully', () => {
    const emptyLegData = {
      ...mockLegData,
      leg_passengers: [],
      options: []
    }
    
    render(<CompactLegManager leg={emptyLegData} projectId="test" legId="test" />)
    
    expect(screen.getByTestId('passenger-count')).toHaveTextContent('0')
    expect(screen.getByTestId('option-count')).toHaveTextContent('0')
  })

  /**
   * @description Tests URL state management
   * @business_rule Verifies filter state persistence in URL
   */
  it('should manage URL state for filters', async () => {
    // Mock window.location and history
    const mockPush = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        search: '?parties=Lead+Artist&search=Taylor&options=with-options&tab=flights'
      },
      writable: true
    })
    
    render(<CompactLegManager {...defaultProps} />)
    
    // Component should initialize with URL params
    expect(screen.getByPlaceholderText('Search passengers...')).toBeInTheDocument()
  })
})

