/**
 * @fileoverview Integration tests for inline party selector in tour page
 * 
 * @description Tests party selector integration within the personnel table
 * @coverage Table rendering, party updates, optimistic UI, error handling
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import TourPage from '../page';
import { updateTourPerson } from '../_actions/personnel';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn().mockResolvedValue({
    user: { id: 'user-123' },
    profile: { role: 'agent' },
  }),
}));

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null, // Will be dynamically set
              error: null,
            }),
          }),
          single: vi.fn().mockResolvedValue({
            data: null, // Will be dynamically set
            error: null,
          }),
        }),
        single: vi.fn().mockResolvedValue({
          data: null, // Will be dynamically set
          error: null,
        }),
      }),
    }),
  }),
}));

vi.mock('../_actions/personnel', () => ({
  updateTourPerson: vi.fn(),
}));

const mockUpdateTourPerson = vi.mocked(updateTourPerson);
const mockToast = vi.mocked(toast);

// CONTEXT: Mock tour data with personnel
const mockTourData = {
  id: 'tour-123',
  name: 'Test Tour',
  type: 'tour',
  is_active: true,
  artists: {
    id: 'artist-123',
    name: 'Test Artist',
    description: 'Test Description',
    contact_email: 'artist@test.com',
  },
  legs: [],
  tour_personnel: [
    {
      id: 'person-1',
      full_name: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      role_title: 'Manager',
      is_vip: false,
      passport_number: null,
      nationality: null,
      party: 'A Party',
      seat_pref: 'Window',
      ff_numbers: 'AA123456',
      notes: 'Vegetarian',
      status: 'active',
    },
    {
      id: 'person-2',
      full_name: 'Jane Smith',
      email: 'jane@test.com',
      phone: '+0987654321',
      role_title: 'Assistant',
      is_vip: true,
      passport_number: null,
      nationality: null,
      party: 'B Party',
      seat_pref: 'Aisle',
      ff_numbers: 'UA789012',
      notes: 'Allergic to nuts',
      status: 'inactive',
    },
  ],
};

describe('Tour Page - Inline Party Selector Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // CONTEXT: Set up the mock to return the tour data
    const { createServerClient } = await import('@/lib/supabase-server');
    const mockClient = vi.mocked(createServerClient)();
    
    // Mock the tour query to return our test data
    mockClient.from().select().eq().eq().single.mockResolvedValue({
      data: mockTourData,
      error: null,
    });
  });

  describe('Personnel Table Rendering', () => {
    it('should render personnel table with party selectors', async () => {
      const user = userEvent.setup();
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click on Personnel tab to show personnel data
      const personnelTab = screen.getByRole('tab', { name: /personnel/i });
      await user.click(personnelTab);
      
      // CONTEXT: Should show both personnel rows
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      
      // CONTEXT: Should show current party values
      expect(screen.getByText('A Party')).toBeInTheDocument();
      expect(screen.getByText('B Party')).toBeInTheDocument();
    });

    it('should render inactive person with disabled party selector', async () => {
      const user = userEvent.setup();
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click on Personnel tab to show personnel data
      const personnelTab = screen.getByRole('tab', { name: /personnel/i });
      await user.click(personnelTab);
      
      // CONTEXT: Jane Smith is inactive, should have disabled selector
      const janeRow = screen.getByText('Jane Smith').closest('tr');
      expect(janeRow).toHaveClass('opacity-60');
      
      // CONTEXT: Should show tooltip for inactive person
      const inactiveBadge = screen.getByText('B Party');
      expect(inactiveBadge).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Party Updates', () => {
    it('should update party with optimistic UI', async () => {
      const user = userEvent.setup();
      mockUpdateTourPerson.mockResolvedValue({ success: true });
      
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click on Personnel tab to show personnel data
      const personnelTab = screen.getByRole('tab', { name: /personnel/i });
      await user.click(personnelTab);
      
      // CONTEXT: Find John Doe's party selector
      const johnRow = screen.getByText('John Doe').closest('tr');
      const partySelector = johnRow?.querySelector('[role="combobox"]');
      
      expect(partySelector).toBeInTheDocument();
      
      // CONTEXT: Click to open selector
      await user.click(partySelector!);
      
      // CONTEXT: Select new party
      const cPartyOption = screen.getByText('C Party');
      await user.click(cPartyOption);
      
      // CONTEXT: Should update optimistically
      expect(screen.getByText('C Party')).toBeInTheDocument();
      
      // CONTEXT: Should call server action
      await waitFor(() => {
        expect(mockUpdateTourPerson).toHaveBeenCalledWith('person-1', {
          party: 'C Party',
        });
      });
    });

    it('should show success toast on successful update', async () => {
      const user = userEvent.setup();
      mockUpdateTourPerson.mockResolvedValue({ success: true });
      
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click on Personnel tab to show personnel data
      const personnelTab = screen.getByRole('tab', { name: /personnel/i });
      await user.click(personnelTab);
      
      const johnRow = screen.getByText('John Doe').closest('tr');
      const partySelector = johnRow?.querySelector('[role="combobox"]');
      
      await user.click(partySelector!);
      const dPartyOption = screen.getByText('D Party');
      await user.click(dPartyOption);
      
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Party updated');
      });
    });

    it('should revert optimistic update on server error', async () => {
      const user = userEvent.setup();
      mockUpdateTourPerson.mockResolvedValue({ 
        success: false, 
        error: 'Database error' 
      });
      
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click Personnel tab to see personnel data
      await user.click(screen.getByRole('tab', { name: /personnel/i }));
      
      const johnRow = screen.getByText('John Doe').closest('tr');
      const partySelector = johnRow?.querySelector('[role="combobox"]');
      
      await user.click(partySelector!);
      const bPartyOption = screen.getByText('B Party');
      await user.click(bPartyOption);
      
      // CONTEXT: Should show optimistic update first
      expect(screen.getByText('B Party')).toBeInTheDocument();
      
      // CONTEXT: Should revert to original value after error
      await waitFor(() => {
        expect(screen.getByText('A Party')).toBeInTheDocument();
      });
    });

    it('should show error toast on server failure', async () => {
      const user = userEvent.setup();
      mockUpdateTourPerson.mockResolvedValue({ 
        success: false, 
        error: 'Validation failed' 
      });
      
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click Personnel tab to see personnel data
      await user.click(screen.getByRole('tab', { name: /personnel/i }));
      
      const johnRow = screen.getByText('John Doe').closest('tr');
      const partySelector = johnRow?.querySelector('[role="combobox"]');
      
      await user.click(partySelector!);
      const cPartyOption = screen.getByText('C Party');
      await user.click(cPartyOption);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Validation failed');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels for party selectors', async () => {
      const user = userEvent.setup();
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click Personnel tab to see personnel data
      await user.click(screen.getByRole('tab', { name: /personnel/i }));
      
      // CONTEXT: Should have aria-label for John Doe's selector
      expect(screen.getByLabelText('Change party for John Doe')).toBeInTheDocument();
      
      // CONTEXT: Should have aria-label for Jane Smith's selector
      expect(screen.getByLabelText('Change party for Jane Smith')).toBeInTheDocument();
    });

    it('should show tooltips on hover', async () => {
      const user = userEvent.setup();
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click Personnel tab to see personnel data
      await user.click(screen.getByRole('tab', { name: /personnel/i }));
      
      const johnRow = screen.getByText('John Doe').closest('tr');
      const partySelector = johnRow?.querySelector('[role="combobox"]');
      
      await user.hover(partySelector!);
      
      await waitFor(() => {
        expect(screen.getByText('Change party for John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during update', async () => {
      const user = userEvent.setup();
      mockUpdateTourPerson.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click Personnel tab to see personnel data
      await user.click(screen.getByRole('tab', { name: /personnel/i }));
      
      const johnRow = screen.getByText('John Doe').closest('tr');
      const partySelector = johnRow?.querySelector('[role="combobox"]');
      
      await user.click(partySelector!);
      const bPartyOption = screen.getByText('B Party');
      await user.click(bPartyOption);
      
      // CONTEXT: Should show loading spinner
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should disable selector during update', async () => {
      const user = userEvent.setup();
      mockUpdateTourPerson.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      render(await TourPage({ params: { id: 'tour-123' } }));
      
      // CONTEXT: Click Personnel tab to see personnel data
      await user.click(screen.getByRole('tab', { name: /personnel/i }));
      
      const johnRow = screen.getByText('John Doe').closest('tr');
      const partySelector = johnRow?.querySelector('[role="combobox"]');
      
      await user.click(partySelector!);
      const cPartyOption = screen.getByText('C Party');
      await user.click(cPartyOption);
      
      // CONTEXT: Selector should be disabled during update
      expect(partySelector).toBeDisabled();
    });
  });
});
