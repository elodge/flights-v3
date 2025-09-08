/**
 * @fileoverview Integration tests for ManualOptionForm component
 * 
 * @description Tests for the manual flight option form including segment editing,
 * AviationStack enrichment, and form submission.
 * 
 * @coverage Manual option form functionality, segment management, and enrichment
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManualOptionForm } from '@/components/flight/ManualOptionForm';

// Mock the server action
vi.mock('@/app/(employee)/a/tour/[projectId]/leg/[legId]/_actions/options', () => ({
  createManualFlightOption: vi.fn(),
}));

// Mock the AviationStack hook
vi.mock('@/hooks/useAviationstack', () => ({
  useAviationStack: vi.fn(),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the server action
vi.mock('@/lib/actions/manual-flight-options', () => ({
  createManualFlightOption: vi.fn(),
}));

import { createManualFlightOption } from '@/lib/actions/manual-flight-options';

const mockCreateManualFlightOption = vi.mocked(createManualFlightOption);

import { useAviationStack } from '@/hooks/useAviationstack';

const mockUseAviationStack = vi.mocked(useAviationStack);

import { toast } from 'sonner';

const mockToast = vi.mocked(toast);

describe('ManualOptionForm', () => {
  const defaultProps = {
    legId: 'leg-uuid',
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for AviationStack hook
    mockUseAviationStack.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
  });

  it('should render form with initial segment', () => {
    render(<ManualOptionForm {...defaultProps} />);

    expect(screen.getByLabelText('Option Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Airline IATA *')).toBeInTheDocument();
    expect(screen.getByLabelText('Flight Number *')).toBeInTheDocument();
    expect(screen.getByLabelText('Departure IATA *')).toBeInTheDocument();
    expect(screen.getByLabelText('Arrival IATA *')).toBeInTheDocument();
    expect(screen.getByText('Add Segment')).toBeInTheDocument();
  });

  it('should add new segment when Add Segment is clicked', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const addButton = screen.getByText('Add Segment');
    fireEvent.click(addButton);

    // Should now have 2 segments
    expect(screen.getAllByText(/Segment \d+/)).toHaveLength(2);
  });

  it('should remove segment when Remove button is clicked', () => {
    render(<ManualOptionForm {...defaultProps} />);

    // Add a second segment
    const addButton = screen.getByText('Add Segment');
    fireEvent.click(addButton);

    // Remove the first segment
    const removeButtons = screen.getAllByRole('button', { name: /trash/i });
    fireEvent.click(removeButtons[0]);

    // Should still have 1 segment (can't remove the last one)
    expect(screen.getAllByText(/Segment \d+/)).toHaveLength(1);
  });

  it('should not allow removing the last segment', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const removeButton = screen.getByRole('button', { name: /trash/i });
    expect(removeButton).toBeDisabled();
  });

  it('should update form fields when user types', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const nameInput = screen.getByLabelText('Option Name *');
    const airlineInput = screen.getByLabelText('Airline IATA *');

    fireEvent.change(nameInput, { target: { value: 'UA123 AMS-PHL' } });
    fireEvent.change(airlineInput, { target: { value: 'UA' } });

    expect(nameInput).toHaveValue('UA123 AMS-PHL');
    expect(airlineInput).toHaveValue('UA');
  });

  it('should convert airline IATA to uppercase', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const airlineInput = screen.getByLabelText('Airline IATA *');
    fireEvent.change(airlineInput, { target: { value: 'ua' } });

    expect(airlineInput).toHaveValue('UA');
  });

  it('should convert airport codes to uppercase', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const depInput = screen.getByLabelText('Departure IATA *');
    const arrInput = screen.getByLabelText('Arrival IATA *');

    fireEvent.change(depInput, { target: { value: 'ams' } });
    fireEvent.change(arrInput, { target: { value: 'phl' } });

    expect(depInput).toHaveValue('AMS');
    expect(arrInput).toHaveValue('PHL');
  });

  it('should show enrichment button when airline and flight number are filled', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const airlineInput = screen.getByLabelText('Airline IATA *');
    const flightInput = screen.getByLabelText('Flight Number *');

    fireEvent.change(airlineInput, { target: { value: 'UA' } });
    fireEvent.change(flightInput, { target: { value: '123' } });

    const enrichButton = screen.getByText('Enrich via AviationStack');
    expect(enrichButton).toBeInTheDocument();
    expect(enrichButton).not.toBeDisabled();
  });

  it('should disable enrichment button when required fields are missing', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const enrichButton = screen.getByText('Enrich via AviationStack');
    expect(enrichButton).toBeDisabled();
  });

  it('should call AviationStack API when enrich button is clicked', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          flightStatus: 'active',
          departure: {
            iata: 'AMS',
            terminal: '1',
            gate: 'B12',
            scheduled: '2024-01-15T14:30:00+01:00',
            estimated: '2024-01-15T14:45:00+01:00',
            delayMin: 15,
          },
          arrival: {
            iata: 'PHL',
            terminal: 'A',
            gate: 'A15',
            scheduled: '2024-01-15T16:45:00-05:00',
            estimated: '2024-01-15T17:00:00-05:00',
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
        },
      }),
    });

    render(<ManualOptionForm {...defaultProps} />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Airline IATA *'), { target: { value: 'UA' } });
    fireEvent.change(screen.getByLabelText('Flight Number *'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Departure IATA *'), { target: { value: 'AMS' } });
    fireEvent.change(screen.getByLabelText('Arrival IATA *'), { target: { value: 'PHL' } });

    // Click enrich button
    const enrichButton = screen.getByText('Enrich via AviationStack');
    fireEvent.click(enrichButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/flight?flight_iata=UA123&dep_iata=AMS&arr_iata=PHL')
      );
    });

    // Should show enriched data
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('+15m delay')).toBeInTheDocument();
      expect(screen.getByText('Terminal 1')).toBeInTheDocument();
      expect(screen.getByText('Gate B12')).toBeInTheDocument();
    });
  });

  it('should handle enrichment API errors gracefully', async () => {
    // Mock API error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Flight not found',
      }),
    });

    render(<ManualOptionForm {...defaultProps} />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Airline IATA *'), { target: { value: 'UA' } });
    fireEvent.change(screen.getByLabelText('Flight Number *'), { target: { value: '123' } });

    // Click enrich button
    const enrichButton = screen.getByText('Enrich via AviationStack');
    fireEvent.click(enrichButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Flight not found');
    });
  });

  it('should submit form successfully with valid data', async () => {
    mockCreateManualFlightOption.mockResolvedValue({ id: 'option-uuid' });

    render(<ManualOptionForm {...defaultProps} />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Option Name *'), { target: { value: 'UA123 AMS-PHL' } });
    fireEvent.change(screen.getByLabelText('Airline IATA *'), { target: { value: 'UA' } });
    fireEvent.change(screen.getByLabelText('Flight Number *'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Departure IATA *'), { target: { value: 'AMS' } });
    fireEvent.change(screen.getByLabelText('Arrival IATA *'), { target: { value: 'PHL' } });
    fireEvent.change(screen.getByLabelText('Departure Time (Local) *'), { 
      target: { value: '2024-01-15T14:30' } 
    });
    fireEvent.change(screen.getByLabelText('Arrival Time (Local) *'), { 
      target: { value: '2024-01-15T16:45' } 
    });

    // Submit form
    const submitButton = screen.getByText('Create Manual Option');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateManualFlightOption).toHaveBeenCalledWith({
        leg_id: 'leg-uuid',
        name: 'UA123 AMS-PHL',
        description: null,
        class_of_service: null,
        seats_available: null,
        price_total: null,
        price_currency: 'USD',
        hold_expires_at: null,
        notes: null,
        recommended: false,
        segments: [
          {
            airline_iata: 'UA',
            airline_name: null,
            flight_number: '123',
            dep_iata: 'AMS',
            arr_iata: 'PHL',
            dep_time_local: '2024-01-15T14:30',
            arr_time_local: '2024-01-15T16:45',
            day_offset: 1,
            duration_minutes: null,
            enriched_terminal_gate: null,
            stops: 0,
          },
        ],
        is_split: false,
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Flight option created successfully');
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('should show validation errors for missing required fields', async () => {
    render(<ManualOptionForm {...defaultProps} />);

    const submitButton = screen.getByText('Create Manual Option');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Option name is required');
    });

    expect(mockCreateManualFlightOption).not.toHaveBeenCalled();
  });

  it('should show validation errors for incomplete segments', async () => {
    render(<ManualOptionForm {...defaultProps} />);

    // Fill only option name
    fireEvent.change(screen.getByLabelText('Option Name *'), { target: { value: 'UA123 AMS-PHL' } });

    const submitButton = screen.getByText('Create Manual Option');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('All segments must have required fields filled');
    });

    expect(mockCreateManualFlightOption).not.toHaveBeenCalled();
  });

  it('should handle server action errors', async () => {
    mockCreateManualFlightOption.mockRejectedValue(new Error('Database error'));

    render(<ManualOptionForm {...defaultProps} />);

    // Fill form with valid data
    fireEvent.change(screen.getByLabelText('Option Name *'), { target: { value: 'UA123 AMS-PHL' } });
    fireEvent.change(screen.getByLabelText('Airline IATA *'), { target: { value: 'UA' } });
    fireEvent.change(screen.getByLabelText('Flight Number *'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Departure IATA *'), { target: { value: 'AMS' } });
    fireEvent.change(screen.getByLabelText('Arrival IATA *'), { target: { value: 'PHL' } });
    fireEvent.change(screen.getByLabelText('Departure Time (Local) *'), { 
      target: { value: '2024-01-15T14:30' } 
    });
    fireEvent.change(screen.getByLabelText('Arrival Time (Local) *'), { 
      target: { value: '2024-01-15T16:45' } 
    });

    const submitButton = screen.getByText('Create Manual Option');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Database error');
    });

    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('should toggle switches correctly', () => {
    render(<ManualOptionForm {...defaultProps} />);

    const recommendedSwitch = screen.getByLabelText('Recommended');
    const splitSwitch = screen.getByLabelText('This is a split option');

    expect(recommendedSwitch).not.toBeChecked();
    expect(splitSwitch).not.toBeChecked();

    fireEvent.click(recommendedSwitch);
    fireEvent.click(splitSwitch);

    expect(recommendedSwitch).toBeChecked();
    expect(splitSwitch).toBeChecked();
  });

  it('should move segments up and down', () => {
    render(<ManualOptionForm {...defaultProps} />);

    // Add a second segment
    const addButton = screen.getByText('Add Segment');
    fireEvent.click(addButton);

    // Should have 2 segments
    expect(screen.getAllByText(/Segment \d+/)).toHaveLength(2);

    // Move first segment down
    const moveDownButtons = screen.getAllByRole('button', { name: /arrow down/i });
    fireEvent.click(moveDownButtons[0]);

    // Move second segment up
    const moveUpButtons = screen.getAllByRole('button', { name: /arrow up/i });
    fireEvent.click(moveUpButtons[1]);
  });
});
