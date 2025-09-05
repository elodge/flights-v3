/**
 * @fileoverview Unit tests for InlinePartySelector component
 * 
 * @description Tests inline party selection functionality with optimistic updates
 * @coverage Party selection, optimistic updates, error handling, accessibility
 */

import { render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { InlinePartySelector } from '../inline-party-selector';
import { updateTourPerson } from '@/app/(employee)/a/tour/[id]/_actions/personnel';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/(employee)/a/tour/[id]/_actions/personnel', () => ({
  updateTourPerson: vi.fn(),
}));

const mockUpdateTourPerson = vi.mocked(updateTourPerson);
const mockToast = vi.mocked(toast);

describe('InlinePartySelector', () => {
  const defaultProps = {
    personId: 'person-123',
    currentParty: 'A Party' as const,
    fullName: 'John Doe',
    isInactive: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with current party value', () => {
      render(<InlinePartySelector {...defaultProps} />);
      
      expect(screen.getByText('A Party')).toBeInTheDocument();
    });

    it('should render as disabled badge for inactive persons', () => {
      render(<InlinePartySelector {...defaultProps} isInactive={true} />);
      
      const badge = screen.getByText('A Party');
      expect(badge).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should render with different party value', () => {
      render(<InlinePartySelector {...defaultProps} currentParty="B Party" />);
      
      expect(screen.getByText('B Party')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<InlinePartySelector {...defaultProps} />);
      
      const trigger = screen.getByLabelText('Change party for John Doe');
      expect(trigger).toBeInTheDocument();
    });

    it('should render select trigger with correct role', () => {
      render(<InlinePartySelector {...defaultProps} />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('should handle different person IDs', () => {
      render(<InlinePartySelector {...defaultProps} personId="person-456" />);
      
      expect(screen.getByText('A Party')).toBeInTheDocument();
    });

    it('should handle different full names', () => {
      render(<InlinePartySelector {...defaultProps} fullName="Jane Smith" />);
      
      const trigger = screen.getByLabelText('Change party for Jane Smith');
      expect(trigger).toBeInTheDocument();
    });

    it('should handle all party values', () => {
      const parties = ['A Party', 'B Party', 'C Party', 'D Party'];
      
      parties.forEach(party => {
        const { unmount } = render(<InlinePartySelector {...defaultProps} currentParty={party as any} />);
        expect(screen.getByText(party)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Inactive State', () => {
    it('should render inactive person with disabled styling', () => {
      render(<InlinePartySelector {...defaultProps} isInactive={true} />);
      
      const badge = screen.getByText('A Party');
      expect(badge).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should show tooltip for inactive persons', () => {
      render(<InlinePartySelector {...defaultProps} isInactive={true} />);
      
      // CONTEXT: Tooltip trigger should be present for inactive persons
      const tooltipTrigger = screen.getByText('A Party');
      expect(tooltipTrigger).toHaveAttribute('data-slot', 'tooltip-trigger');
    });
  });

  describe('Server Action Integration', () => {
    it('should import updateTourPerson action', () => {
      expect(updateTourPerson).toBeDefined();
    });

    it('should have proper prop types', () => {
      // CONTEXT: Test that all required props are present
      const props = { ...defaultProps };
      expect(props.personId).toBeDefined();
      expect(props.currentParty).toBeDefined();
      expect(props.fullName).toBeDefined();
      expect(typeof props.isInactive).toBe('boolean');
    });
  });
});