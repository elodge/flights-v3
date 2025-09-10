/**
 * @fileoverview Budget Management Component Tests - Simplified
 * 
 * @description Basic tests for the BudgetManagement component focusing on
 * core functionality and rendering.
 * 
 * @coverage Budget management UI, basic rendering, form interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('BudgetManagement Component - Basic Tests', () => {
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
      }
    ],
    snapshot: {
      totals: {
        tour: 1000000,
        byParty: {},
        byPerson: {}
      },
      spend: {
        confirmed: 300000,
        pending: 100000
      },
      remaining: {
        total: 600000,
        byParty: {},
        byPerson: {}
      }
    },
    tourPersonnel: [
      {
        id: 'person-1',
        full_name: 'John Doe',
        party: 'Artist'
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

  it('should render budget overview', () => {
    render(<BudgetManagement {...mockProps} />)

    expect(screen.getByText('Budget Overview')).toBeInTheDocument()
    expect(screen.getByText('$10,000.00')).toBeInTheDocument() // Total Budget
    expect(screen.getByText('$4,000.00')).toBeInTheDocument() // Total Spent
    expect(screen.getByText('$6,000.00')).toBeInTheDocument() // Remaining
  })

  it('should render tab navigation', () => {
    render(<BudgetManagement {...mockProps} />)

    expect(screen.getByText('Tour Level')).toBeInTheDocument()
    expect(screen.getByText('Party Level')).toBeInTheDocument()
    expect(screen.getByText('Person Level')).toBeInTheDocument()
  })

  it('should display existing tour budget', () => {
    render(<BudgetManagement {...mockProps} />)

    // Tour tab should be active by default
    expect(screen.getByText('$1,000.00')).toBeInTheDocument() // Tour budget amount
    expect(screen.getByText('Tour budget')).toBeInTheDocument() // Tour budget notes
    expect(screen.getByText('Edit Budget')).toBeInTheDocument()
  })

  it('should allow editing tour budget', async () => {
    const user = userEvent.setup()
    mockSetBudget.mockResolvedValue({ success: true })

    render(<BudgetManagement {...mockProps} />)

    // Click edit button
    await user.click(screen.getByText('Edit Budget'))

    // Check form is displayed
    expect(screen.getByLabelText('Budget Amount (USD)')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes (Optional)')).toBeInTheDocument()

    // Fill form
    await user.clear(screen.getByLabelText('Budget Amount (USD)'))
    await user.type(screen.getByLabelText('Budget Amount (USD)'), '1500.00')

    // Submit form
    await user.click(screen.getByText('Save Budget'))

    // Verify setBudget called with correct parameters
    expect(mockSetBudget).toHaveBeenCalledWith({
      level: 'tour',
      amount_cents: 150000,
      notes: 'Tour budget'
    })
  })

  it('should handle budget save errors', async () => {
    const user = userEvent.setup()
    mockSetBudget.mockResolvedValue({ 
      success: false, 
      error: 'Database error' 
    })

    render(<BudgetManagement {...mockProps} />)

    // Edit budget
    await user.click(screen.getByText('Edit Budget'))
    await user.type(screen.getByLabelText('Budget Amount (USD)'), '1500.00')
    await user.click(screen.getByText('Save Budget'))

    // Should not reload page on error
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('should handle form cancellation', async () => {
    const user = userEvent.setup()
    render(<BudgetManagement {...mockProps} />)

    // Start editing
    await user.click(screen.getByText('Edit Budget'))

    // Cancel editing
    await user.click(screen.getByText('Cancel'))

    // Should return to display mode
    expect(screen.getByText('Edit Budget')).toBeInTheDocument()
    expect(screen.queryByLabelText('Budget Amount (USD)')).not.toBeInTheDocument()
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

  it('should show budget status colors correctly', () => {
    const healthySnapshot = {
      ...mockProps.snapshot!,
      spend: {
        confirmed: 200000, // 20% of budget
        pending: 100000
      },
      remaining: {
        total: 700000,
        byParty: {},
        byPerson: {}
      }
    }

    render(<BudgetManagement {...{ ...mockProps, snapshot: healthySnapshot }} />)

    // Should show green text for healthy budget
    const remainingElement = screen.getByText('$7,000.00')
    expect(remainingElement).toHaveClass('text-green-600')
  })
})
