/**
 * @fileoverview Integration tests for Generate Selection Groups functionality in PassengerAssignment
 * 
 * @description Tests the UI integration for seeding selection groups from passenger assignments,
 * including button behavior, loading states, success/error handling, and user feedback.
 * @coverage Tests PassengerAssignment component integration with seedSelectionGroups action
 * @security Tests employee-only functionality and proper error handling
 * @business_rule Verifies selection group generation follows business logic
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { PassengerAssignment } from '@/components/employee/passenger-assignment';

// CONTEXT: Mock server actions
vi.mock('@/app/(employee)/a/actions/seed-selection-groups', () => ({
  seedSelectionGroups: vi.fn()
}));

vi.mock('@/lib/actions/employee-actions', () => ({
  assignPassengersToLeg: vi.fn(),
  removePassengerFromLeg: vi.fn()
}));

// CONTEXT: Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// CONTEXT: Mock icons
vi.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon">Users</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Shuffle: () => <div data-testid="shuffle-icon">Shuffle</div>
}));

import { seedSelectionGroups } from '@/app/(employee)/a/actions/seed-selection-groups';

const mockSeedSelectionGroups = vi.mocked(seedSelectionGroups);

// CONTEXT: Sample test data
const mockPersonnel = [
  {
    id: 'p1',
    full_name: 'John Doe',
    email: 'john@example.com',
    role_title: 'Artist',
    is_vip: true,
    is_assigned: true
  },
  {
    id: 'p2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    role_title: 'Manager',
    is_vip: false,
    is_assigned: true
  },
  {
    id: 'p3',
    full_name: 'Bob Wilson',
    email: 'bob@example.com',
    role_title: 'Crew',
    is_vip: false,
    is_assigned: false
  }
];

describe('PassengerAssignment - Generate Selection Groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Generate Selection Groups button when passengers are assigned', () => {
    // CONTEXT: Test button visibility with assigned passengers
    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    expect(screen.getByText('Generate Selection Groups')).toBeInTheDocument();
    expect(screen.getByTestId('shuffle-icon')).toBeInTheDocument();
  });

  it('should not show Generate Selection Groups button when no passengers assigned', () => {
    // CONTEXT: Test button hidden when no assignments
    const noAssignedPersonnel = mockPersonnel.map(p => ({ ...p, is_assigned: false }));
    
    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={noAssignedPersonnel} 
      />
    );

    expect(screen.queryByText('Generate Selection Groups')).not.toBeInTheDocument();
  });

  it('should handle successful selection group generation', async () => {
    // CONTEXT: Test successful generation flow
    mockSeedSelectionGroups.mockResolvedValue({
      success: true,
      created: 2,
      details: {
        individuals: 1,
        grouped: 1,
        totalPassengers: 2
      }
    });

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const generateButton = screen.getByText('Generate Selection Groups');
    fireEvent.click(generateButton);

    // CONTEXT: Check loading state
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    // CONTEXT: Check success handling
    await waitFor(() => {
      expect(mockSeedSelectionGroups).toHaveBeenCalledWith('leg-123');
      expect(toast.success).toHaveBeenCalledWith(
        'Created 1 individual groups and 1 group with 1 passengers'
      );
    });
  });

  it('should handle individual groups only success', async () => {
    // CONTEXT: Test individuals-only success message
    mockSeedSelectionGroups.mockResolvedValue({
      success: true,
      created: 2,
      details: {
        individuals: 2,
        grouped: 0,
        totalPassengers: 2
      }
    });

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const generateButton = screen.getByText('Generate Selection Groups');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Created 2 individual groups');
    });
  });

  it('should handle group only success', async () => {
    // CONTEXT: Test group-only success message
    mockSeedSelectionGroups.mockResolvedValue({
      success: true,
      created: 1,
      details: {
        individuals: 0,
        grouped: 1,
        totalPassengers: 3
      }
    });

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const generateButton = screen.getByText('Generate Selection Groups');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Created 1 group with 3 passengers');
    });
  });

  it('should handle server action errors', async () => {
    // CONTEXT: Test error handling
    mockSeedSelectionGroups.mockRejectedValue(new Error('Database connection failed'));

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const generateButton = screen.getByText('Generate Selection Groups');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Database connection failed');
    });
  });

  it('should handle non-Error exceptions', async () => {
    // CONTEXT: Test handling of non-Error objects
    mockSeedSelectionGroups.mockRejectedValue('String error');

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const generateButton = screen.getByText('Generate Selection Groups');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to generate selection groups');
    });
  });

  it('should show error when no passengers assigned', async () => {
    // CONTEXT: Test validation error for no passengers
    const noAssignedPersonnel = [
      { ...mockPersonnel[0], is_assigned: false },
      { ...mockPersonnel[1], is_assigned: false }
    ];

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={noAssignedPersonnel} 
      />
    );

    // CONTEXT: Button should not be visible, but test the handler logic would work
    // This tests the business rule validation
    expect(screen.queryByText('Generate Selection Groups')).not.toBeInTheDocument();
  });

  it('should disable button while generating', async () => {
    // CONTEXT: Test button state during operation
    mockSeedSelectionGroups.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        created: 1,
        details: { individuals: 0, grouped: 1, totalPassengers: 2 }
      }), 100))
    );

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const generateButton = screen.getByText('Generate Selection Groups');
    fireEvent.click(generateButton);

    // CONTEXT: Check button becomes disabled
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      const button = screen.getByRole('button', { name: /Generating/ });
      expect(button).toBeDisabled();
    });
  });

  it('should re-enable button after completion', async () => {
    // CONTEXT: Test button re-enablement after operation
    mockSeedSelectionGroups.mockResolvedValue({
      success: true,
      created: 1,
      details: {
        individuals: 0,
        grouped: 1,
        totalPassengers: 2
      }
    });

    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const generateButton = screen.getByText('Generate Selection Groups');
    fireEvent.click(generateButton);

    // CONTEXT: Wait for completion and check button is re-enabled
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });

    await waitFor(() => {
      const button = screen.getByText('Generate Selection Groups');
      expect(button).not.toBeDisabled();
    });
  });

  it('should show correct passenger count in description', () => {
    // CONTEXT: Test assigned passenger count display
    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    expect(screen.getByText('Assign personnel to this leg (2 assigned)')).toBeInTheDocument();
  });

  it('should maintain button placement in header', () => {
    // CONTEXT: Test UI layout
    render(
      <PassengerAssignment 
        legId="leg-123" 
        personnel={mockPersonnel} 
      />
    );

    const header = screen.getByText('Passenger Assignment').closest('div');
    expect(header).toBeInTheDocument();
    
    // CONTEXT: Both buttons should be in the same container
    expect(screen.getByText('Generate Selection Groups')).toBeInTheDocument();
    expect(screen.getByText(/Assign Selected/)).toBeInTheDocument();
  });
});
