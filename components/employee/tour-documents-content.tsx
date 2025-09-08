/**
 * @fileoverview Employee Tour Documents Content Component
 * 
 * @description Client component for managing tour documents with upload, list, and delete functionality
 * @access Employee (agent/admin) only
 * @security Uses server actions for document operations
 * @database tour_documents table operations
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TourDocUploader } from '@/components/documents/TourDocUploader';
import { PDFViewer } from '@/components/documents/PDFViewer';
import { 
  listTourDocuments, 
  createSignedDownloadURL, 
  updateDocumentTitle, 
  deleteTourDocument 
} from '@/app/(shared)/documents/_actions';

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
  uploaded_by_user?: {
    id: string;
    full_name: string;
  };
}

interface TourDocumentsContentProps {
  projectId: string;
  projectName: string;
  initialDocuments: TourDocument[];
}

/**
 * Employee Tour Documents Content Component
 * 
 * @description Provides document management interface with upload, list, edit, and delete functionality
 * @param projectId - UUID of the project
 * @param projectName - Name of the project for display
 * @param initialDocuments - Initial list of documents to display
 * @returns JSX.Element - Document management interface
 * @access Employee (agent/admin) only
 * @security All operations use server actions with proper authorization
 * @database tour_documents table operations
 * @example
 * ```tsx
 * <TourDocumentsContent 
 *   projectId="123e4567-e89b-12d3-a456-426614174000"
 *   projectName="Taylor Swift Tour"
 *   initialDocuments={documents}
 * />
 * ```
 */
export function TourDocumentsContent({ 
  projectId, 
  projectName, 
  initialDocuments 
}: TourDocumentsContentProps) {
  const [documents, setDocuments] = useState<TourDocument[]>(initialDocuments);
  const [isPending, startTransition] = useTransition();
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const router = useRouter();

  // CONTEXT: Handle document upload success
  const handleUploadSuccess = () => {
    startTransition(async () => {
      try {
        const updatedDocuments = await listTourDocuments(projectId, 'employee');
        setDocuments(updatedDocuments);
        router.refresh();
      } catch (error) {
        console.error('Error refreshing documents:', error);
      }
    });
  };

  // CONTEXT: Handle document download
  const handleDownload = async (document: TourDocument) => {
    try {
      const signedUrl = await createSignedDownloadURL(document.file_path);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download "${document.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // CONTEXT: Get signed URL for viewing
  const getSignedUrl = async (document: TourDocument): Promise<string> => {
    if (signedUrls[document.id]) {
      return signedUrls[document.id];
    }
    
    try {
      const signedUrl = await createSignedDownloadURL(document.file_path);
      setSignedUrls(prev => ({ ...prev, [document.id]: signedUrl }));
      return signedUrl;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      toast.error('Failed to load document');
      throw error;
    }
  };

  // CONTEXT: Handle document title update
  const handleUpdateTitle = async (documentId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      await updateDocumentTitle(documentId, newTitle);
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, title: newTitle } : doc
      ));
      toast.success('Document title updated');
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to update title: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // CONTEXT: Handle document deletion
  const handleDelete = async (documentId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTourDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success(`Deleted "${title}"`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete "${title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // CONTEXT: Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-6">
      {/* CONTEXT: Upload section */}
      <div className="card-muted">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-lg font-medium">Upload Documents</h3>
        </div>
        <div className="p-4">
          <TourDocUploader 
            projectId={projectId}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      </div>

      {/* CONTEXT: Documents list */}
      <div className="card-muted">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-lg font-medium">Documents ({documents.length})</h3>
        </div>
        <div className="p-4">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload your first document using the form above</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{document.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getKindBadgeVariant(document.kind)}>
                        {document.kind}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {document.uploaded_by_user?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {new Date(document.uploaded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <PDFViewerButton
                          document={document}
                          onGetSignedUrl={getSignedUrl}
                        />
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        <EditDocumentDialog
                          document={document}
                          onUpdate={handleUpdateTitle}
                        />
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(document.id, document.title)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Edit Document Dialog Component
 * 
 * @description Dialog for editing document title and type
 * @param document - Document to edit
 * @param onUpdate - Callback function for title updates
 * @returns JSX.Element - Edit dialog
 */
function EditDocumentDialog({ 
  document, 
  onUpdate 
}: { 
  document: TourDocument; 
  onUpdate: (id: string, title: string) => void;
}) {
  const [title, setTitle] = useState(document.title);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onUpdate(document.id, title);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * PDF Viewer Button Component
 * 
 * @description Button that loads signed URL and opens PDF viewer
 * @param document - Document to view
 * @param onGetSignedUrl - Function to get signed URL for document
 * @returns JSX.Element - Button with PDF viewer functionality
 */
function PDFViewerButton({ 
  document, 
  onGetSignedUrl 
}: { 
  document: TourDocument; 
  onGetSignedUrl: (doc: TourDocument) => Promise<string>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const handleView = async () => {
    if (pdfUrl) {
      // Open PDF in new tab if we already have the URL
      window.open(pdfUrl, '_blank');
      return;
    }

    setIsLoading(true);
    try {
      const signedUrl = await onGetSignedUrl(document);
      setPdfUrl(signedUrl);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to load PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleView}
      disabled={isLoading}
      className="flex items-center gap-1"
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      View
    </Button>
  );
}
