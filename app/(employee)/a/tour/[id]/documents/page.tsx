/**
 * @fileoverview Employee Tour Documents Page
 * 
 * @description Server component for managing tour documents - upload, list, delete functionality
 * @route /a/tour/[id]/documents
 * @access Employee (agent/admin) only
 * @security Uses RLS policies for document access control
 * @database tour_documents table operations
 */

import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { TourDocumentsContent } from '@/components/employee/tour-documents-content';

interface TourDocumentsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Employee Tour Documents Page
 * 
 * @description Displays document management interface for a specific tour
 * @param params - Route parameters containing tour ID
 * @returns JSX.Element - Document management page
 * @access Employee (agent/admin) only
 * @security Validates user access to tour before displaying documents
 * @database Queries tour_documents and projects tables
 * @example
 * ```tsx
 * // Accessible at /a/tour/123e4567-e89b-12d3-a456-426614174000/documents
 * <TourDocumentsPage params={{ id: "123e4567-e89b-12d3-a456-426614174000" }} />
 * ```
 */
export default async function TourDocumentsPage({ params }: TourDocumentsPageProps) {
  const { id: projectId } = await params;

  // SECURITY: Create authenticated Supabase client
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    notFound();
  }

  // SECURITY: Verify user has employee role
  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!me || (me.role !== 'agent' && me.role !== 'admin')) {
    notFound();
  }

  // DATABASE: Verify project exists and user has access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, artist_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // DATABASE: Load all documents for this project
  // CONTEXT: tour_documents table exists but not in generated types
  // DATABASE: Using type assertion for missing table in generated types
  const { data: documents, error: documentsError } = await (supabase as any)
    .from('tour_documents')
    .select(`
      *,
      uploaded_by_user:users!uploaded_by(
        id,
        full_name
      )
    `)
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false });

  if (documentsError) {
    console.error('Error loading documents:', documentsError);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tour Documents</h1>
          <p className="text-muted-foreground">
            Manage documents for {project.name}
          </p>
        </div>
      </div>

      <TourDocumentsContent 
        projectId={projectId}
        projectName={project.name}
        initialDocuments={documents || []}
      />
    </div>
  );
}
