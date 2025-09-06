/**
 * @fileoverview Integration tests for DeletePersonDialog component
 * 
 * @description Tests the delete person dialog UI interactions and server action integration
 * @coverage Dialog rendering, user interactions, error handling, and success flows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { DeletePersonDialog } from '@/components/employee/delete-person-dialog';
import { deleteTourPerson } from '@/app/(admin)/admin/users/_actions/delete-personnel';

// CONTEXT: Mock Next.js router
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}));

// CONTEXT: Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// CONTEXT: Mock server action
vi.mock('@/app/(admin)/admin/users/_actions/delete-personnel', () => ({
  deleteTourPerson: vi.fn()
}));

describe('DeletePersonDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render delete button with trash icon', () => {
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveClass('text-muted-foreground');
  });

  it('should open confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    await user.click(deleteButton);

    expect(screen.getByText('Remove Person')).toBeInTheDocument();
    expect(screen.getAllByText((content, element) => {
      return (element?.textContent?.includes('Are you sure you want to remove') && 
              element?.textContent?.includes('Taylor Swift') &&
              element?.textContent?.includes('from this tour')) ?? false;
    })[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should successfully delete person when confirmed', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteTourPerson).mockResolvedValue({ success: true });
    
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
      />
    );

    // CONTEXT: Open dialog and confirm deletion
    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    // CONTEXT: Verify server action was called and success feedback
    await waitFor(() => {
      expect(deleteTourPerson).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(toast.success).toHaveBeenCalledWith('Removed Taylor Swift from tour');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should show error toast when deletion fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Database constraint violation';
    vi.mocked(deleteTourPerson).mockRejectedValue(new Error(errorMessage));
    
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
      />
    );

    // CONTEXT: Open dialog and confirm deletion
    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    // CONTEXT: Verify error handling
    await waitFor(() => {
      expect(deleteTourPerson).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(toast.error).toHaveBeenCalledWith(`Failed to remove Taylor Swift: ${errorMessage}`);
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  it('should cancel deletion when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
      />
    );

    // CONTEXT: Open dialog and cancel
    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    await user.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    // CONTEXT: Verify dialog is closed and no action taken
    await waitFor(() => {
      expect(screen.queryByText('Remove Person')).not.toBeInTheDocument();
      expect(deleteTourPerson).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  it('should show loading state during deletion', async () => {
    const user = userEvent.setup();
    // CONTEXT: Mock slow server response
    vi.mocked(deleteTourPerson).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
      />
    );

    // CONTEXT: Open dialog and start deletion
    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    // CONTEXT: Verify delete button is disabled during loading
    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should disable delete button when disabled prop is true', () => {
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
        disabled={true}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    expect(deleteButton).toBeDisabled();
  });

  it('should handle unknown error types gracefully', async () => {
    const user = userEvent.setup();
    // CONTEXT: Mock non-Error object thrown
    vi.mocked(deleteTourPerson).mockRejectedValue('Unknown error');
    
    render(
      <DeletePersonDialog 
        personId="550e8400-e29b-41d4-a716-446655440000"
        personName="Taylor Swift"
      />
    );

    // CONTEXT: Open dialog and confirm deletion
    const deleteButton = screen.getByRole('button', { name: /delete person/i });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    // CONTEXT: Verify error handling for unknown error types
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to remove Taylor Swift: Failed to delete person');
    });
  });
});
