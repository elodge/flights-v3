/**
 * @fileoverview Personnel Import Dialog Component
 * 
 * @description Dialog for importing personnel data from Excel files with drag & drop,
 * validation, preview, and inline editing capabilities.
 * 
 * @access Employee only (agent/admin)
 * @security Client-side file parsing only - no uploads to storage
 * @business_rule Supports .xlsx/.xls files with 500 row limit and strict validation
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  X,
  Edit3
} from 'lucide-react'
import { downloadPersonnelTemplate } from '@/lib/personnel-import/template'
import { parsePersonnelExcel, formatFileSize } from '@/lib/personnel-import/parser'
import { 
  PersonnelData, 
  validateAllPersonnelRows, 
  getValidationSummary,
  RowValidation,
  normalizeName,
  validateParty,
  parseDate
} from '@/lib/personnel-import/validation'
import { importPersonnel } from '@/app/(admin)/admin/users/_actions/personnel-import'
import { PersonnelPreviewTable } from './personnel-preview-table'

interface PersonnelImportDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

/**
 * Personnel Import Dialog Component
 * 
 * @description Main dialog for importing personnel from Excel files
 * @param projectId Project ID to import personnel for
 * @param isOpen Whether dialog is open
 * @param onClose Callback to close dialog
 * 
 * @access Employee only (agent/admin)
 * @security Client-side file processing only
 */
export function PersonnelImportDialog({ 
  projectId, 
  isOpen, 
  onClose 
}: PersonnelImportDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // CONTEXT: Dialog state management
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [personnelData, setPersonnelData] = useState<PersonnelData[]>([])
  const [validations, setValidations] = useState<RowValidation[]>([])
  const [isImporting, setIsImporting] = useState(false)

  // CONTEXT: Reset dialog state when closed
  const handleClose = useCallback(() => {
    setStep('upload')
    setFile(null)
    setPersonnelData([])
    setValidations([])
    setIsImporting(false)
    onClose()
  }, [onClose])

  // CONTEXT: Download template functionality
  const handleDownloadTemplate = useCallback(() => {
    try {
      downloadPersonnelTemplate()
      toast.success('Template downloaded successfully')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Failed to download template')
    }
  }, [])

  // CONTEXT: File selection and parsing
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return

    // CONTEXT: Validate file type
    const validExtensions = ['.xlsx', '.xls']
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Please select an Excel file (.xlsx or .xls)')
      return
    }

    setFile(selectedFile)
    setIsImporting(true)

    try {
      // CONTEXT: Parse Excel file
      const parseResult = await parsePersonnelExcel(selectedFile)
      
      if (!parseResult.success) {
        toast.error(parseResult.errors[0] || 'Failed to parse Excel file')
        setFile(null)
        setIsImporting(false)
        return
      }

      // CONTEXT: Validate parsed data
      const validationResults = validateAllPersonnelRows(parseResult.data)
      setPersonnelData(parseResult.data)
      setValidations(validationResults)
      setStep('preview')

      // CONTEXT: Show warnings if any
      if (parseResult.warnings.length > 0) {
        parseResult.warnings.forEach(warning => {
          toast.warning(warning)
        })
      }

      const summary = getValidationSummary(validationResults)
      if (summary.totalErrors > 0) {
        toast.error(`Found ${summary.totalErrors} errors that must be fixed before importing`)
      } else {
        toast.success(`Parsed ${summary.totalRows} rows successfully`)
      }

    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Failed to process Excel file')
      setFile(null)
    } finally {
      setIsImporting(false)
    }
  }, [])

  // CONTEXT: Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // CONTEXT: File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // CONTEXT: Update personnel data and re-validate
  const handleDataUpdate = useCallback((updatedData: PersonnelData[]) => {
    setPersonnelData(updatedData)
    const newValidations = validateAllPersonnelRows(updatedData)
    setValidations(newValidations)
  }, [])

  // CONTEXT: Import personnel data
  const handleImport = useCallback(async () => {
    if (personnelData.length === 0) return

    setIsImporting(true)
    setStep('importing')

    try {
      const result = await importPersonnel(projectId, personnelData)
      
      if (result.success) {
        toast.success(
          `Successfully imported ${result.insertedCount} people${result.skippedCount > 0 ? ` • ${result.skippedCount} duplicates skipped` : ''}`
        )
        
        // CONTEXT: Show warnings if any
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            toast.warning(warning)
          })
        }
        
        handleClose()
        router.refresh()
      } else {
        throw new Error('Import failed')
      }
    } catch (error) {
      console.error('Error importing personnel:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import personnel')
      setStep('preview')
    } finally {
      setIsImporting(false)
    }
  }, [projectId, personnelData, handleClose, router])

  // CONTEXT: Get validation summary
  const validationSummary = validations.length > 0 ? getValidationSummary(validations) : null
  const canImport = validationSummary && validationSummary.totalErrors === 0 && personnelData.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Personnel
          </DialogTitle>
          <DialogDescription>
            Import personnel data from an Excel file. Download the template first to ensure proper formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* CONTEXT: Template download section */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <h3 className="font-medium">Step 1: Download Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Download the Excel template with proper headers and sample data
                  </p>
                </div>
                <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <Separator />

              {/* CONTEXT: File upload section */}
              <div>
                <h3 className="font-medium mb-4">Step 2: Upload Excel File</h3>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {isImporting ? 'Processing file...' : 'Drop your Excel file here'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse for .xlsx or .xls files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maximum 500 rows per import
                    </p>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {file && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span className="font-medium">{file.name}</span>
                        <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* CONTEXT: Validation summary */}
              {validationSummary && (
                <Alert className={validationSummary.totalErrors > 0 ? 'border-destructive' : 'border-green-200 bg-green-50'}>
                  <div className="flex items-center gap-2">
                    {validationSummary.totalErrors > 0 ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <AlertDescription>
                      <div className="flex items-center gap-4">
                        <span>
                          {validationSummary.totalRows} rows • {validationSummary.validRows} valid
                        </span>
                        {validationSummary.totalErrors > 0 && (
                          <Badge variant="destructive">
                            {validationSummary.totalErrors} errors
                          </Badge>
                        )}
                        {validationSummary.totalWarnings > 0 && (
                          <Badge variant="secondary">
                            {validationSummary.totalWarnings} warnings
                          </Badge>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* CONTEXT: Preview table */}
              <PersonnelPreviewTable
                data={personnelData}
                validations={validations}
                onDataUpdate={handleDataUpdate}
              />
            </div>
          )}

          {step === 'importing' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Importing personnel data...</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {file && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                {file.name}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            
            {step === 'preview' && (
              <Button 
                onClick={handleImport}
                disabled={!canImport || isImporting}
                className="min-w-[120px]"
              >
                {isImporting ? 'Importing...' : `Import ${personnelData.length} People`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
