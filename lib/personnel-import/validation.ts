/**
 * @fileoverview Personnel Import Validation
 * 
 * @description Client-side validation for personnel import data including
 * field validation, duplicate detection, and error reporting.
 * 
 * @security Client-side validation only - server validates on import
 * @business_rule Strict validation with clear error messages
 */

/**
 * Validation error types
 */
export type ValidationError = {
  type: 'error' | 'warning'
  message: string
  field?: string
}

/**
 * Validation result for a single row
 */
export interface RowValidation {
  rowIndex: number
  errors: ValidationError[]
  warnings: ValidationError[]
  isValid: boolean
}

/**
 * Personnel data structure for validation
 */
export interface PersonnelData {
  fullName: string
  party: string
  email?: string
  phone?: string
  passportNumber?: string
  passportExpiry?: string
  dateOfBirth?: string
  dietaryRestrictions?: string
  seatPreference?: string
  frequentFlyerNumbers?: string
  notes?: string
}

/**
 * Normalize full name by trimming and collapsing spaces
 * 
 * @param name Raw name input
 * @returns Normalized name
 * 
 * @example
 * ```typescript
 * normalizeName("  John   Smith  ") // "John Smith"
 * ```
 */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

/**
 * Validate and normalize party value
 * 
 * @param party Raw party input
 * @returns Normalized party or null if invalid
 * 
 * @example
 * ```typescript
 * validateParty("a party") // "A Party"
 * validateParty("invalid") // null
 * ```
 */
export function validateParty(party: string): string | null {
  const normalized = party.trim()
  const validParties = ['A Party', 'B Party', 'C Party', 'D Party']
  
  // Case-insensitive matching
  const matched = validParties.find(p => 
    p.toLowerCase() === normalized.toLowerCase()
  )
  
  return matched || null
}

/**
 * Parse date string to ISO format
 * 
 * @param dateStr Date string in MM/DD/YYYY or YYYY-MM-DD format
 * @returns ISO date string or null if invalid
 * 
 * @example
 * ```typescript
 * parseDate("12/31/2025") // "2025-12-31"
 * parseDate("2025-12-31") // "2025-12-31"
 * parseDate("invalid") // null
 * ```
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null
  
  const trimmed = dateStr.trim()
  
  // Try MM/DD/YYYY format
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  const match1 = trimmed.match(mmddyyyy)
  if (match1) {
    const [, month, day, year] = match1
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (date.getFullYear() == parseInt(year) && 
        date.getMonth() == parseInt(month) - 1 && 
        date.getDate() == parseInt(day)) {
      return date.toISOString().split('T')[0]
    }
  }
  
  // Try YYYY-MM-DD format
  const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  const match2 = trimmed.match(yyyymmdd)
  if (match2) {
    const [, year, month, day] = match2
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (date.getFullYear() == parseInt(year) && 
        date.getMonth() == parseInt(month) - 1 && 
        date.getDate() == parseInt(day)) {
      return date.toISOString().split('T')[0]
    }
  }
  
  return null
}

/**
 * Validate email format
 * 
 * @param email Email string
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return true // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validate a single personnel row
 * 
 * @param data Personnel data to validate
 * @param rowIndex Row index for error reporting
 * @param allRows All rows for duplicate detection
 * @returns Validation result
 */
