/**
 * @fileoverview Personnel Import Excel Parser
 * 
 * @description Parses Excel files (.xlsx/.xls) and extracts personnel data
 * for import validation and processing.
 * 
 * @security Client-side parsing only - no file upload to server
 * @business_rule Supports both .xlsx and .xls formats with error handling
 */

import * as XLSX from 'xlsx'
import { PersonnelData } from './validation'

/**
 * Excel parsing result
 */
export interface ParseResult {
  success: boolean
  data: PersonnelData[]
  errors: string[]
  warnings: string[]
}

/**
 * Expected column headers for personnel import
 */
const EXPECTED_HEADERS = [
  'Full Name*',
  'Party*',
  'Email',
  'Phone',
  'Passport Number',
  'Passport Expiry',
  'Date of Birth',
  'Dietary Restrictions',
  'Seat Preference',
  'Frequent Flyer Numbers',
  'Notes'
]

/**
 * Map Excel headers to our data structure
 */
const HEADER_MAPPING: Record<string, keyof PersonnelData> = {
  'Full Name*': 'fullName',
  'Party*': 'party',
  'Email': 'email',
  'Phone': 'phone',
  'Passport Number': 'passportNumber',
  'Passport Expiry': 'passportExpiry',
  'Date of Birth': 'dateOfBirth',
  'Dietary Restrictions': 'dietaryRestrictions',
  'Seat Preference': 'seatPreference',
  'Frequent Flyer Numbers': 'frequentFlyerNumbers',
  'Notes': 'notes'
}

/**
 * Parse Excel file and extract personnel data
 * 
 * @description Reads Excel file and converts to personnel data structure
 * @param file Excel file (.xlsx or .xls)
 * @returns Parse result with data and any errors
 * 
 * @example
 * ```typescript
 * const result = await parsePersonnelExcel(file)
 * if (result.success) {
 *   console.log(`Parsed ${result.data.length} rows`)
 * }
 * ```
 */
export async function parsePersonnelExcel(file: File): Promise<ParseResult> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // CONTEXT: Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Sometimes Excel files have this MIME type
    ]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return {
        success: false,
        data: [],
        errors: ['File must be an Excel file (.xlsx or .xls)'],
        warnings: []
      }
    }

    // CONTEXT: Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // CONTEXT: Find the data sheet (not Instructions)
    const sheetNames = workbook.SheetNames
    const dataSheetName = sheetNames.find(name => 
      !name.toLowerCase().includes('instruction') && 
      !name.toLowerCase().includes('sheet2')
    ) || sheetNames[0]

    if (!dataSheetName) {
      return {
        success: false,
        data: [],
        errors: ['No data sheet found in Excel file'],
        warnings: []
      }
    }

    const worksheet = workbook.Sheets[dataSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false
    }) as string[][]

    if (jsonData.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['Excel file is empty'],
        warnings: []
      }
    }

    // CONTEXT: Validate headers
    const headers = jsonData[0] as string[]
    const headerValidation = validateHeaders(headers)
    
    if (!headerValidation.isValid) {
      return {
        success: false,
        data: [],
        errors: headerValidation.errors,
        warnings: headerValidation.warnings
      }
    }

    warnings.push(...headerValidation.warnings)

    // CONTEXT: Parse data rows
    const dataRows = jsonData.slice(1) // Skip header row
    const personnelData: PersonnelData[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowData: PersonnelData = {
        fullName: '',
        party: ''
      }

      // CONTEXT: Map each column to our data structure
      headers.forEach((header, colIndex) => {
        const mappedField = HEADER_MAPPING[header]
        if (mappedField && row[colIndex] !== undefined) {
          const value = String(row[colIndex] || '').trim()
          if (value) {
            (rowData as any)[mappedField] = value
          }
        }
      })

      // CONTEXT: Skip empty rows
      if (!rowData.fullName && !rowData.party) {
        continue
      }

      // CONTEXT: Skip sample rows marked for deletion
      if (rowData.fullName.includes('DELETE_ME')) {
        continue
      }

      personnelData.push(rowData)
    }

    // CONTEXT: Validate row count
    if (personnelData.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['No valid data rows found. Please check that you have data and removed sample rows.'],
        warnings: []
      }
    }

    if (personnelData.length > 500) {
      return {
        success: false,
        data: [],
        errors: [`Too many rows: ${personnelData.length}. Maximum 500 rows allowed per import.`],
        warnings: []
      }
    }

    return {
      success: true,
      data: personnelData,
      errors: [],
      warnings
    }

  } catch (error) {
    console.error('Error parsing Excel file:', error)
    return {
      success: false,
      data: [],
      errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    }
  }
}

/**
 * Validate Excel headers against expected format
 * 
 * @param headers Array of header strings from Excel
 * @returns Validation result
 */
function validateHeaders(headers: string[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // CONTEXT: Check for required headers
  const missingHeaders = EXPECTED_HEADERS.filter(expected => 
    !headers.some(header => header.trim() === expected)
  )

  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`)
  }

  // CONTEXT: Check for unexpected headers
  const unexpectedHeaders = headers.filter(header => 
    !EXPECTED_HEADERS.includes(header.trim())
  )

  if (unexpectedHeaders.length > 0) {
    warnings.push(`Unexpected headers found: ${unexpectedHeaders.join(', ')}. These will be ignored.`)
  }

  // CONTEXT: Check header order (warning only)
  const headerOrder = headers.map(h => h.trim())
  const expectedOrder = EXPECTED_HEADERS
  const isOrderCorrect = expectedOrder.every((expected, index) => 
    headerOrder[index] === expected
  )

  if (!isOrderCorrect) {
    warnings.push('Headers are not in the expected order. This may cause data to be mapped incorrectly.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Get file size in human readable format
 * 
 * @param bytes File size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
