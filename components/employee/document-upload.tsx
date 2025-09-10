/**
 * @fileoverview Document upload component for employee portal
 * 
 * @description Handles PDF document upload for flight-related documents
 * (itineraries, invoices) with drag-and-drop support and progress tracking.
 */

'use client'

import { useState, useRef, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, FileText, Loader2, X, CheckCircle } from 'lucide-react'
import { uploadDocument } from '@/lib/actions/document-actions'
import { toast } from 'sonner'

interface DocumentUploadProps {
  passengerId: string
  projectId: string
  onUploadComplete?: () => void
}

interface UploadFile {
  file: File
  type: 'itinerary' | 'invoice' | ''
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

/**
 * Document upload component for flight documents
 * 
 * @description Provides drag-and-drop PDF upload with type selection,
 * progress tracking, and batch upload capabilities. Enforces PDF-only
 * uploads and file size limits.
 * 
 * @param passengerId - UUID of the passenger for document association
 * @param projectId - UUID of the project for document association
 * @param onUploadComplete - Optional callback when upload completes successfully
 */
export function DocumentUpload({ passengerId, projectId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadFile[] = Array.from(selectedFiles)
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        file,
        type: '',
        status: 'pending'
      }))

    if (newFiles.length < selectedFiles.length) {
      const rejectedCount = selectedFiles.length - newFiles.length;
      toast.error(`File type error: ${rejectedCount} file${rejectedCount > 1 ? 's' : ''} rejected. Only PDF documents are allowed for passenger documents.`);
    }

    setFiles(prev => [...prev, ...newFiles])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const updateFileType = (index: number, type: 'itinerary' | 'invoice') => {
    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, type } : file
    ))
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFile = async (fileData: UploadFile, index: number) => {
    if (!fileData.type) {
      setFiles(prev => prev.map((file, i) => 
        i === index ? { ...file, status: 'error', error: 'Document type is required' } : file
      ))
      return
    }

    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, status: 'uploading' } : file
    ))

    const formData = new FormData()
    formData.append('file', fileData.file)
    formData.append('passenger_id', passengerId)
    formData.append('project_id', projectId)
    formData.append('type', fileData.type)

    const result = await uploadDocument(formData)

    if (result.success) {
      setFiles(prev => prev.map((file, i) => 
        i === index ? { ...file, status: 'success' } : file
      ))
      toast.success(`${fileData.type} uploaded successfully`)
    } else {
      setFiles(prev => prev.map((file, i) => 
        i === index ? { ...file, status: 'error', error: result.error } : file
      ))
      toast.error(`Upload failed for "${fileData.file.name}": ${result.error || 'An unexpected error occurred. Please try again.'}`)
    }
  }

  const handleUploadAll = () => {
    const readyFiles = files.filter(file => file.type && file.status === 'pending')
    
    if (readyFiles.length === 0) {
      toast.error('Upload preparation required: Please select document types (Itinerary or Invoice) for all files before uploading.')
      return
    }

    startTransition(async () => {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type && file.status === 'pending') {
          await uploadFile(file, i)
        }
      }

      // Check if all uploads completed successfully
      const successCount = files.filter(f => f.status === 'success').length
      if (successCount > 0 && onUploadComplete) {
        onUploadComplete()
      }
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const readyCount = files.filter(f => f.type && f.status === 'pending').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const successCount = files.filter(f => f.status === 'success').length

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">
            Drop PDF files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Upload itineraries and invoices (PDF only, max 50MB each)
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Files to Upload</h4>
            <div className="flex items-center space-x-2">
              {successCount > 0 && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {successCount} uploaded
                </Badge>
              )}
              {readyCount > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleUploadAll}
                  disabled={isPending || uploadingCount > 0}
                >
                  {uploadingCount > 0 && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Upload {readyCount} files
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {files.map((fileData, index) => (
              <div 
                key={`${fileData.file.name}-${index}`}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(fileData.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fileData.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileData.file.size)}
                  </p>
                  {fileData.error && (
                    <p className="text-xs text-red-500 mt-1">
                      {fileData.error}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <Select
                    value={fileData.type}
                    onValueChange={(value: 'itinerary' | 'invoice') => 
                      updateFileType(index, value)
                    }
                    disabled={fileData.status !== 'pending'}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="itinerary">Itinerary</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={fileData.status === 'uploading'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
