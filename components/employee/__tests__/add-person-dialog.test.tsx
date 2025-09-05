/**
 * @fileoverview Integration tests for Add Person dialog component
 * 
 * @description Tests the Add Person dialog functionality including form validation,
 * server action calls, and user interactions
 * @coverage Form validation, server action integration, dialog behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPersonDialog } from '../add-person-dialog';

// Mock the server action
vi.mock('@/app/(employee)/a/tour/[id]/_actions/personnel', () => ({
  addTourPerson: vi.fn()
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

const mockAddTourPerson = vi.mocked(
  await import('@/app/(employee)/a/tour/[id]/_actions/personnel')
).addTourPerson;

describe('AddPersonDialog', () => {
  const mockProjectId = 'test-project-id';
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog trigger button', () => {
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    const triggerButton = screen.getByRole('button', { name: /add person/i });
    await user.click(triggerButton);
    
    expect(screen.getByText('Add Person to Tour')).toBeInTheDocument();
    expect(screen.getByText('Add a new person to this tour. All fields except name and party are optional.')).toBeInTheDocument();
  });

  it('should show required field validation for empty form', async () => {
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Full name must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('should show validation for name that is too short', async () => {
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Fill in short name
    await user.type(screen.getByPlaceholderText('Enter full name'), 'Jo');
    
    // Try to submit
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Full name must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('should show validation for invalid email format', async () => {
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Fill in valid name
    await user.type(screen.getByPlaceholderText('Enter full name'), 'John Doe');
    
    // Fill in invalid email
    await user.type(screen.getByPlaceholderText('email@example.com'), 'invalid-email');
    
    // Try to submit
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Wait for validation to appear
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should successfully submit form with valid data', async () => {
    mockAddTourPerson.mockResolvedValue({ id: 'new-person-id' });
    
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Fill in form
    await user.type(screen.getByPlaceholderText('Enter full name'), 'John Doe');
    
    // Keep default party (A Party) to avoid Select component issues
    await user.type(screen.getByPlaceholderText('email@example.com'), 'john@example.com');
    await user.type(screen.getByPlaceholderText('+1 (555) 123-4567'), '+1 (555) 123-4567');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    await waitFor(() => {
      expect(mockAddTourPerson).toHaveBeenCalledWith(mockProjectId, {
        full_name: 'John Doe',
        party: 'A Party', // Default value
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        seat_pref: '',
        ff_numbers: '',
        notes: ''
      });
    });
  });

  it('should handle server action errors', async () => {
    mockAddTourPerson.mockResolvedValue({ 
      success: false, 
      error: 'Database connection failed' 
    });
    
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Fill in valid form
    await user.type(screen.getByPlaceholderText('Enter full name'), 'John Doe');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    await waitFor(() => {
      expect(mockAddTourPerson).toHaveBeenCalled();
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Click cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    // Dialog should be closed
    expect(screen.queryByText('Add Person to Tour')).not.toBeInTheDocument();
  });

  it('should show travel profile fields', async () => {
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Should show travel profile fields
    expect(screen.getByPlaceholderText('e.g., Window, Aisle, Exit Row')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., AA123456, UA789012')).toBeInTheDocument();
  });

  it('should disable submit button while submitting', async () => {
    // Mock a slow server action
    mockAddTourPerson.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ id: 'new-person-id' }), 100)
    ));
    
    render(<AddPersonDialog projectId={mockProjectId} />);
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /add person/i }));
    
    // Fill in valid form
    await user.type(screen.getByPlaceholderText('Enter full name'), 'John Doe');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /add person/i });
    await user.click(submitButton);
    
    // Button should be disabled and show loading state
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Adding...');
  });
});
