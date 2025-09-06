/**
 * @fileoverview Personnel Preview Table Component
 * 
 * @description Table component for previewing and editing personnel import data
 * with inline editing, validation markers, and pagination.
 * 
 * @access Employee only (agent/admin)
 * @security Client-side editing only - no server calls until import
 * @business_rule Supports inline editing with real-time validation
 */

'use client'

import { useState, useCallback } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle,
  Edit3,
  Check,
  X
} from 'lucide-react'
import { 
  PersonnelData, 
  RowValidation, 
  validateAllPersonnelRows,
  normalizeName,
  validateParty,
  parseDate
} from '@/lib/personnel-import/validation'

interface PersonnelPreviewTableProps {
  data: PersonnelData[]
  validations: RowValidation[]
  onDataUpdate: (data: PersonnelData[]) => void
}

/**
 * Personnel Preview Table Component
 * 
 * @description Table for previewing and editing personnel import data
 * @param data Personnel data array
 * @param validations Validation results for each row
 * @param onDataUpdate Callback when data is updated
 * 
 * @access Employee only (agent/admin)
 * @security Client-side editing only
 */
export function PersonnelPreviewTable({ 
  data, 
  validations, 
  onDataUpdate 
}: PersonnelPreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCell, setEditingCell] = useState<{ row: number; field: keyof PersonnelData } | null>(null)
  const [editValue, setEditValue] = useState('')
  
  const rowsPerPage = 20
  const totalPages = Math.ceil(data.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const currentData = data.slice(startIndex, endIndex)
  const currentValidations = validations.slice(startIndex, endIndex)

  // CONTEXT: Handle cell edit start
  const handleEditStart = useCallback((rowIndex: number, field: keyof PersonnelData) => {
    const actualRowIndex = startIndex + rowIndex
    setEditingCell({ row: actualRowIndex, field })
    setEditValue(String(data[actualRowIndex][field] || ''))
  }, [startIndex, data])

  // CONTEXT: Handle cell edit save
  const handleEditSave = useCallback(() => {
    if (!editingCell) return

    const newData = [...data]
    const { row, field } = editingCell

    // CONTEXT: Apply field-specific transformations
    let processedValue = editValue.trim()
    
    if (field === 'fullName') {
      processedValue = normalizeName(processedValue)
    } else if (field === 'party') {
      const validParty = validateParty(processedValue)
      if (validParty) {
        processedValue = validParty
      }
    } else if (field === 'passportExpiry' || field === 'dateOfBirth') {
      const parsedDate = parseDate(processedValue)
      if (parsedDate) {
        processedValue = parsedDate
      } else if (processedValue) {
        // Keep original value if parsing fails - validation will catch it
        processedValue = editValue.trim()
      }
    }

    newData[row] = {
      ...newData[row],
      [field]: processedValue || undefined
    }

    onDataUpdate(newData)
    setEditingCell(null)
    setEditValue('')
  }, [editingCell, editValue, data, onDataUpdate])

  // CONTEXT: Handle cell edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  // CONTEXT: Handle key press in edit mode
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleEditCancel()
    }
  }, [handleEditSave, handleEditCancel])

  // CONTEXT: Get validation errors for a specific field
  const getFieldErrors = useCallback((rowIndex: number, field: string) => {
    const validation = currentValidations[rowIndex]
    if (!validation) return []
    
    return [
      ...validation.errors.filter(e => e.field === field),
      ...validation.warnings.filter(w => w.field === field)
    ]
  }, [currentValidations])

  // CONTEXT: Render editable cell
  const renderEditableCell = useCallback((
    rowIndex: number, 
    field: keyof PersonnelData, 
    value: string | undefined,
    validation: RowValidation
  ) => {
    const actualRowIndex = startIndex + rowIndex
    const isEditing = editingCell?.row === actualRowIndex && editingCell?.field === field
    const fieldErrors = getFieldErrors(rowIndex, field)
    const hasErrors = fieldErrors.some(e => e.type === 'error')
    const hasWarnings = fieldErrors.some(e => e.type === 'warning')

    if (isEditing) {
      if (field === 'party') {
        return (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select party" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A Party">A Party</SelectItem>
              <SelectItem value="B Party">B Party</SelectItem>
              <SelectItem value="C Party">C Party</SelectItem>
              <SelectItem value="D Party">D Party</SelectItem>
            </SelectContent>
          </Select>
        )
      } else if (field === 'notes') {
        return (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[60px]"
            autoFocus
          />
        )
      } else {
        return (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            className="h-8"
            autoFocus
          />
        )
      }
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`flex-1 ${hasErrors ? 'text-destructive' : hasWarnings ? 'text-orange-600' : ''}`}>
          {value || '-'}
        </span>
        
        {fieldErrors.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {hasErrors ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {fieldErrors.map((error, index) => (
                    <div key={index} className="text-xs">
                      {error.message}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => handleEditStart(rowIndex, field)}
        >
          <Edit3 className="h-3 w-3" />
        </Button>
      </div>
    )
  }, [editingCell, editValue, startIndex, getFieldErrors, handleEditStart, handleKeyPress])

  // CONTEXT: Render row status badge
  const renderRowStatus = useCallback((validation: RowValidation) => {
    if (validation.errors.length > 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
        </Badge>
      )
    } else if (validation.warnings.length > 0) {
      return (
        <Badge variant="secondary" className="text-xs">
          {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
          Valid
        </Badge>
      )
    }
  }, [])

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data to preview
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* CONTEXT: Pagination controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length} rows
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* CONTEXT: Data table */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="min-w-[150px]">Full Name*</TableHead>
              <TableHead className="min-w-[100px]">Party*</TableHead>
              <TableHead className="min-w-[150px]">Email</TableHead>
              <TableHead className="min-w-[120px]">Phone</TableHead>
              <TableHead className="min-w-[120px]">Passport #</TableHead>
              <TableHead className="min-w-[100px]">Passport Expiry</TableHead>
              <TableHead className="min-w-[100px]">Date of Birth</TableHead>
              <TableHead className="min-w-[120px]">Dietary</TableHead>
              <TableHead className="min-w-[100px]">Seat Pref</TableHead>
              <TableHead className="min-w-[120px]">FF Numbers</TableHead>
              <TableHead className="min-w-[150px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((row, index) => {
              const validation = currentValidations[index]
              const actualRowIndex = startIndex + index
              
              return (
                <TableRow key={actualRowIndex} className="group">
                  <TableCell className="font-mono text-xs">
                    {actualRowIndex + 1}
                  </TableCell>
                  <TableCell>
                    {renderRowStatus(validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'fullName', row.fullName, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'party', row.party, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'email', row.email, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'phone', row.phone, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'passportNumber', row.passportNumber, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'passportExpiry', row.passportExpiry, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'dateOfBirth', row.dateOfBirth, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'dietaryRestrictions', row.dietaryRestrictions, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'seatPreference', row.seatPreference, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'frequentFlyerNumbers', row.frequentFlyerNumbers, validation)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(index, 'notes', row.notes, validation)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* CONTEXT: Edit mode instructions */}
      {editingCell && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <Edit3 className="h-4 w-4" />
          <span>Editing row {editingCell.row + 1}, {editingCell.field}</span>
          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={handleEditSave}>
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleEditCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
