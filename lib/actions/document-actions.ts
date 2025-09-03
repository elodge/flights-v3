/**
 * @fileoverview Server actions for document management and file uploads
 * 
 * @description Handles document upload, management, and storage operations
 * for flight-related documents (itineraries, invoices). Implements versioning
 * logic and proper access control.
 * 
 * @access Employee upload, Client view current only
 * @storage Supabase Storage bucket: flight-docs
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase-server'
import { getServerUser } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const uploadDocumentSchema = z.object({
  passenger_id: z.string().uuid(),
  project_id: z.string().uuid(),
  type: z.enum(['itinerary', 'invoice']),
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  file_size: z.number().positive()
})

const deleteDocumentSchema = z.object({
  document_id: z.string().uuid()
})

/**
 * Server action result type for consistent error handling
 */
interface ActionResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * Uploads a document file and creates database record
 * 
 * @description Handles file upload to Supabase Storage and creates document
 * record. Implements versioning by setting previous documents of same type
 * to is_current = false.
 * 
 * @param formData - Form data containing document details and file
 * @returns Promise<ActionResult> Success/error result with document data
 * 
 * @business_rule Only employees can upload documents
 * @business_rule One current document per type per passenger per project
 * @business_rule Previous versions are preserved but marked not current
 */
export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  try {
    // Authenticate user
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { success: false, error: 'Unauthorized - only employees can upload documents' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return { success: false, error: 'Only PDF files are allowed' }
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 50MB' }
    }

    // Validate other data
    const rawData = {
      passenger_id: formData.get('passenger_id'),
      project_id: formData.get('project_id'),
      type: formData.get('type'),
      file_name: file.name,
      file_path: '', // Will be set after upload
      file_size: file.size
    }
    
    const supabase = await createServerClient()

    // ALGORITHM: Create unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = file.name.split('.').pop()
    const fileName = `${rawData.passenger_id}-${rawData.type}-${timestamp}.${fileExtension}`
    const filePath = `documents/${fileName}`

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('flight-docs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return { success: false, error: 'Failed to upload file' }
    }

    // Validate document data with actual file path
    const validated = uploadDocumentSchema.parse({
      ...rawData,
      file_path: uploadData.path
    })

    // BUSINESS_RULE: Mark previous documents of same type as not current
    const { error: updateError } = await supabase
      .from('documents')
      .update({ is_current: false })
      .eq('passenger_id', validated.passenger_id)
      .eq('project_id', validated.project_id)
      .eq('type', validated.type)
      .eq('is_current', true)

    if (updateError) {
      console.error('Error updating previous documents:', updateError)
      // Continue - this is not critical
    }

    // ALGORITHM: Create new document record
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        passenger_id: validated.passenger_id,
        project_id: validated.project_id,
        type: validated.type,
        file_name: validated.file_name,
        file_path: validated.file_path,
        file_size: validated.file_size,
        is_current: true,
        uploaded_by: user.id
      })
      .select('id, type, file_name, created_at')
      .single()

    if (insertError) {
      console.error('Error creating document record:', insertError)
      
      // Clean up uploaded file
      await supabase.storage
        .from('flight-docs')
        .remove([validated.file_path])
        
      return { success: false, error: 'Failed to create document record' }
    }

    // Revalidate relevant pages
    revalidatePath('/a/queue')
    revalidatePath('/a/tour')
    revalidatePath('/c')

    return { 
      success: true, 
      data: document
    }

  } catch (error) {
    console.error('Error in uploadDocument:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Deletes a document file and database record
 * 
 * @description Removes document from storage and database. Only employees
 * can delete documents, and only non-current versions typically.
 * 
 * @param formData - Form data containing document_id
 * @returns Promise<ActionResult> Success/error result
 * 
 * @business_rule Only employees can delete documents
 * @business_rule Deletion removes both storage file and database record
 */
export async function deleteDocument(formData: FormData): Promise<ActionResult> {
  try {
    // Authenticate user
    const user = await getServerUser()
    if (!user || user.role === 'client') {
      return { success: false, error: 'Unauthorized - only employees can delete documents' }
    }

    // Validate input
    const rawData = {
      document_id: formData.get('document_id')
    }
    
    const validated = deleteDocumentSchema.parse(rawData)
    const supabase = await createServerClient()

    // Get document details for file deletion
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_path, file_name')
      .eq('id', validated.document_id)
      .single()

    if (fetchError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('flight-docs')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue - database cleanup is more important
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', validated.document_id)

    if (deleteError) {
      console.error('Error deleting document record:', deleteError)
      return { success: false, error: 'Failed to delete document record' }
    }

    // Revalidate relevant pages
    revalidatePath('/a/queue')
    revalidatePath('/a/tour')
    revalidatePath('/c')

    return { 
      success: true, 
      data: { document_id: validated.document_id, file_name: document.file_name }
    }

  } catch (error) {
    console.error('Error in deleteDocument:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Gets a signed URL for downloading a document
 * 
 * @description Creates a temporary signed URL for secure document access.
 * Respects access permissions based on user role.
 * 
 * @param documentId - Document ID to generate URL for
 * @returns Promise<ActionResult> Success/error result with signed URL
 * 
 * @business_rule Employees can access all documents
 * @business_rule Clients can only access current documents for their assignments
 */
export async function getDocumentUrl(documentId: string): Promise<ActionResult> {
  try {
    const user = await getServerUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createServerClient()

    // Get document details
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select(`
        id,
        file_path,
        file_name,
        is_current,
        passenger:tour_personnel!passenger_id (
          id,
          project:projects!project_id (
            id,
            artist:artists!artist_id (
              id,
              artist_assignments!inner (
                user_id
              )
            )
          )
        )
      `)
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // BUSINESS_RULE: Check access permissions
    if (user.role === 'client') {
      // Clients can only access current documents for their assigned artists
      if (!document.is_current) {
        return { success: false, error: 'Access denied - document not current' }
      }

      const hasAccess = document.passenger.project.artist.artist_assignments
        .some((assignment: any) => assignment.user_id === user.id)

      if (!hasAccess) {
        return { success: false, error: 'Access denied - not assigned to this artist' }
      }
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('flight-docs')
      .createSignedUrl(document.file_path, 3600)

    if (urlError || !signedUrl) {
      console.error('Error creating signed URL:', urlError)
      return { success: false, error: 'Failed to generate download URL' }
    }

    return { 
      success: true, 
      data: { 
        url: signedUrl.signedUrl,
        fileName: document.file_name,
        expiresIn: 3600
      }
    }

  } catch (error) {
    console.error('Error in getDocumentUrl:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
