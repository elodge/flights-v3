/**
 * @fileoverview Tour Document Uploader Component
 * 
 * @description Client component for uploading tour documents with drag-and-drop functionality
 * @access Employee (agent/admin) only
 * @security Uses server actions for file upload and validation
 * @database tour_documents table operations
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { uploadTourDocument } from '@/app/(shared)/documents/_actions';

interface TourDocUploaderProps {
  projectId: string;
  onUploadSuccess?: () => void;
}

interface UploadFile {
  file: File;
  kind: 'itinerary' | 'invoice' | 'eticket' | 'other';
  title: string;
  legId?: string;
  passengerId?: string;
}

/**
 * Tour Document Uploader Component
 * 
 * @description Provides drag-and-drop file upload with validation and metadata input
 * @param projectId - UUID of the project to upload documents to
 * @param onUploadSuccess - Callback function called after successful upload
 * @returns JSX.Element - Upload interface with drag-and-drop zone
 * @access Employee (agent/admin) only
 * @security Validates file types and sizes client-side before server upload
 * @example
 * ```tsx
 * <TourDocUploader 
 *   projectId="123e4567-e89b-12d3-a456-426614174000"
 *   onUploadSuccess={() => router.refresh()}
 * />
 * ```
 */
export function TourDocUploader({ projectId, onUploadSuccess }: TourDocUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CONTEXT: Handle file selection from input or drag-and-drop
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadFile[] = [];
    
    // BUSINESS_RULE: Validate each file before adding to upload list
    Array.from(files).forEach(file => {
      // SECURITY: Only allow PDF files
      if (file.type !== 'application/pdf') {
        toast.error(`File "${file.name}" is not a PDF. Only PDF files are allowed.`);
        return;
      }

      // BUSINESS_RULE: Limit file size to 50MB
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 50MB.`);
        return;
      }

      newFiles.push({
        file,
        kind: 'other',
        title: file.name.replace('.pdf', '')
      });
    });

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  // CONTEXT: Handle drag and drop events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // CONTEXT: Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  // CONTEXT: Update file metadata
  const updateFileMetadata = useCallback((index: number, updates: Partial<UploadFile>) => {
    setUploadFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, ...updates } : file
    ));
  }, []);

  // CONTEXT: Remove file from upload list
  const removeFile = useCallback((index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // CONTEXT: Upload all files to server
  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // DATABASE: Upload each file sequentially to avoid overwhelming the server
      for (const uploadFile of uploadFiles) {
        try {
          await uploadTourDocument({
            projectId,
            file: uploadFile.file,
            kind: uploadFile.kind,
            title: uploadFile.title,
            legId: uploadFile.legId,
            passengerId: uploadFile.passengerId
          });
          successCount++;
        } catch (error) {
          console.error('Upload error:', error);
          errorCount++;
          toast.error(`Failed to upload "${uploadFile.file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // CONTEXT: Show summary toast and reset state
      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}`);
        setUploadFiles([]);
        onUploadSuccess?.();
      }

      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} document${errorCount > 1 ? 's' : ''}`);
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadFiles, projectId, onUploadSuccess]);

  return (
    <div className="space-y-4">
      {/* CONTEXT: Drag and drop zone */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Tour Documents</h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop PDF files here, or click to browse
          </p>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* CONTEXT: File upload list with metadata editing */}
      {uploadFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Files to Upload ({uploadFiles.length})</h4>
          {uploadFiles.map((uploadFile, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{uploadFile.file.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Document Type</label>
                      <select
                        value={uploadFile.kind}
                        onChange={(e) => updateFileMetadata(index, { 
                          kind: e.target.value as UploadFile['kind'] 
                        })}
                        className="w-full mt-1 p-2 border rounded-md"
                      >
                        <option value="itinerary">Itinerary</option>
                        <option value="invoice">Invoice</option>
                        <option value="eticket">E-Ticket</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={uploadFile.title}
                        onChange={(e) => updateFileMetadata(index, { title: e.target.value })}
                        className="w-full mt-1 p-2 border rounded-md"
                        placeholder="Document title"
                      />
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="ml-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setUploadFiles([])}
              disabled={isUploading}
            >
              Clear All
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || uploadFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </>
              ) : (
                `Upload ${uploadFiles.length} Document${uploadFiles.length > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* CONTEXT: Upload guidelines */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Upload Guidelines:</strong> Only PDF files are accepted. Maximum file size is 10MB. 
          Document types help organize files for clients and employees.
        </AlertDescription>
      </Alert>
    </div>
  );
}
