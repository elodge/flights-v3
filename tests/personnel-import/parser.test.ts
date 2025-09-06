/**
 * @fileoverview Personnel Import Parser Tests
 * 
 * @description Unit tests for Excel file parsing functionality
 * 
 * @coverage Tests file parsing, validation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parsePersonnelExcel, formatFileSize } from '@/lib/personnel-import/parser'

// Mock XLSX
const mockWorkbook = {
  SheetNames: ['Personnel Data', 'Instructions'],
  Sheets: {
    'Personnel Data': {
      A1: { v: 'Full Name*' },
      B1: { v: 'Party*' },
      C1: { v: 'Email' }
    }
  }
}

const mockJsonData = [
  ['Full Name*', 'Party*', 'Email', 'Phone', 'Passport Number', 'Passport Expiry', 'Date of Birth', 'Dietary Restrictions', 'Seat Preference', 'Frequent Flyer Numbers', 'Notes'],
  ['John Smith', 'A Party', 'john@example.com', '+1-555-0123', '', '', '', '', '', '', ''],
  ['Jane Doe', 'B Party', 'jane@example.com', '+1-555-0456', '', '', '', '', '', '', '']
]

vi.mock('xlsx', () => ({
  read: vi.fn(() => mockWorkbook),
  utils: {
    sheet_to_json: vi.fn(() => mockJsonData)
  }
}))

describe('Personnel Import Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock File.arrayBuffer
    global.File = class extends File {
      arrayBuffer() {
        return Promise.resolve(new ArrayBuffer(8))
      }
    } as any
  })

  describe('parsePersonnelExcel', () => {
    it('should parse valid Excel file', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      const result = await parsePersonnelExcel(mockFile)
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        fullName: 'John Smith',
        party: 'A Party',
        email: 'john@example.com',
        phone: '+1-555-0123'
      })
    })

    it('should reject invalid file types', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      const result = await parsePersonnelExcel(mockFile)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('File must be an Excel file (.xlsx or .xls)')
    })

    it('should handle empty files', async () => {
      const xlsx = await import('xlsx')
      ;(xlsx.utils.sheet_to_json as any).mockReturnValueOnce([])
      
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      const result = await parsePersonnelExcel(mockFile)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Excel file is empty')
    })

    it('should skip sample rows with DELETE_ME', async () => {
      const xlsx = await import('xlsx')
      const dataWithSample = [
        ['Full Name*', 'Party*', 'Email', 'Phone', 'Passport Number', 'Passport Expiry', 'Date of Birth', 'Dietary Restrictions', 'Seat Preference', 'Frequent Flyer Numbers', 'Notes'],
        ['DELETE_ME - John Smith', 'A Party', 'john@example.com', '', '', '', '', '', '', '', ''],
        ['Jane Doe', 'B Party', 'jane@example.com', '', '', '', '', '', '', '', '']
      ]
      ;(xlsx.utils.sheet_to_json as any).mockReturnValueOnce(dataWithSample)
      
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      const result = await parsePersonnelExcel(mockFile)
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].fullName).toBe('Jane Doe')
    })

    it('should handle parsing errors', async () => {
      const xlsx = await import('xlsx')
      ;(xlsx.read as any).mockImplementationOnce(() => {
        throw new Error('Parse error')
      })
      
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      const result = await parsePersonnelExcel(mockFile)
      
      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Failed to parse Excel file')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1572864)).toBe('1.5 MB')
    })
  })
})
