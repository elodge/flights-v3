import { describe, it, expect, vi } from 'vitest'

// Simple test to verify the module can be imported
describe('Supabase Module', () => {
  it('should be able to import supabase utilities', async () => {
    // Mock the supabase module
    vi.mock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(),
        auth: { getUser: vi.fn() },
        storage: { from: vi.fn() },
      })),
    }))

    const { supabase } = await import('../supabase')
    
    expect(supabase).toBeDefined()
    expect(supabase.from).toBeDefined()
    expect(supabase.auth).toBeDefined()
  })

  it('should handle environment variables properly', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key')
  })
})