/**
 * @fileoverview Integration tests for Add Leg dialog component
 * 
 * @description Tests the AddLegDialog component including form rendering,
 * validation, submission, and user interactions.
 * 
 * @coverage AddLegDialog component functionality and user interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddLegDialog } from '../add-leg-dialog'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}))

vi.mock('@/lib/actions/leg-actions', () => ({
  createLeg: vi.fn()
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('AddLegDialog', () => {
  let mockCreateLeg: any
  let mockToast: any
  let user: any

  beforeEach(async () => {
    vi.clearAllMocks()
    user = userEvent.setup()
    
    const legActionsModule = await import('@/lib/actions/leg-actions')
    const toastModule = await import('sonner')
    
    mockCreateLeg = vi.mocked(legActionsModule.createLeg)
    mockToast = vi.mocked(toastModule.toast)
  })

  it('should render Add Leg button', () => {
    render(<AddLegDialog projectId="test-project" />)
    
    expect(screen.getByRole('button', { name: /add leg/i })).toBeInTheDocument()
  })

  it('should open dialog when Add Leg button is clicked', async () => {
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    expect(screen.getByText('Add Flight Leg')).toBeInTheDocument()
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument()
  })

  it('should show required field validation for empty destination', async () => {
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    expect(screen.getByText('Destination must be at least 2 characters')).toBeInTheDocument()
  })

  it('should show validation for destination that is too short', async () => {
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'A')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    expect(screen.getByText('Destination must be at least 2 characters')).toBeInTheDocument()
  })

  it('should show validation for destination that is too long', async () => {
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'A'.repeat(81))
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    expect(screen.getByText('Destination must be less than 80 characters')).toBeInTheDocument()
  })

  it('should show validation for invalid date order', async () => {
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'New York, NY')
    
    const departureInput = screen.getByLabelText(/departure date/i)
    await user.type(departureInput, '2024-03-16')
    
    const arrivalInput = screen.getByLabelText(/arrival date/i)
    await user.type(arrivalInput, '2024-03-15')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    expect(screen.getByText('Arrival date must be on or after departure date')).toBeInTheDocument()
  })

  it('should successfully submit form with valid data', async () => {
    mockCreateLeg.mockResolvedValue({
      success: true,
      legId: 'new-leg-id'
    })
    
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'New York, NY')
    
    const originInput = screen.getByLabelText(/origin/i)
    await user.type(originInput, 'Los Angeles, CA')
    
    const labelInput = screen.getByLabelText(/label/i)
    await user.type(labelInput, 'E2E Test Leg')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateLeg).toHaveBeenCalledWith('test-project', {
        destination: 'New York, NY',
        origin: 'Los Angeles, CA',
        departure_date: undefined,
        arrival_date: undefined,
        label: 'E2E Test Leg'
      })
    })
    
    expect(mockToast.success).toHaveBeenCalledWith('Leg created successfully')
  })

  it('should handle server action errors', async () => {
    mockCreateLeg.mockResolvedValue({
      success: false,
      error: 'Database error'
    })
    
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'New York, NY')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Database error')
    })
  })

  it('should show loading state during submission', async () => {
    mockCreateLeg.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'New York, NY')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    expect(screen.getByText('Creating...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })

  it('should close dialog on successful submission', async () => {
    mockCreateLeg.mockResolvedValue({
      success: true,
      legId: 'new-leg-id'
    })
    
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'New York, NY')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Add Flight Leg')).not.toBeInTheDocument()
    })
  })

  it('should close dialog when cancel button is clicked', async () => {
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(screen.queryByText('Add Flight Leg')).not.toBeInTheDocument()
  })

  it('should reset form after successful submission', async () => {
    mockCreateLeg.mockResolvedValue({
      success: true,
      legId: 'new-leg-id'
    })
    
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'New York, NY')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Leg created successfully')
    })
    
    // Reopen dialog and verify form is reset
    await user.click(addButton)
    const newDestinationInput = screen.getByLabelText(/destination/i)
    expect(newDestinationInput).toHaveValue('')
  })

  it('should handle optional fields correctly', async () => {
    mockCreateLeg.mockResolvedValue({
      success: true,
      legId: 'new-leg-id'
    })
    
    render(<AddLegDialog projectId="test-project" />)
    
    const addButton = screen.getByRole('button', { name: /add leg/i })
    await user.click(addButton)
    
    const destinationInput = screen.getByLabelText(/destination/i)
    await user.type(destinationInput, 'PHL')
    
    const submitButton = screen.getByRole('button', { name: /create leg/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateLeg).toHaveBeenCalledWith('test-project', {
        destination: 'PHL',
        origin: undefined,
        departure_date: undefined,
        arrival_date: undefined,
        label: undefined
      })
    }, { timeout: 2000 })
  })
})
