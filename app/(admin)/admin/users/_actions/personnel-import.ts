/**
 * @fileoverview Personnel Import Server Actions
 * 
 * @description Server-side actions for importing personnel data from Excel files
 * with validation, duplicate handling, and bulk insert operations.
 * 
 * @security Requires agent/admin role for all operations
 * @database Operates on tour_personnel table with RLS enforcement
 * @business_rule Validates data, handles duplicates, and provides detailed results
 */

'use server'

import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// CONTEXT: Validation schema for imported personnel data
// SECURITY: Strict validation prevents injection and ensures data integrity
const PersonnelRowSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters').max(120, 'Full name must be 120 characters or less'),
  party: z.enum(['A Party', 'B Party', 'C Party', 'D Party']),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(40, 'Phone must be 40 characters or less').optional().nullable(),
  passportNumber: z.string().max(64, 'Passport number must be 64 characters or less').optional().nullable(),
  passportExpiry: z.string().optional().nullable(), // ISO date string or null
  dateOfBirth: z.string().optional().nullable(), // ISO date string or null
  dietaryRestrictions: z.string().max(200, 'Dietary restrictions must be 200 characters or less').optional().nullable(),
  seatPreference: z.string().max(40, 'Seat preference must be 40 characters or less').optional().nullable(),
  frequentFlyerNumbers: z.string().max(200, 'Frequent flyer numbers must be 200 characters or less').optional().nullable(),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional().nullable(),
})

const ImportPersonnelSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  rows: z.array(PersonnelRowSchema).min(1, 'At least one row is required').max(500, 'Maximum 500 rows allowed per import')
})

/**
 * Import personnel data from validated Excel data
 * 
 * @description Bulk imports personnel records with duplicate detection and error handling
 * @param projectId UUID of the project to import personnel for
 * @param rawRows Array of personnel data to import
 * @returns Import result with counts and any warnings
 * 
 * @security Requires agent/admin role via getServerUser()
 * @database Inserts into tour_personnel table with RLS enforcement
 * @business_rule Handles duplicates gracefully, provides detailed import results
 * 
 * @example
 * ```typescript
 * const result = await importPersonnel(projectId, [
 *   { fullName: 'John Smith', party: 'A Party', email: 'john@example.com' }
 * ])
 * console.log(`Imported ${result.insertedCount} people`)
 * ```
 */
export async function importPersonnel(projectId: string, rawRows: unknown) {
  // CONTEXT: Validate user authentication and role
  // SECURITY: Ensure only agents and admins can import personnel
  const user = await getServerUser()
  if (!user || !user.user || !['agent', 'admin'].includes(user.role || '')) {
    throw new Error('Unauthorized: Agent or admin role required')
  }

  // CONTEXT: Validate input data
  const validatedData = ImportPersonnelSchema.parse({
    projectId,
    rows: rawRows
  })

  const supabase = await createServerClient()

  try {
    // CONTEXT: Check if project exists and user has access
    // SECURITY: Verify project access through RLS
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', validatedData.projectId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found or access denied')
    }

    // CONTEXT: Prepare data for insertion
    // ALGORITHM: Map validated data to database schema
    const insertData = validatedData.rows.map(row => ({
      project_id: validatedData.projectId,
      full_name: row.fullName.replace(/\s+/g, ' ').trim(), // Normalize whitespace
      party: row.party,
      email: row.email || null,
      phone: row.phone || null,
      passport_number: row.passportNumber || null,
      passport_expiry: row.passportExpiry || null,
      date_of_birth: row.dateOfBirth || null,
      dietary_requirements: row.dietaryRestrictions || null,
      seat_pref: row.seatPreference || null,
      ff_numbers: row.frequentFlyerNumbers || null,
      notes: row.notes || null,
      created_by: user.user!.id,
      status: 'active' as const
    }))

    // CONTEXT: Check for existing personnel with same names
    // BUSINESS_RULE: Detect potential duplicates for warning
    const existingNames = await supabase
      .from('tour_personnel')
      .select('full_name')
      .eq('project_id', validatedData.projectId)
      .in('full_name', insertData.map(row => row.full_name))

    const existingNameSet = new Set(
      existingNames.data?.map(p => p.full_name.toLowerCase()) || []
    )

    const warnings: string[] = []
    const duplicateNames = insertData
      .filter(row => existingNameSet.has(row.full_name.toLowerCase()))
      .map(row => row.full_name)

    if (duplicateNames.length > 0) {
      warnings.push(`Potential duplicates found: ${duplicateNames.join(', ')}`)
    }

    // CONTEXT: Bulk insert personnel data
    // DATABASE: Insert with conflict handling
    const { data: insertedData, error: insertError } = await supabase
      .from('tour_personnel')
      .insert(insertData)
      .select('id, full_name')

    if (insertError) {
      console.error('Error inserting personnel:', insertError)
      throw new Error(`Failed to import personnel: ${insertError.message}`)
    }

    const insertedCount = insertedData?.length || 0
    const skippedCount = insertData.length - insertedCount

    // CONTEXT: Revalidate relevant pages
    // ALGORITHM: Refresh personnel list and tour page
    revalidatePath(`/a/tour/${validatedData.projectId}`)
    revalidatePath('/a')

    return {
      success: true,
      insertedCount,
      skippedCount,
      warnings,
      projectName: project.name
    }

  } catch (error) {
    console.error('Error in importPersonnel:', error)
    
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`)
    }
    
    throw new Error(error instanceof Error ? error.message : 'Failed to import personnel')
  }
}

/**
 * Get import statistics for a project
 * 
 * @description Returns count of personnel records for a project
 * @param projectId UUID of the project
 * @returns Personnel count and basic statistics
 * 
 * @security Requires agent/admin role
 * @database Queries tour_personnel table with RLS
 */
export async function getPersonnelImportStats(projectId: string) {
  const user = await getServerUser()
  if (!user || !user.user || !['agent', 'admin'].includes(user.role || '')) {
    throw new Error('Unauthorized: Agent or admin role required')
  }

  const supabase = await createServerClient()

  try {
    const { data, error } = await supabase
      .from('tour_personnel')
      .select('id, is_active')
      .eq('project_id', projectId)

    if (error) {
      throw new Error(`Failed to get personnel stats: ${error.message}`)
    }

    const totalCount = data?.length || 0
    const activeCount = data?.filter(p => p.is_active === true).length || 0

    return {
      totalCount,
      activeCount,
      partyCounts: {} // Party information not available in current schema
    }

  } catch (error) {
    console.error('Error in getPersonnelImportStats:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to get personnel statistics')
  }
}
