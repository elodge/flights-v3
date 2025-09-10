/**
 * @fileoverview Personnel Tab Client Component
 * 
 * @description Client component for the Personnel tab with import dialog functionality
 * 
 * @access Employee only (agent/admin)
 * @security Client-side state management for import dialog
 * @business_rule Provides import and add person functionality
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Upload, Plus } from 'lucide-react'
import { AddPersonDialog } from './add-person-dialog'
import { EditPersonDialog } from './edit-person-dialog'
import { DeletePersonDialog } from './delete-person-dialog'
import { InlinePartySelector } from './inline-party-selector'
import { PersonnelImportDialog } from './personnel-import-dialog'
import { Database } from '@/lib/database.types'

type Personnel = Database['public']['Tables']['tour_personnel']['Row']

interface PersonnelTabProps {
  projectId: string
  personnel: Personnel[]
}

/**
 * Personnel Tab Component
 * 
 * @description Client component for managing tour personnel with import functionality
 * @param projectId Project ID for personnel management
 * @param personnel Array of personnel records
 * 
 * @access Employee only (agent/admin)
 * @security Client-side state management only
 */
export function PersonnelTab({ projectId, personnel }: PersonnelTabProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  return (
    <>
      <div className="card-muted">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Tour Personnel</h3>
              <p className="text-sm text-muted-foreground">
                Manage {personnel.length} person{personnel.length !== 1 ? 's' : ''} in this tour
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <AddPersonDialog projectId={projectId} />
            </div>
          </div>
        </div>
        <div className="p-4">
          {personnel.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No personnel assigned</h3>
              <p className="mt-2 text-muted-foreground">
                Tour personnel will appear here once they are added to this tour.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import from Excel
                </Button>
                <AddPersonDialog projectId={projectId} />
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-sm font-medium">Name</TableHead>
                  <TableHead className="text-sm font-medium">Party</TableHead>
                  <TableHead className="text-sm font-medium">Contact</TableHead>
                  <TableHead className="text-sm font-medium">Status</TableHead>
                  <TableHead className="text-sm font-medium">Travel Info</TableHead>
                  <TableHead className="w-[100px] text-sm font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnel.map((person) => (
                  <TableRow 
                    key={person.id}
                    className={`border-border/50 hover:bg-muted/50 ${person.status === 'inactive' ? 'opacity-60' : ''}`}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{person.full_name}</span>
                        {person.is_vip && (
                          <Badge variant="secondary" className="text-xs">VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlinePartySelector
                        personId={person.id}
                        currentParty={(person as any).party || 'A Party'}
                        fullName={person.full_name}
                        isInactive={person.status === 'inactive'}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {person.email && (
                          <div className="text-muted-foreground">{person.email}</div>
                        )}
                        {person.phone && (
                          <div className="text-muted-foreground">{person.phone}</div>
                        )}
                        {!person.email && !person.phone && (
                          <span className="text-muted-foreground">No contact info</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={person.status === 'active' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {person.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {(person as any).seat_pref && (
                          <div>Seat: {(person as any).seat_pref}</div>
                        )}
                        {(person as any).ff_numbers && (
                          <div>FF: {(person as any).ff_numbers}</div>
                        )}
                        {!(person as any).seat_pref && !(person as any).ff_numbers && (
                          <span>No travel preferences</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditPersonDialog person={{
                          id: person.id,
                          full_name: person.full_name,
                          party: (person as any).party || 'A Party',
                          email: person.email || undefined,
                          phone: person.phone || undefined,
                          seat_pref: (person as any).seat_pref || undefined,
                          ff_numbers: (person as any).ff_numbers || undefined,
                          notes: person.special_requests || undefined,
                          status: person.status
                        }} />
                        <DeletePersonDialog 
                          personId={person.id}
                          personName={person.full_name}
                          disabled={person.status === 'inactive'}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* CONTEXT: Import dialog */}
      <PersonnelImportDialog
        projectId={projectId}
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </>
  )
}
