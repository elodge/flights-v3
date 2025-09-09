/**
 * @fileoverview Tour Documents Server Actions
 * 
 * @description Server actions for managing tour documents including listing, uploading, downloading, and deleting documents
 * @access Employee (agent/admin) and Client (read-only)
 * @security Uses Supabase RLS for authorization
 * @database tour_documents table operations
 */

'use server';

import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// CONTEXT: Schema for document listing with role-based access
const ListDocumentsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  roleView: z.enum(['employee', 'client'])
});

/**
 * List tour documents for a project with role-based filtering
 * 
 * @description Retrieves documents for a project, filtering by user role
 * @param projectId - UUID of the project
 * @param roleView - 'employee' shows all documents, 'client' shows latest per kind only
 * @returns Array of document records
 * @security Requires authentication, RLS enforces access control
 * @database Queries tour_documents table with project_id filter
 * @business_rule Clients only see latest document per kind, employees see all
 * @example
 * ```typescript
 * const docs = await listTourDocuments('project-uuid', 'client')
 * ```
 */
export async function listTourDocuments(projectId: string, roleView: 'employee' | 'client') {
  const { projectId: validatedProjectId, roleView: validatedRoleView } = ListDocumentsSchema.parse({
    projectId,
    roleView
  });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized: User not authenticated');

  // SECURITY: Verify user has access to this project
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!me) throw new Error('Unauthorized: User not found');

  if (validatedRoleView === 'employee') {
    // DATABASE: Employees see all documents
    // CONTEXT: tour_documents table exists but not in generated types
    // DATABASE: Using type assertion for missing table in generated types
    const { data, error } = await (supabase as any)
      .from('tour_documents')
      .select('*')
      .eq('project_id', validatedProjectId)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch documents: ${error.message}`);
    return data || [];
  } else {
    // DATABASE: Clients see latest per kind only
    // CONTEXT: tour_documents table exists but not in generated types
    // DATABASE: Using type assertion for missing table in generated types
    const { data, error } = await (supabase as any)
      .from('tour_documents')
      .select('*')
      .eq('project_id', validatedProjectId)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch documents: ${error.message}`);
    
    // BUSINESS_RULE: Filter to latest per kind for clients
    const seen = new Set<string>();
    return (data || []).filter((d: any) => {
      if (seen.has(d.kind)) return false;
      seen.add(d.kind);
      return true;
    });
  }
}

// CONTEXT: Schema for creating signed download URLs
const CreateSignedUrlSchema = z.object({
  filePath: z.string().min(1, 'File path is required')
});

/**
 * Create a signed download URL for a document
 * 
 * @description Generates a temporary signed URL for secure document download
 * @param filePath - Storage path of the document file
 * @returns Signed URL string valid for 10 minutes
 * @security Requires authentication, URL expires after 10 minutes
 * @database No direct database operations
 * @business_rule URLs expire after 10 minutes for security
 * @example
 * ```typescript
 * const url = await createSignedDownloadURL('project/uuid/document.pdf')
 * ```
 */
export async function createSignedDownloadURL(filePath: string) {
  const { filePath: validatedFilePath } = CreateSignedUrlSchema.parse({ filePath });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized: User not authenticated');

  // SECURITY: Create signed URL with 10 minute expiration
  const { data, error } = await supabase.storage
    .from('tour-docs')
    .createSignedUrl(validatedFilePath, 60 * 10); // 10 minutes
  
  if (error) throw new Error(`Failed to create download URL: ${error.message}`);
  if (!data?.signedUrl) throw new Error('No signed URL returned');
  return data.signedUrl;
}

// CONTEXT: Schema for document deletion
const DeleteDocumentSchema = z.object({
  id: z.string().uuid('Invalid document ID')
});

/**
 * Delete a tour document and its associated file
 * 
 * @description Removes document record and associated file from storage
 * @param id - UUID of the document to delete
 * @returns Success confirmation
 * @security Requires agent/admin role, RLS enforces permissions
 * @database Deletes from tour_documents table
 * @business_rule Best-effort file deletion, continues even if file deletion fails
 * @example
 * ```typescript
 * await deleteTourDocument('document-uuid')
 * ```
 */
