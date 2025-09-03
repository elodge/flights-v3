/// <reference types="vitest/globals" />
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

// Mock data factories
export const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'client' as const,
  avatar_url: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockArtist = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Test Artist',
  description: 'A test artist for testing',
  contact_email: 'artist@example.com',
  contact_phone: '+1-555-0123',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockProject = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  artist_id: mockArtist.id,
  name: 'Test Tour 2024',
  description: 'A test tour project',
  type: 'tour' as const,
  start_date: '2024-03-01',
  end_date: '2024-06-30',
  is_active: true,
  created_by: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockLeg = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  project_id: mockProject.id,
  label: 'New York to Los Angeles',
  departure_city: 'New York',
  arrival_city: 'Los Angeles',
  departure_date: '2024-03-15',
  arrival_date: '2024-03-15',
  departure_time: '09:00',
  arrival_time: '14:00',
  notes: 'Direct flight',
  leg_order: 1,
  is_active: true,
  created_by: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockTourPersonnel = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  project_id: mockProject.id,
  full_name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0124',
  role_title: 'Tour Manager',
  passport_number: 'US123456789',
  nationality: 'US',
  date_of_birth: '1985-05-15',
  dietary_requirements: 'Vegetarian',
  special_requests: 'Aisle seat',
  is_vip: false,
  is_active: true,
  created_by: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockOption = {
  id: '550e8400-e29b-41d4-a716-446655440005',
  leg_id: mockLeg.id,
  name: 'Economy Option',
  description: 'Standard economy class flights',
  total_cost: 299.99,
  currency: 'USD',
  is_recommended: true,
  is_available: true,
  expires_at: '2024-03-10T23:59:59Z',
  created_by: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

function createWrapper(queryClient?: QueryClient) {
  const defaultQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient || defaultQueryClient}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    )
  }
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, ...renderOptions } = options
  
  return render(ui, {
    wrapper: createWrapper(queryClient),
    ...renderOptions,
  })
}

// Mock Supabase client
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    csv: vi.fn().mockReturnThis(),
    geojson: vi.fn().mockReturnThis(),
    explain: vi.fn().mockReturnThis(),
    rollback: vi.fn().mockReturnThis(),
    returns: vi.fn().mockReturnThis(),
  })),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
      getPublicUrl: vi.fn(),
      createSignedUrl: vi.fn(),
    })),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
}

// Mock Supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  createServerClient: () => mockSupabaseClient,
  createAdminClient: () => mockSupabaseClient,
}))

// Utility functions for testing
export function createMockResponse<T>(data: T, error?: unknown) {
  return {
    data: error ? null : data,
    error: error || null,
    count: null,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  }
}

export function createMockPromise<T>(data: T, error?: unknown, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(createMockResponse(data, error))
    }, delay)
  })
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
