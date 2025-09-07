/**
 * @fileoverview Client Documents Content Component
 * 
 * @description Client component for viewing tour documents (read-only) with download functionality
 * @access Client only
 * @security Uses server actions for document access
 * @database tour_documents table operations
 */

'use client';

import { useState } from 'react';
import { FileText, Download, Calendar, User, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createSignedDownloadURL } from '@/app/(shared)/documents/_actions';

interface TourDocument {
  id: string;
  project_id: string;
  leg_id?: string;
  passenger_id?: string;
  kind: 'itinerary' | 'invoice' | 'eticket' | 'other';
  title: string;
  file_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface ClientDocumentsContentProps {
  projectId: string;
  projectName: string;
  documents: TourDocument[];
}

/**
 * Client Documents Content Component
 * 
 * @description Provides read-only document view with download functionality for clients
 * @param projectId - UUID of the project
 * @param projectName - Name of the project for display
 * @param documents - List of documents to display (latest per kind)
 * @returns JSX.Element - Read-only document interface
 * @access Client only
 * @security All operations use server actions with proper authorization
 * @database tour_documents table operations
 * @example
 * ```tsx
 * <ClientDocumentsContent 
 *   projectId="123e4567-e89b-12d3-a456-426614174000"
 *   projectName="Taylor Swift Tour"
 *   documents={documents}
 * />
 * ```
 */
export function ClientDocumentsContent({ 
  projectId, 
  projectName, 
  documents 
}: ClientDocumentsContentProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  // CONTEXT: Handle document download
  const handleDownload = async (document: TourDocument) => {
    setDownloading(document.id);
    try {
      const signedUrl = await createSignedDownloadURL(document.file_path);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download "${document.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloading(null);
    }
  };

  // CONTEXT: Handle document view
  const handleView = async (document: TourDocument) => {
    try {
      const signedUrl = await createSignedDownloadURL(document.file_path);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('View error:', error);
      toast.error(`Failed to view "${document.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // CONTEXT: Get badge variant for document kind
  const getKindBadgeVariant = (kind: string) => {
    switch (kind) {
      case 'itinerary': return 'default';
      case 'invoice': return 'secondary';
      case 'eticket': return 'outline';
      case 'other': return 'destructive';
      default: return 'outline';
    }
  };

  // CONTEXT: Get icon for document kind
  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'itinerary': return '📋';
      case 'invoice': return '🧾';
      case 'eticket': return '🎫';
      case 'other': return '📄';
      default: return '📄';
    }
  };

  // CONTEXT: Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* CONTEXT: Documents grid */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Documents Available</h3>
            <p className="text-muted-foreground">
              Documents for this tour will appear here once they are uploaded by your tour team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getKindIcon(document.kind)}</span>
                    <div>
                      <CardTitle className="text-lg">{document.title}</CardTitle>
                      <Badge variant={getKindBadgeVariant(document.kind)} className="mt-1">
                        {document.kind}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Uploaded {formatDate(document.uploaded_at)}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleView(document)}
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button 
                    onClick={() => handleDownload(document)}
                    disabled={downloading === document.id}
                    className="flex-1"
                  >
                    {downloading === document.id ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CONTEXT: Information section */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Document Types:</strong>
          </p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Itinerary:</strong> Tour schedule and travel details</li>
            <li>• <strong>Invoice:</strong> Billing and payment information</li>
            <li>• <strong>E-Ticket:</strong> Flight and travel tickets</li>
            <li>• <strong>Other:</strong> Additional tour-related documents</li>
          </ul>
          <p className="pt-2">
            Only the latest version of each document type is shown. If you need access to older versions, 
            please contact your tour team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}