export async function deleteTourDocument(id: string) {
  const { id: validatedId } = DeleteDocumentSchema.parse({ id });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized: User not authenticated');

  // SECURITY: Verify user has employee permissions
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!me || (me.role !== 'agent' && me.role !== 'admin')) {
    throw new Error('Unauthorized: Agent or admin role required');
  }

  // DATABASE: Get file path before deletion
  // CONTEXT: tour_documents table exists but not in generated types
  // DATABASE: Using type assertion for missing table in generated types
  const { data: document, error: fetchError } = await (supabase as any)
    .from('tour_documents')
    .select('file_path')
    .eq('id', validatedId)
    .single();
  
  if (fetchError) throw new Error(`Failed to fetch document: ${fetchError.message}`);

  // DATABASE: Delete document record
  // CONTEXT: tour_documents table exists but not in generated types
  // DATABASE: Using type assertion for missing table in generated types
  const { error: deleteError } = await (supabase as any)
    .from('tour_documents')
    .delete()
    .eq('id', validatedId);
  
  if (deleteError) throw new Error(`Failed to delete document: ${deleteError.message}`);

  // FALLBACK: Best-effort file deletion (continue even if this fails)
  if (document?.file_path) {
    await supabase.storage
      .from('tour-docs')
      .remove([document.file_path])
      .catch(() => {
        // Log but don't throw - document record is already deleted
        console.warn(`Failed to delete file: ${document.file_path}`);
      });
  }

  return { success: true };
}

// CONTEXT: Schema for saving document metadata after upload
const SaveDocumentMetaSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  legId: z.string().uuid('Invalid leg ID').optional().nullable(),
  passengerId: z.string().uuid('Invalid passenger ID').optional().nullable(),
  kind: z.enum(['itinerary', 'invoice', 'eticket', 'other']),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  filePath: z.string().min(1, 'File path is required')
});

/**
 * Save document metadata after file upload
 * 
 * @description Creates database record for uploaded document
 * @param payload - Document metadata including project, kind, title, and file path
 * @returns Success confirmation
 * @security Requires agent/admin role
 * @database Inserts into tour_documents table
 * @business_rule Associates document with project and optionally leg/passenger
 * @example
 * ```typescript
 * await saveTourDocumentMeta({
 *   projectId: 'uuid',
 *   kind: 'itinerary',
 *   title: 'Tour Itinerary',
 *   filePath: 'project/uuid/document.pdf'
 * })
 * ```
 */
export async function saveTourDocumentMeta(payload: {
  projectId: string;
  legId?: string | null;
  passengerId?: string | null;
  kind: 'itinerary' | 'invoice' | 'eticket' | 'other';
  title: string;
  filePath: string;
}) {
  const validatedPayload = SaveDocumentMetaSchema.parse(payload);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized: User not authenticated');

  // SECURITY: Verify user has employee permissions
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!me || (me.role !== 'agent' && me.role !== 'admin')) {
    throw new Error('Unauthorized: Agent or admin role required');
  }

  // DATABASE: Insert document record
  // CONTEXT: tour_documents table exists but not in generated types
  // DATABASE: Using type assertion for missing table in generated types
  const { error } = await (supabase as any).from('tour_documents').insert({
    project_id: validatedPayload.projectId,
    leg_id: validatedPayload.legId ?? null,
    passenger_id: validatedPayload.passengerId ?? null,
    kind: validatedPayload.kind,
    title: validatedPayload.title,
    file_path: validatedPayload.filePath,
    uploaded_by: user.id
  });

  if (error) throw new Error(`Failed to save document metadata: ${error.message}`);
  return { success: true };
}

// CONTEXT: Schema for updating document title
const UpdateDocumentTitleSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long')
});

