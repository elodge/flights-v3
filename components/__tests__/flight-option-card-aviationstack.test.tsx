/**
 * @fileoverview Integration tests for FlightOptionCard with AviationStack enrichment
 * 
 * @description Tests the integration of AviationStack flight data enrichment
 * into the FlightOptionCard component, including badge display and fallback behavior.
 * 
 * @coverage Tests AviationStack integration, status badges, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FlightOptionCard } from '../client/flight-option-card';
import { useAviationStack } from '@/hooks/useAviationstack';

// Mock the AviationStack hook
vi.mock('@/hooks/useAviationstack');
const mockUseAviationStack = vi.mocked(useAviationStack);

// Mock the selection actions
vi.mock('@/lib/actions/selection-actions', () => ({
  selectFlightOption: vi.fn(),
}));

// Mock the hold countdown hook
vi.mock('@/hooks/use-hold-countdown', () => ({
  useHoldCountdown: vi.fn(() => ({ minutes: 5, seconds: 30 })),
}));

describe('FlightOptionCard AviationStack Integration', () => {
  const mockOption = {
    id: 'option-1',
    name: 'Test Flight Option',
    description: 'Test description',
    is_recommended: false,
    is_available: true,
    total_cost: 500,
    currency: 'USD',
    option_components: [
      {
        id: 'comp-1',
        component_order: 1,
        navitas_text: 'UA 123 AMS-PHL',
        flight_number: '123',
        airline: 'UA',
        departure_time: '14:30',
        arrival_time: '16:45',
        aircraft_type: 'B737',
        seat_configuration: '3-3',
        meal_service: 'Snack',
        baggage_allowance: '1 bag',
        cost: 500,
        currency: 'USD',
      },
    ],
    selections: [],
    holds: [],
  };

  const defaultProps = {
    option: mockOption,
    legId: 'leg-1',
    selectionType: 'group' as const,
    passengerIds: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display flight status badge when AviationStack data is available', async () => {
    const mockFlightData = {
      flightStatus: 'active',
      departure: {
        iata: 'AMS',
        terminal: '2',
        gate: 'B12',
        scheduled: '2024-01-15T14:30:00+01:00',
        estimated: '2024-01-15T14:45:00+01:00',
        actual: null,
        delayMin: 15,
      },
      arrival: {
        iata: 'PHL',
        terminal: 'A',
        gate: 'A15',
        scheduled: '2024-01-15T16:45:00-05:00',
        estimated: '2024-01-15T17:00:00-05:00',
        actual: null,
        delayMin: 0,
      },
      airline: {
        name: 'United Airlines',
        iata: 'UA',
      },
      flight: {
        number: '123',
        iata: 'UA123',
        icao: 'UAL123',
      },
    };

    mockUseAviationStack.mockReturnValue({
      data: mockFlightData,
      loading: false,
      error: null,
    });

    render(<FlightOptionCard {...defaultProps} />);

    // Check that flight status badge is displayed
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    // Check that delay badge is displayed
    expect(screen.getByText('+15m delay')).toBeInTheDocument();

    // Check that flight times are displayed
    expect(screen.getByText('AMS')).toBeInTheDocument();
    expect(screen.getByText('PHL')).toBeInTheDocument();

    // Check that terminal and gate information is displayed
    expect(screen.getByText('Terminal 2')).toBeInTheDocument();
    expect(screen.getByText('Gate B12')).toBeInTheDocument();
    expect(screen.getByText('Terminal A')).toBeInTheDocument();
    expect(screen.getByText('Gate A15')).toBeInTheDocument();
  });

  it('should display different status badge variants correctly', async () => {
    const statusVariants = ['scheduled', 'active', 'landed', 'cancelled', 'delayed'];

    for (const status of statusVariants) {
      mockUseAviationStack.mockReturnValue({
        data: {
          flightStatus: status,
          departure: { iata: 'AMS', scheduled: '2024-01-15T14:30:00+01:00' },
          arrival: { iata: 'PHL', scheduled: '2024-01-15T16:45:00-05:00' },
          airline: { name: 'Test Airline', iata: 'TA' },
          flight: { number: '123', iata: 'TA123', icao: 'TAL123' },
        },
        loading: false,
        error: null,
      });

      const { unmount } = render(<FlightOptionCard {...defaultProps} />);

      await waitFor(() => {
        const badge = screen.getByText(status.charAt(0).toUpperCase() + status.slice(1));
        expect(badge).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('should show loading state when fetching AviationStack data', () => {
    mockUseAviationStack.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<FlightOptionCard {...defaultProps} />);

    expect(screen.getByText('Loading flight data...')).toBeInTheDocument();
  });

  it('should show error state when AviationStack data fails to load', () => {
    mockUseAviationStack.mockReturnValue({
      data: null,
      loading: false,
      error: 'API Error',
    });

    render(<FlightOptionCard {...defaultProps} />);

    expect(screen.getByText('Flight data unavailable')).toBeInTheDocument();
  });

  it('should fall back to Navitas text when no AviationStack data is available', () => {
    mockUseAviationStack.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });

    render(<FlightOptionCard {...defaultProps} />);

    expect(screen.getByText('UA 123 AMS-PHL')).toBeInTheDocument();
  });

  it('should call useAviationStack with correct query parameters', () => {
    mockUseAviationStack.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });

    render(<FlightOptionCard {...defaultProps} />);

    expect(mockUseAviationStack).toHaveBeenCalledWith({
      flight_iata: 'UA123',
      airline_iata: 'UA',
      flight_number: '123',
    });
  });

  it('should handle option components without flight data', () => {
    const optionWithoutFlightData = {
      ...mockOption,
      option_components: [
        {
          ...mockOption.option_components[0],
          flight_number: null,
          airline: null,
        },
      ],
    };

    mockUseAviationStack.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });

    render(<FlightOptionCard {...defaultProps} option={optionWithoutFlightData} />);

    expect(mockUseAviationStack).toHaveBeenCalledWith({});
  });

  it('should display flight times with proper formatting', async () => {
    const mockFlightData = {
      flightStatus: 'active',
      departure: {
        iata: 'AMS',
        scheduled: '2024-01-15T14:30:00+01:00',
        estimated: '2024-01-15T14:45:00+01:00',
        actual: null,
      },
      arrival: {
        iata: 'PHL',
        scheduled: '2024-01-15T16:45:00-05:00',
        estimated: '2024-01-15T17:00:00-05:00',
        actual: null,
      },
      airline: {
        name: 'United Airlines',
        iata: 'UA',
      },
      flight: {
        number: '123',
        iata: 'UA123',
        icao: 'UAL123',
      },
    };

    mockUseAviationStack.mockReturnValue({
      data: mockFlightData,
      loading: false,
      error: null,
    });

    render(<FlightOptionCard {...defaultProps} />);

    // Check that flight times are displayed (format may vary based on timezone)
    await waitFor(() => {
      expect(screen.getByText('AMS')).toBeInTheDocument();
      expect(screen.getByText('PHL')).toBeInTheDocument();
    });
  });
});
