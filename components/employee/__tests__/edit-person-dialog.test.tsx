/**
 * @fileoverview Integration tests for Edit Person dialog component
 * 
 * @description Tests the Edit Person dialog functionality including form pre-filling,
 * validation, server action calls, and user interactions
 * @coverage Form pre-filling, validation, server action integration, dialog behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPersonDialog } from '../edit-person-dialog';

// Mock the server action
vi.mock('@/app/(employee)/a/tour/[id]/_actions/personnel', () => ({
  updateTourPerson: vi.fn()
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockUpdateTourPerson = vi.mocked(
  await import('@/app/(employee)/a/tour/[id]/_actions/personnel')
).updateTourPerson;

describe('EditPersonDialog', () => {
  const mockPerson = {
    id: 'person-123',
    full_name: 'John Doe',
    party: 'A Party',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    seat_pref: 'Window',
    ff_numbers: 'AA123456',
    notes: 'Vegetarian meals',
    status: 'active'
  };

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render edit button trigger', () => {
    render(<EditPersonDialog person={mockPerson} />);
    
    const editButton = screen.getByRole('button');
    expect(editButton).toBeInTheDocument();
    expect(editButton.querySelector('svg')).toBeInTheDocument(); // Edit icon
  });

  it('should open dialog when edit button is clicked', async () => {
    render(<EditPersonDialog person={mockPerson} />);
    
    const editButton = screen.getByRole('button');
    await user.click(editButton);
    
    expect(screen.getByText('Edit Person')).toBeInTheDocument();
    expect(screen.getByText(`Update the information for ${mockPerson.full_name}.`)).toBeInTheDocument();
  });

  it('should pre-fill form with existing person data', async () => {
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Check that form fields are pre-filled
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1 (555) 123-4567')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Window')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AA123456')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vegetarian meals')).toBeInTheDocument();
  });

  it('should show correct party and status selections', async () => {
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Check party selection
    const partySelect = screen.getByDisplayValue('A Party');
    expect(partySelect).toBeInTheDocument();
    
    // Check status selection
    const statusSelect = screen.getByDisplayValue('Active');
    expect(statusSelect).toBeInTheDocument();
  });

  it('should handle empty optional fields', async () => {
    const personWithEmptyFields = {
      ...mockPerson,
      email: '',
      phone: '',
      seat_pref: '',
      ff_numbers: '',
      notes: ''
    };

    render(<EditPersonDialog person={personWithEmptyFields} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Check that empty fields are handled correctly
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('email@example.com')).toHaveValue('');
    expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toHaveValue('');
  });

  it('should successfully update person with valid changes', async () => {
    mockUpdateTourPerson.mockResolvedValue({ success: true });
    
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Change the name
    const nameInput = screen.getByDisplayValue('John Doe');
    await user.clear(nameInput);
    await user.type(nameInput, 'John Updated');
    
    // Change party
    const partySelect = screen.getByDisplayValue('A Party');
    await user.click(partySelect);
    await user.click(screen.getByText('B Party'));
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    await waitFor(() => {
      expect(mockUpdateTourPerson).toHaveBeenCalledWith(mockPerson.id, {
        full_name: 'John Updated',
        party: 'B Party',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        seat_pref: 'Window',
        ff_numbers: 'AA123456',
        notes: 'Vegetarian meals',
        status: 'active'
      });
    });
  });

  it('should handle partial updates', async () => {
    mockUpdateTourPerson.mockResolvedValue({ success: true });
    
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Only change the status
    const statusSelect = screen.getByDisplayValue('Active');
    await user.click(statusSelect);
    await user.click(screen.getByText('Inactive'));
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    await waitFor(() => {
      expect(mockUpdateTourPerson).toHaveBeenCalledWith(mockPerson.id, {
        full_name: 'John Doe',
        party: 'A Party',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        seat_pref: 'Window',
        ff_numbers: 'AA123456',
        notes: 'Vegetarian meals',
        status: 'inactive'
      });
    });
  });

  it('should show validation errors for invalid data', async () => {
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Make name too short
    const nameInput = screen.getByDisplayValue('John Doe');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jo');
    
    // Try to submit
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Full name must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('should handle server action errors', async () => {
    mockUpdateTourPerson.mockResolvedValue({ 
      success: false, 
      error: 'Update failed' 
    });
    
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    await waitFor(() => {
      expect(mockUpdateTourPerson).toHaveBeenCalled();
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Click cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    // Dialog should be closed
    expect(screen.queryByText('Edit Person')).not.toBeInTheDocument();
  });

  it('should disable submit button while submitting', async () => {
    // Mock a slow server action
    mockUpdateTourPerson.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ success: true }), 100)
    ));
    
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);
    
    // Button should be disabled and show loading state
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Saving...');
  });

  it('should show travel profile fields with existing data', async () => {
    render(<EditPersonDialog person={mockPerson} />);
    
    // Open dialog
    await user.click(screen.getByRole('button'));
    
    // Should show travel profile fields with existing data
    expect(screen.getByDisplayValue('Window')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AA123456')).toBeInTheDocument();
  });
});