export function validatePersonnelRow(
  data: PersonnelData, 
  rowIndex: number, 
  allRows: PersonnelData[]
): RowValidation {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // CONTEXT: Required field validation
  // Full Name validation
  const normalizedName = normalizeName(data.fullName)
  if (!normalizedName) {
    errors.push({
      type: 'error',
      message: 'Full Name is required',
      field: 'fullName'
    })
  } else if (normalizedName.length < 3) {
    errors.push({
      type: 'error',
      message: 'Full Name must be at least 3 characters',
      field: 'fullName'
    })
  } else if (normalizedName.length > 120) {
    errors.push({
      type: 'error',
      message: 'Full Name must be 120 characters or less',
      field: 'fullName'
    })
  }

  // Party validation
  const validParty = validateParty(data.party)
  if (!validParty) {
    errors.push({
      type: 'error',
      message: 'Party must be one of: A Party, B Party, C Party, D Party',
      field: 'party'
    })
  }

  // CONTEXT: Optional field validation
  // Email validation
  if (data.email && !isValidEmail(data.email)) {
    errors.push({
      type: 'error',
      message: 'Invalid email format',
      field: 'email'
    })
  }

  // Phone validation
  if (data.phone && data.phone.length > 40) {
    errors.push({
      type: 'error',
      message: 'Phone must be 40 characters or less',
      field: 'phone'
    })
  }

  // Passport Number validation
  if (data.passportNumber && data.passportNumber.length > 64) {
    errors.push({
      type: 'error',
      message: 'Passport Number must be 64 characters or less',
      field: 'passportNumber'
    })
  }

  // Date validation
  if (data.passportExpiry && !parseDate(data.passportExpiry)) {
    errors.push({
      type: 'error',
      message: 'Passport Expiry must be in MM/DD/YYYY or YYYY-MM-DD format',
      field: 'passportExpiry'
    })
  }

  if (data.dateOfBirth && !parseDate(data.dateOfBirth)) {
    errors.push({
      type: 'error',
      message: 'Date of Birth must be in MM/DD/YYYY or YYYY-MM-DD format',
      field: 'dateOfBirth'
    })
  }

  // Dietary Restrictions validation
  if (data.dietaryRestrictions && data.dietaryRestrictions.length > 200) {
    errors.push({
      type: 'error',
      message: 'Dietary Restrictions must be 200 characters or less',
      field: 'dietaryRestrictions'
    })
  }

  // Seat Preference validation
  if (data.seatPreference && data.seatPreference.length > 40) {
    errors.push({
      type: 'error',
      message: 'Seat Preference must be 40 characters or less',
      field: 'seatPreference'
    })
  }

  // Frequent Flyer Numbers validation
  if (data.frequentFlyerNumbers && data.frequentFlyerNumbers.length > 200) {
    errors.push({
      type: 'error',
      message: 'Frequent Flyer Numbers must be 200 characters or less',
      field: 'frequentFlyerNumbers'
    })
  }

  // Notes validation
  if (data.notes && data.notes.length > 1000) {
    errors.push({
      type: 'error',
      message: 'Notes must be 1000 characters or less',
      field: 'notes'
    })
  }

  // CONTEXT: Duplicate detection within file
  if (normalizedName) {
    const duplicateCount = allRows
      .filter((row, index) => index !== rowIndex)
      .filter(row => normalizeName(row.fullName).toLowerCase() === normalizedName.toLowerCase())
      .length

    if (duplicateCount > 0) {
      warnings.push({
        type: 'warning',
        message: `Duplicate name found in file (${duplicateCount + 1} occurrences)`,
        field: 'fullName'
      })
    }
  }

  return {
    rowIndex,
    errors,
    warnings,
    isValid: errors.length === 0
  }
}

/**
 * Validate all personnel rows
 * 
 * @param rows Array of personnel data
 * @returns Array of validation results
 */
export function validateAllPersonnelRows(rows: PersonnelData[]): RowValidation[] {
  // CONTEXT: Check row count limit
  if (rows.length > 500) {
    return [{
      rowIndex: -1,
      errors: [{
        type: 'error',
        message: 'Maximum 500 rows allowed per import'
      }],
      warnings: [],
      isValid: false
    }]
  }

  return rows.map((row, index) => 
    validatePersonnelRow(row, index, rows)
  )
}

/**
 * Get total error and warning counts
 * 
 * @param validations Array of validation results
 * @returns Count summary
 */
export function getValidationSummary(validations: RowValidation[]): {
  totalErrors: number
  totalWarnings: number
  validRows: number
  totalRows: number
} {
  const totalErrors = validations.reduce((sum, v) => sum + v.errors.length, 0)
  const totalWarnings = validations.reduce((sum, v) => sum + v.warnings.length, 0)
  const validRows = validations.filter(v => v.isValid).length
  const totalRows = validations.length

  return {
    totalErrors,
    totalWarnings,
    validRows,
    totalRows
  }
}
