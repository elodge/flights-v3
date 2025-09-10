/**
 * @fileoverview Budget Management Component Tests
 * 
 * @description Comprehensive tests for the BudgetManagement component including
 * budget display, editing, and interaction with budget actions.
 * 
 * @coverage Budget management UI, user interactions, form validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetManagement } from '../budget-management'
import { setBudget } from '@/lib/actions/budget-actions'

// Mock the budget actions
vi.mock('@/lib/actions/budget-actions', () => ({
  setBudget: vi.fn(),
  getBudgetSnapshot: vi.fn()
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

const mockSetBudget = vi.mocked(setBudget)

describe('BudgetManagement Component', () => {
  const mockProps = {
    projectId: 'project-123',
    budgets: [
      {
        id: 'budget-1',
        level: 'tour' as const,
        amount_cents: 1000000,
        notes: 'Tour budget',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user-123'
      },
      {
        id: 'budget-2',
        level: 'party' as const,
        party: 'Artist',
        amount_cents: 500000,
        notes: 'Artist party budget',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user-123'
      }
    ],
    snapshot: {
      totals: {
        tour: 1000000,
        byParty: { 'Artist': 500000 },
        byPerson: {}
      },
      spend: {
        confirmed: 300000,
        pending: 100000
      },
      remaining: {
        total: 600000,
        byParty: { 'Artist': 200000 },
        byPerson: {}
      }
    },
    tourPersonnel: [
      {
        id: 'person-1',
        full_name: 'John Doe',
        party: 'Artist'
      },
      {
        id: 'person-2',
        full_name: 'Jane Smith',
        party: 'Management'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Budget Overview Display', () => {
    it('should display budget overview with totals and spend', () => {
      render(<BudgetManagement {...mockProps} />)

      // CONTEXT: Check budget overview display
      expect(screen.getByText('Budget Overview')).toBeInTheDocument()
      expect(screen.getByText('$1,000.00')).toBeInTheDocument() // Total Budget
      expect(screen.getByText('$400.00')).toBeInTheDocument() // Total Spent
      expect(screen.getByText('$600.00')).toBeInTheDocument() // Remaining
    })

    it('should handle missing snapshot data gracefully', () => {
      const propsWithoutSnapshot = {
        ...mockProps,
        snapshot: null
      }

      render(<BudgetManagement {...propsWithoutSnapshot} />)

      expect(screen.getByText('Budget Overview')).toBeInTheDocument()
      // Should not crash when snapshot is null
    })
  })

  describe('Tour Level Budget Management', () => {
    it('should display existing tour budget', () => {
      render(<BudgetManagement {...mockProps} />)

      // Navigate to tour tab
      fireEvent.click(screen.getByText('Tour Level'))

      expect(screen.getByText('$1,000.00')).toBeInTheDocument()
      expect(screen.getByText('Tour budget')).toBeInTheDocument()
      expect(screen.getByText('Edit Budget')).toBeInTheDocument()
    })

    it('should allow editing tour budget', async () => {
      const user = userEvent.setup()
      mockSetBudget.mockResolvedValue({ success: true })

      render(<BudgetManagement {...mockProps} />)

      // Navigate to tour tab
      fireEvent.click(screen.getByText('Tour Level'))

      // Click edit button
      await user.click(screen.getByText('Edit Budget'))

      // Check form is displayed
      expect(screen.getByLabelText('Budget Amount (USD)')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes (Optional)')).toBeInTheDocument()

      // Fill form
      await user.clear(screen.getByLabelText('Budget Amount (USD)'))
      await user.type(screen.getByLabelText('Budget Amount (USD)'), '1500.00')
      await user.type(screen.getByLabelText('Notes (Optional)'), 'Updated tour budget')

      // Submit form
      await user.click(screen.getByText('Save Budget'))

      // BUSINESS_RULE: Verify setBudget called with correct parameters
      expect(mockSetBudget).toHaveBeenCalledWith({
        level: 'tour',
        amount_cents: 150000,
        notes: 'Updated tour budget'
      })
    })

    it('should handle tour budget creation when no budget exists', async () => {
      const user = userEvent.setup()
      const propsWithoutTourBudget = {
        ...mockProps,
        budgets: mockProps.budgets.filter(b => b.level !== 'tour')
      }
      mockSetBudget.mockResolvedValue({ success: true })

      render(<BudgetManagement {...propsWithoutTourBudget} />)

      // Navigate to tour tab
      fireEvent.click(screen.getByText('Tour Level'))

      // Should show "Set Budget" button
      expect(screen.getByText('Set Budget')).toBeInTheDocument()

      // Click set budget button
      await user.click(screen.getByText('Set Budget'))

      // Fill and submit form
      await user.type(screen.getByLabelText('Budget Amount (USD)'), '2000.00')
      await user.click(screen.getByText('Save Budget'))

      expect(mockSetBudget).toHaveBeenCalledWith({
        level: 'tour',
        amount_cents: 200000,
        notes: undefined
      })
    })

    it('should handle budget save errors', async () => {
      const user = userEvent.setup()
      mockSetBudget.mockResolvedValue({ 
        success: false, 
        error: 'Database error' 
      })

      render(<BudgetManagement {...mockProps} />)

      // Navigate to tour tab and edit
      fireEvent.click(screen.getByText('Tour Level'))
      await user.click(screen.getByText('Edit Budget'))
      await user.type(screen.getByLabelText('Budget Amount (USD)'), '1500.00')
      await user.click(screen.getByText('Save Budget'))

      // Should not reload page on error
      expect(window.location.reload).not.toHaveBeenCalled()
    })
  })

  describe('Party Level Budget Management', () => {
    it('should display party budgets grouped by party', () => {
      render(<BudgetManagement {...mockProps} />)

      // Navigate to party tab
      fireEvent.click(screen.getByText('Party Level'))

      expect(screen.getByText('Artist')).toBeInTheDocument()
      expect(screen.getByText('$500.00')).toBeInTheDocument()
      expect(screen.getByText('1 person')).toBeInTheDocument()
    })

    it('should allow expanding party to see individual personnel', async () => {
      const user = userEvent.setup()
      render(<BudgetManagement {...mockProps} />)

      // Navigate to party tab
      fireEvent.click(screen.getByText('Party Level'))

      // Click expand button for Artist party
      const expandButton = screen.getByRole('button', { name: '' }) // Chevron button
      await user.click(expandButton)

      // Should show individual personnel
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should allow editing party budgets', async () => {
      const user = userEvent.setup()
      mockSetBudget.mockResolvedValue({ success: true })

      render(<BudgetManagement {...mockProps} />)

      // Navigate to party tab
      fireEvent.click(screen.getByText('Party Level'))

      // Click edit button for Artist party
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[1]) // Second edit button (party level)

      // Fill and submit form
      await user.type(screen.getByLabelText('Budget Amount (USD)'), '750.00')
      await user.click(screen.getByText('Save'))

      expect(mockSetBudget).toHaveBeenCalledWith({
        level: 'party',
        party: 'Artist',
        amount_cents: 75000,
        notes: undefined
      })
    })
  })

  describe('Person Level Budget Management', () => {
    it('should display individual person budgets', () => {
      const propsWithPersonBudgets = {
        ...mockProps,
        budgets: [
          ...mockProps.budgets,
          {
            id: 'budget-3',
            level: 'person' as const,
            passenger_id: 'person-1',
            amount_cents: 250000,
            created_at: '2024-01-01T00:00:00Z',
            created_by: 'user-123'
          }
        ]
      }

      render(<BudgetManagement {...propsWithPersonBudgets} />)

      // Navigate to person tab
      fireEvent.click(screen.getByText('Person Level'))

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('$250.00')).toBeInTheDocument()
      expect(screen.getByText('Artist')).toBeInTheDocument()
    })

    it('should allow editing person budgets inline', async () => {
      const user = userEvent.setup()
      mockSetBudget.mockResolvedValue({ success: true })

      render(<BudgetManagement {...mockProps} />)

      // Navigate to person tab
      fireEvent.click(screen.getByText('Person Level'))

      // Click edit button for first person
      const editButtons = screen.getAllByRole('button')
      const personEditButton = editButtons.find(btn => 
        btn.querySelector('svg') // Edit icon
      )
      await user.click(personEditButton!)

      // Should show inline edit form
      const amountInputs = screen.getAllByDisplayValue('')
      expect(amountInputs.length).toBeGreaterThan(0) // At least one amount input

      // Fill and submit
      await user.type(screen.getByDisplayValue(''), '300.00')
      const saveButton = screen.getByRole('button', { name: '' }) // Save icon
      await user.click(saveButton)

      expect(mockSetBudget).toHaveBeenCalledWith({
        level: 'person',
        passenger_id: 'person-1',
        amount_cents: 30000,
        notes: undefined
      })
    })
  })

  describe('Budget Status Indicators', () => {
    it('should show green status for healthy budget usage', () => {
      const healthySnapshot = {
        ...mockProps.snapshot!,
        spend: {
          confirmed: 200000, // 20% of budget
          pending: 100000
        },
        remaining: {
          total: 700000,
          byParty: { 'Artist': 400000 },
          byPerson: {}
        }
      }

      render(<BudgetManagement {...{ ...mockProps, snapshot: healthySnapshot }} />)

      // Should show green text for remaining budget
      const remainingElement = screen.getByText('$7,000.00')
      expect(remainingElement).toHaveClass('text-green-600')
    })

    it('should show yellow status for approaching budget limit', () => {
      const warningSnapshot = {
        ...mockProps.snapshot!,
        spend: {
          confirmed: 800000, // 80% of budget
          pending: 100000
        },
        remaining: {
          total: 100000,
          byParty: { 'Artist': 50000 },
          byPerson: {}
        }
      }

      render(<BudgetManagement {...{ ...mockProps, snapshot: warningSnapshot }} />)

      // Should show yellow text for remaining budget
      const remainingElement = screen.getByText('$1,000.00')
      expect(remainingElement).toHaveClass('text-yellow-600')
    })

    it('should show red status for over budget', () => {
      const overBudgetSnapshot = {
        ...mockProps.snapshot!,
        spend: {
          confirmed: 1000000, // 100% of budget
          pending: 200000
        },
        remaining: {
          total: -200000,
          byParty: { 'Artist': -100000 },
          byPerson: {}
        }
      }

      render(<BudgetManagement {...{ ...mockProps, snapshot: overBudgetSnapshot }} />)

      // Should show red text for negative remaining budget
      const remainingElement = screen.getByText('-$2,000.00')
      expect(remainingElement).toHaveClass('text-red-600')
    })
  })

  describe('Form Validation and Error Handling', () => {
    it('should handle form cancellation', async () => {
      const user = userEvent.setup()
      render(<BudgetManagement {...mockProps} />)

      // Navigate to tour tab and start editing
      fireEvent.click(screen.getByText('Tour Level'))
      await user.click(screen.getByText('Edit Budget'))

      // Cancel editing
      await user.click(screen.getByText('Cancel'))

      // Should return to display mode
      expect(screen.getByText('Edit Budget')).toBeInTheDocument()
      expect(screen.queryByLabelText('Budget Amount (USD)')).not.toBeInTheDocument()
    })

    it('should handle loading states during budget save', async () => {
      const user = userEvent.setup()
      // Mock a slow response
      mockSetBudget.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(<BudgetManagement {...mockProps} />)

      // Navigate to tour tab and edit
      fireEvent.click(screen.getByText('Tour Level'))
      await user.click(screen.getByText('Edit Budget'))
      await user.type(screen.getByLabelText('Budget Amount (USD)'), '1500.00')
      await user.click(screen.getByText('Save Budget'))

      // Button should be disabled during loading
      const saveButton = screen.getByText('Save Budget')
      expect(saveButton).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      }, { timeout: 200 })
    })
  })
})
