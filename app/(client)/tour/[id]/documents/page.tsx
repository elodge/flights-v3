/**
 * @fileoverview Client Tour Documents Page
 * 
 * @description Server component for viewing tour documents (read-only) for clients
 * @route /tour/[id]/documents
 * @access Client only
 * @security Uses RLS policies to show only documents for assigned artists
 * @database tour_documents table operations
 */

import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { ClientDocumentsContent } from '@/components/client/client-documents-content';

interface ClientDocumentsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Client Tour Documents Page
 * 
 * @description Displays read-only document view for clients assigned to the tour
 * @param params - Route parameters containing tour ID
 * @returns JSX.Element - Client document view page
 * @access Client only
 * @security Validates client access to tour through artist assignments
 * @database Queries tour_documents, projects, and artist_assignments tables
 * @example
 * ```tsx
 * // Accessible at /tour/123e4567-e89b-12d3-a456-426614174000/documents
 * <ClientDocumentsPage params={{ id: "123e4567-e89b-12d3-a456-426614174000" }} />
 * ```
 */
export default async function ClientDocumentsPage({ params }: ClientDocumentsPageProps) {
  const { id: projectId } = await params;

  // SECURITY: Create authenticated Supabase client
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    notFound();
  }

  // SECURITY: Verify user has client role
  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!me || me.role !== 'client') {
    notFound();
  }

  // DATABASE: Verify project exists and user has access through artist assignment
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      id, 
      name, 
      artist_id,
      artist:artists!projects_artist_id_fkey(
        id,
        name
      )
    `)
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // SECURITY: Verify client is assigned to this artist
  const { data: assignment } = await supabase
    .from('artist_assignments')
    .select('id')
    .eq('client_id', user.id)
    .eq('artist_id', project.artist_id)
    .single();

  if (!assignment) {
    notFound();
  }

  // DATABASE: Load latest documents per kind for this project (client view)
  // CONTEXT: tour_documents table exists but not in generated types
  // DATABASE: Using type assertion for missing table in generated types
  const { data: documents, error: documentsError } = await (supabase as any)
    .from('tour_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false });

  if (documentsError) {
    console.error('Error loading documents:', documentsError);
  }

  // CONTEXT: Filter to latest per kind for client view
  const latestPerKind = documents ? documents.reduce((acc: Record<string, any>, doc: any) => {
    if (!acc[doc.kind]) {
      acc[doc.kind] = doc;
    }
    return acc;
  }, {} as Record<string, any>) : {};

  const clientDocuments = Object.values(latestPerKind) as any[];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tour Documents</h1>
          <p className="text-muted-foreground">
            Documents for {project.name} by {project.artist?.name}
          </p>
        </div>
      </div>

      <ClientDocumentsContent 
        projectId={projectId}
        projectName={project.name}
        documents={clientDocuments}
      />
    </div>
  );
}
