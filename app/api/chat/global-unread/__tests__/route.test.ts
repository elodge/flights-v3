/**
 * @fileoverview Unit tests for global unread count API route
 * 
 * @description Tests the GET endpoint for fetching global unread chat counts,
 * including authentication, authorization, and error handling.
 * 
 * @coverage GET /api/chat/global-unread route functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock the auth and unread count functions
vi.mock('@/lib/auth', () => ({
  getServerUser: vi.fn()
}))

vi.mock('@/lib/chat/unreadCounts', () => ({
  getGlobalUnreadCountForEmployee: vi.fn()
}))

describe('GET /api/chat/global-unread', () => {
  let mockGetServerUser: any
  let mockGetGlobalUnreadCountForEmployee: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const authModule = await import('@/lib/auth')
    const unreadModule = await import('@/lib/chat/unreadCounts')
    
    mockGetServerUser = vi.mocked(authModule.getServerUser)
    mockGetGlobalUnreadCountForEmployee = vi.mocked(unreadModule.getGlobalUnreadCountForEmployee)
  })

  it('should return unread count for authenticated employee', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      email: 'agent@example.com',
      role: 'agent'
    })
    
    mockGetGlobalUnreadCountForEmployee.mockResolvedValue(15)
    
    const request = new NextRequest('http://localhost:3000/api/chat/global-unread')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toEqual({ total: 15 })
    
    expect(mockGetGlobalUnreadCountForEmployee).toHaveBeenCalledWith({
      userId: 'user-123',
      artistId: null
    })
  })

  it('should return unread count with artist filter', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      email: 'agent@example.com',
      role: 'agent'
    })
    
    mockGetGlobalUnreadCountForEmployee.mockResolvedValue(8)
    
    const request = new NextRequest('http://localhost:3000/api/chat/global-unread?artist=artist-456')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toEqual({ total: 8 })
    
    expect(mockGetGlobalUnreadCountForEmployee).toHaveBeenCalledWith({
      userId: 'user-123',
      artistId: 'artist-456'
    })
  })

  it('should return 401 for unauthenticated user', async () => {
    mockGetServerUser.mockResolvedValue(null)
    
    const request = new NextRequest('http://localhost:3000/api/chat/global-unread')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
    
    const data = await response.json()
    expect(data).toEqual({ error: 'Unauthorized' })
    
    expect(mockGetGlobalUnreadCountForEmployee).not.toHaveBeenCalled()
  })

  it('should return 403 for client users', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      email: 'client@example.com',
      role: 'client'
    })
    
    const request = new NextRequest('http://localhost:3000/api/chat/global-unread')
    const response = await GET(request)
    
    expect(response.status).toBe(403)
    
    const data = await response.json()
    expect(data).toEqual({ error: 'Forbidden - clients cannot access global unread counts' })
    
    expect(mockGetGlobalUnreadCountForEmployee).not.toHaveBeenCalled()
  })

  it('should return 500 for server errors', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      email: 'agent@example.com',
      role: 'agent'
    })
    
    mockGetGlobalUnreadCountForEmployee.mockRejectedValue(new Error('Database error'))
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const request = new NextRequest('http://localhost:3000/api/chat/global-unread')
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data).toEqual({ error: 'Internal server error' })
    
    expect(consoleSpy).toHaveBeenCalledWith('Error in global unread count API:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should handle admin users', async () => {
    mockGetServerUser.mockResolvedValue({
      id: 'user-123',
      email: 'admin@example.com',
      role: 'admin'
    })
    
    mockGetGlobalUnreadCountForEmployee.mockResolvedValue(25)
    
    const request = new NextRequest('http://localhost:3000/api/chat/global-unread')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toEqual({ total: 25 })
    
    expect(mockGetGlobalUnreadCountForEmployee).toHaveBeenCalledWith({
      userId: 'user-123',
      artistId: null
    })
  })
})
