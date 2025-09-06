/**
 * @fileoverview Personnel Import Template Generation
 * 
 * @description Generates Excel template files for personnel import with sample data
 * and instructions. Uses SheetJS for client-side Excel file generation.
 * 
 * @security No server calls - all processing happens client-side
 * @business_rule Template includes required fields and validation examples
 */

import * as XLSX from 'xlsx'

/**
 * Personnel import template data structure
 */
export interface PersonnelTemplateRow {
  'Full Name*': string
  'Party*': string
  'Email': string
  'Phone': string
  'Passport Number': string
  'Passport Expiry': string
  'Date of Birth': string
  'Dietary Restrictions': string
  'Seat Preference': string
  'Frequent Flyer Numbers': string
  'Notes': string
}

/**
 * Generate and download personnel import template
 * 
 * @description Creates an Excel file with headers, sample data, and instructions
 * @security Client-side only - no server interaction
 * @business_rule Includes 2 example rows marked for deletion
 * 
 * @example
 * ```typescript
 * downloadPersonnelTemplate()
 * ```
 */
export function downloadPersonnelTemplate(): void {
  // CONTEXT: Template headers with required field indicators
  const headers: (keyof PersonnelTemplateRow)[] = [
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

  // CONTEXT: Sample data rows with clear deletion markers
  const sampleData: PersonnelTemplateRow[] = [
    {
      'Full Name*': 'DELETE_ME - John Smith',
      'Party*': 'A Party',
      'Email': 'john.smith@example.com',
      'Phone': '+1-555-0123',
      'Passport Number': 'A12345678',
      'Passport Expiry': '12/31/2025',
      'Date of Birth': '01/15/1985',
      'Dietary Restrictions': 'Vegetarian',
      'Seat Preference': 'Window',
      'Frequent Flyer Numbers': 'AA123456789',
      'Notes': 'Prefers aisle seat if window not available'
    },
    {
      'Full Name*': 'DELETE_ME - Sarah Johnson',
      'Party*': 'B Party',
      'Email': 'sarah.j@example.com',
      'Phone': '+1-555-0456',
      'Passport Number': 'B87654321',
      'Passport Expiry': '06/15/2026',
      'Date of Birth': '03/22/1990',
      'Dietary Restrictions': 'Gluten-free',
      'Seat Preference': 'Aisle',
      'Frequent Flyer Numbers': 'DL987654321',
      'Notes': 'Travels with service animal'
    }
  ]

  // CONTEXT: Instructions sheet content
  const instructions = [
    ['PERSONNEL IMPORT TEMPLATE - INSTRUCTIONS'],
    [''],
    ['REQUIRED FIELDS (marked with *):'],
    ['• Full Name*: 3-120 characters, will be trimmed and normalized'],
    ['• Party*: Must be one of: A Party, B Party, C Party, D Party'],
    [''],
    ['OPTIONAL FIELDS:'],
    ['• Email: Valid email format if provided'],
    ['• Phone: Up to 40 characters'],
    ['• Passport Number: Up to 64 characters'],
    ['• Passport Expiry: MM/DD/YYYY or YYYY-MM-DD format'],
    ['• Date of Birth: MM/DD/YYYY or YYYY-MM-DD format'],
    ['• Dietary Restrictions: Up to 200 characters'],
    ['• Seat Preference: Up to 40 characters'],
    ['• Frequent Flyer Numbers: Up to 200 characters'],
    ['• Notes: Up to 1000 characters'],
    [''],
    ['IMPORT RULES:'],
    ['• Maximum 500 rows per import'],
    ['• Delete the sample rows marked "DELETE_ME"'],
    ['• Party values are case-insensitive'],
    ['• Duplicate names within the file will show warnings'],
    ['• All dates should be in MM/DD/YYYY or YYYY-MM-DD format'],
    [''],
    ['VALIDATION:'],
    ['• Red badges indicate errors that must be fixed'],
    ['• Yellow badges indicate warnings'],
    ['• Import is only enabled when all errors are resolved'],
    [''],
    ['SUPPORT:'],
    ['• Contact your system administrator for assistance'],
    ['• Save your work frequently while editing']
  ]

  // CONTEXT: Create workbook with multiple sheets
  const workbook = XLSX.utils.book_new()

  // CONTEXT: Main data sheet with headers and sample data
  const worksheetData = [headers, ...sampleData.map(row => headers.map(header => row[header]))]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  
  // CONTEXT: Style the header row
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "366092" } },
    alignment: { horizontal: "center" }
  }
  
  // Apply header styling
  headers.forEach((_, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index })
    if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: headers[index] }
    worksheet[cellAddress].s = headerStyle
  })

  // CONTEXT: Set column widths for better readability
  const columnWidths = [
    { wch: 20 }, // Full Name
    { wch: 12 }, // Party
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // Passport Number
    { wch: 15 }, // Passport Expiry
    { wch: 15 }, // Date of Birth
    { wch: 20 }, // Dietary Restrictions
    { wch: 15 }, // Seat Preference
    { wch: 20 }, // Frequent Flyer Numbers
    { wch: 30 }  // Notes
  ]
  worksheet['!cols'] = columnWidths

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Personnel Data')

  // CONTEXT: Instructions sheet
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions)
  instructionsSheet['!cols'] = [{ wch: 80 }] // Wide column for instructions
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

  // CONTEXT: Generate and download the file
  const fileName = `personnel-import-template-${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
