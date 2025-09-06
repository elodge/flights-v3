/**
 * @fileoverview Personnel Import Template Tests
 * 
 * @description Unit tests for personnel import template generation
 * 
 * @coverage Tests template download functionality and data structure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadPersonnelTemplate } from '@/lib/personnel-import/template'

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    encode_cell: vi.fn((cell) => cell.r ? `${String.fromCharCode(65 + cell.c)}${cell.r + 1}` : 'A1')
  },
  writeFile: vi.fn()
}))

describe('Personnel Import Template', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('downloadPersonnelTemplate', () => {
    it('should generate template without errors', () => {
      // CONTEXT: Test that template generation doesn't throw
      expect(() => downloadPersonnelTemplate()).not.toThrow()
    })

    it('should call XLSX functions', async () => {
      const xlsx = await import('xlsx')
      
      downloadPersonnelTemplate()
      
      // CONTEXT: Verify XLSX functions are called
      expect(xlsx.utils.book_new).toHaveBeenCalled()
      expect(xlsx.utils.aoa_to_sheet).toHaveBeenCalled()
      expect(xlsx.utils.book_append_sheet).toHaveBeenCalledTimes(2) // Data + Instructions
      expect(xlsx.writeFile).toHaveBeenCalled()
    })

    it('should include sample data with DELETE_ME markers', async () => {
      const xlsx = await import('xlsx')
      
      downloadPersonnelTemplate()
      
      // CONTEXT: Verify sample data is included
      const aoaToSheetCall = (xlsx.utils.aoa_to_sheet as any).mock.calls[0][0]
      expect(aoaToSheetCall).toBeDefined()
      expect(aoaToSheetCall.length).toBeGreaterThan(1) // Headers + sample data
      
      // CONTEXT: Check that sample rows contain DELETE_ME
      const sampleRows = aoaToSheetCall.slice(1) // Skip headers
      expect(sampleRows.some((row: any[]) => 
        row.some((cell: any) => 
          typeof cell === 'string' && cell.includes('DELETE_ME')
        )
      )).toBe(true)
    })

    it('should include instructions sheet', async () => {
      const xlsx = await import('xlsx')
      
      downloadPersonnelTemplate()
      
      // CONTEXT: Verify instructions sheet is created
      const bookAppendSheetCalls = (xlsx.utils.book_append_sheet as any).mock.calls
      const instructionsCall = bookAppendSheetCalls.find((call: any[]) => 
        call[2] === 'Instructions'
      )
      expect(instructionsCall).toBeDefined()
    })

    it('should generate filename with current date', async () => {
      const xlsx = await import('xlsx')
      
      downloadPersonnelTemplate()
      
      // CONTEXT: Verify filename includes date
      const writeFileCall = (xlsx.writeFile as any).mock.calls[0]
      const filename = writeFileCall[1]
      expect(filename).toMatch(/personnel-import-template-\d{4}-\d{2}-\d{2}\.xlsx/)
    })
  })
})
