import '@testing-library/jest-dom'
import React from 'react'
import { beforeAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock Next.js router
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockPrefetch = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
      return React.createElement('a', { href, ...props }, children)
    }
  }
})

// Mock Next.js Image component
vi.mock('next/image', () => {
  return {
    __esModule: true,
    default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
      return React.createElement('img', { src, alt, ...props })
    }
  }
})

// Mock window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Create a chainable query builder mock
const createQueryBuilderMock = () => {
  const queryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    like: vi.fn(),
    ilike: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    contains: vi.fn(),
    containedBy: vi.fn(),
    rangeLt: vi.fn(),
    rangeGt: vi.fn(),
    rangeGte: vi.fn(),
    rangeLte: vi.fn(),
    rangeAdjacent: vi.fn(),
    overlaps: vi.fn(),
    textSearch: vi.fn(),
    match: vi.fn(),
    not: vi.fn(),
    or: vi.fn(),
    filter: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    abortSignal: vi.fn(),
    single: vi.fn().mockResolvedValue({ 
      data: {
        id: 'leg-456',
        label: 'Test Leg',
        origin_city: 'Los Angeles',
        destination_city: 'New York',
        departure_date: '2024-03-15',
        departure_time: '08:00',
        projects: {
          id: 'project-123',
          name: 'Eras Tour 2024',
          type: 'tour',
          artist_id: 'artist-123',
          artists: {
            id: 'artist-123',
            name: 'Taylor Swift'
          }
        },
        leg_passengers: [],
        options: []
      }, 
      error: null 
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    csv: vi.fn().mockResolvedValue(''),
    geojson: vi.fn().mockResolvedValue({ data: null, error: null }),
    explain: vi.fn().mockResolvedValue({ data: null, error: null }),
    rollback: vi.fn().mockResolvedValue({ data: null, error: null }),
    returns: vi.fn(),
    then: vi.fn((callback) => callback({ data: null, error: null }))
  }
  
  // Make each method return the queryBuilder for chaining (except terminal methods)
  const terminalMethods = ['single', 'maybeSingle', 'csv', 'geojson', 'explain', 'rollback', 'then']
  Object.keys(queryBuilder).forEach(method => {
    if (!terminalMethods.includes(method)) {
      (queryBuilder as any)[method] = vi.fn().mockReturnValue(queryBuilder)
    }
  })
  
  return queryBuilder
}

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      }),
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ 
        data: { user: null, session: null }, 
        error: null 
      })
    },
    from: vi.fn().mockImplementation(() => createQueryBuilderMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue('ok'),
      unsubscribe: vi.fn().mockResolvedValue('ok'),
      send: vi.fn()
    }),
    removeChannel: vi.fn()
  },
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      })
    },
    from: vi.fn().mockImplementation(() => createQueryBuilderMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue('ok'),
      unsubscribe: vi.fn().mockResolvedValue('ok'),
      send: vi.fn()
    }),
    removeChannel: vi.fn()
  }),
  createAdminClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      })
    },
    from: vi.fn().mockImplementation(() => createQueryBuilderMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue('ok'),
      unsubscribe: vi.fn().mockResolvedValue('ok'),
      send: vi.fn()
    }),
    removeChannel: vi.fn()
  })
}))

// Mock Supabase server client
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      })
    },
    from: vi.fn().mockImplementation(() => createQueryBuilderMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue('ok'),
      unsubscribe: vi.fn().mockResolvedValue('ok'),
      send: vi.fn()
    }),
    removeChannel: vi.fn()
  }))
}))

// Mock auth helpers
vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn().mockResolvedValue(null),
  syncUser: vi.fn().mockResolvedValue({}),
  requireRole: vi.fn().mockResolvedValue(null)
}))

// Mock environment variables
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

// Clean up after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Export mock functions for use in tests if needed
export { mockPush, mockReplace, mockPrefetch, mockBack }
