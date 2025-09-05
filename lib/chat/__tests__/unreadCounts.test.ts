/**
 * @fileoverview Unit tests for chat unread count utilities
 * 
 * @description Tests the server-side unread count calculation functions,
 * including artist filtering, RPC calls, and edge cases.
 * 
 * @coverage getGlobalUnreadCountForEmployee and getEmployeeSelectedArtistId functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGlobalUnreadCountForEmployee, getEmployeeSelectedArtistId } from '../unreadCounts'

// Mock the Supabase admin client
vi.mock('@/lib/supabase', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn()
  }))
}))

describe('getEmployeeSelectedArtistId', () => {
  it('should return artist ID from URL search params', () => {
    const searchParams = new URLSearchParams('artist=artist-123')
    const cookies = {
      get: vi.fn(() => ({ value: 'artist-456' }))
    }
    
    const result = getEmployeeSelectedArtistId(searchParams, cookies)
    
    expect(result).toBe('artist-123')
  })

  it('should fall back to cookie when no URL param', () => {
    const searchParams = new URLSearchParams()
    const cookies = {
      get: vi.fn(() => ({ value: 'artist-456' }))
    }
    
    const result = getEmployeeSelectedArtistId(searchParams, cookies)
    
    expect(result).toBe('artist-456')
    expect(cookies.get).toHaveBeenCalledWith('employee_artist_id')
  })

  it('should return null when no artist selection', () => {
    const searchParams = new URLSearchParams()
    const cookies = {
      get: vi.fn(() => undefined)
    }
    
    const result = getEmployeeSelectedArtistId(searchParams, cookies)
    
    expect(result).toBeNull()
  })

  it('should return null when cookie value is empty', () => {
    const searchParams = new URLSearchParams()
    const cookies = {
      get: vi.fn(() => ({ value: '' }))
    }
    
    const result = getEmployeeSelectedArtistId(searchParams, cookies)
    
    expect(result).toBeNull()
  })
})

describe('getGlobalUnreadCountForEmployee', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockSupabase = {
      rpc: vi.fn()
    }
    
    const { createAdminClient } = await import('@/lib/supabase')
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase)
  })

  it('should return unread count for all artists', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [{ total_unread: 15 }],
      error: null
    })
    
    const result = await getGlobalUnreadCountForEmployee({
      userId: 'user-123',
      artistId: null
    })
    
    expect(result).toBe(15)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_employee_unread_count', {
      p_user_id: 'user-123',
      p_artist_id: null
    })
  })

  it('should return unread count for specific artist', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [{ total_unread: 8 }],
      error: null
    })
    
    const result = await getGlobalUnreadCountForEmployee({
      userId: 'user-123',
      artistId: 'artist-456'
    })
    
    expect(result).toBe(8)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_employee_unread_count', {
      p_user_id: 'user-123',
      p_artist_id: 'artist-456'
    })
  })

  it('should return 0 when no unread messages', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [{ total_unread: 0 }],
      error: null
    })
    
    const result = await getGlobalUnreadCountForEmployee({
      userId: 'user-123',
      artistId: null
    })
    
    expect(result).toBe(0)
  })

  it('should return 0 when RPC returns no data', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null
    })
    
    const result = await getGlobalUnreadCountForEmployee({
      userId: 'user-123',
      artistId: null
    })
    
    expect(result).toBe(0)
  })

  it('should return 0 when RPC returns null data', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: null
    })
    
    const result = await getGlobalUnreadCountForEmployee({
      userId: 'user-123',
      artistId: null
    })
    
    expect(result).toBe(0)
  })

  it('should handle RPC errors gracefully', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Database error' }
    })
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const result = await getGlobalUnreadCountForEmployee({
      userId: 'user-123',
      artistId: null
    })
    
    expect(result).toBe(0)
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching unread count:', { message: 'Database error' })
    
    consoleSpy.mockRestore()
  })

  it('should handle exceptions gracefully', async () => {
    mockSupabase.rpc.mockRejectedValue(new Error('Network error'))
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const result = await getGlobalUnreadCountForEmployee({
      userId: 'user-123',
      artistId: null
    })
    
    expect(result).toBe(0)
    expect(consoleSpy).toHaveBeenCalledWith('Error in getGlobalUnreadCountForEmployee:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})