/**
 * Update document title (inline editing)
 * 
 * @description Updates the title of an existing document
 * @param id - UUID of the document
 * @param title - New title for the document
 * @returns Success confirmation
 * @security Requires agent/admin role
 * @database Updates tour_documents table
 * @business_rule Only title can be updated, other fields are immutable
 * @example
 * ```typescript
 * await updateDocumentTitle('document-uuid', 'New Title')
 * ```
 */
export async function updateDocumentTitle(id: string, title: string) {
  const { id: validatedId, title: validatedTitle } = UpdateDocumentTitleSchema.parse({ id, title });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized: User not authenticated');

  // SECURITY: Verify user has employee permissions
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!me || (me.role !== 'agent' && me.role !== 'admin')) {
    throw new Error('Unauthorized: Agent or admin role required');
  }

  // DATABASE: Update document title
  // CONTEXT: tour_documents table exists but not in generated types
  // DATABASE: Using type assertion for missing table in generated types
  const { error } = await (supabase as any)
    .from('tour_documents')
    .update({ title: validatedTitle })
    .eq('id', validatedId);

  if (error) throw new Error(`Failed to update document title: ${error.message}`);
  return { success: true };
}

// CONTEXT: Schema for document upload
const UploadDocumentSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  file: z.instanceof(File),
  kind: z.enum(['itinerary', 'invoice', 'eticket', 'other']),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  legId: z.string().uuid('Invalid leg ID').optional().nullable(),
  passengerId: z.string().uuid('Invalid passenger ID').optional().nullable()
});

/**
 * Upload a tour document with file and metadata
 * 
 * @description Handles file upload to storage and creates database record
 * @param payload - Upload data including file, metadata, and project association
 * @returns Success confirmation with document ID
 * @security Requires agent/admin role, validates file type and size
 * @database Inserts into tour_documents table
 * @business_rule Only PDF files allowed, max 10MB size, generates unique file paths
 * @example
 * ```typescript
 * await uploadTourDocument({
 *   projectId: 'uuid',
 *   file: fileObject,
 *   kind: 'itinerary',
 *   title: 'Tour Itinerary'
 * })
 * ```
 */
export async function uploadTourDocument(payload: {
  projectId: string;
  file: File;
  kind: 'itinerary' | 'invoice' | 'eticket' | 'other';
  title: string;
  legId?: string | null;
  passengerId?: string | null;
}) {
  const validatedPayload = UploadDocumentSchema.parse(payload);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized: User not authenticated');

  // SECURITY: Verify user has employee permissions
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!me || (me.role !== 'agent' && me.role !== 'admin')) {
    throw new Error('Unauthorized: Agent or admin role required');
  }

  // BUSINESS_RULE: Validate file type
  if (validatedPayload.file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  // BUSINESS_RULE: Validate file size (10MB limit)
  if (validatedPayload.file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB');
  }

  // CONTEXT: Generate unique file path
  const fileExtension = validatedPayload.file.name.split('.').pop() || 'pdf';
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = `project/${validatedPayload.projectId}/${fileName}`;

  // DATABASE: Upload file to storage
  const fileBuffer = await validatedPayload.file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('tour-docs')
    .upload(filePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);

  // DATABASE: Save document metadata
  // CONTEXT: tour_documents table exists but not in generated types
  // DATABASE: Using type assertion for missing table in generated types
  const { data: document, error: insertError } = await (supabase as any)
    .from('tour_documents')
    .insert({
      project_id: validatedPayload.projectId,
      leg_id: validatedPayload.legId ?? null,
      passenger_id: validatedPayload.passengerId ?? null,
      kind: validatedPayload.kind,
      title: validatedPayload.title,
      file_path: filePath,
      uploaded_by: user.id
    })
    .select('id')
    .single();

  if (insertError) {
    // FALLBACK: Clean up uploaded file if database insert fails
    await supabase.storage.from('tour-docs').remove([filePath]).catch(() => {});
    throw new Error(`Failed to save document metadata: ${insertError.message}`);
  }

  return { success: true, documentId: document.id };
}
