'use client'

import { useState, memo } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDeleteContractor, useActivateContractor } from '@/lib/hooks/useContractors'
import type { Contractor } from '@/lib/api/contractors'

interface ContractorsTableProps {
  contractors: Contractor[]
  isLoading: boolean
}

export const ContractorsTable = memo(function ContractorsTable({ contractors, isLoading }: ContractorsTableProps) {
  const router = useRouter()
  const deleteContractor = useDeleteContractor()
  const activateContractor = useActivateContractor()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const handleDeactivate = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this contractor?')) {
      setDeletingId(id)
      await deleteContractor.mutateAsync(id)
      setDeletingId(null)
    }
  }

  const handleActivate = async (id: string) => {
    setActivatingId(id)
    await activateContractor.mutateAsync(id)
    setActivatingId(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading contractors...</div>
      </div>
    )
  }

  if (contractors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">No contractors found</p>
        <p className="text-sm text-muted-foreground">
          Click "Add Contractor" to create your first contractor
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/70">
            <TableHead className="font-heading">Code</TableHead>
            <TableHead className="font-heading">Name</TableHead>
            <TableHead className="font-heading">Phone</TableHead>
            <TableHead className="font-heading">SSN (Last 4)</TableHead>
            <TableHead className="font-heading">Status</TableHead>
            <TableHead className="text-right font-heading">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contractors.map((contractor) => (
            <TableRow
              key={contractor.id}
              className="hover:bg-secondary/30 cursor-pointer"
              onClick={() => router.push(`/contractors/${contractor.id}`)}
            >
              <TableCell className="font-mono text-sm">
                {contractor.contractor_code}
              </TableCell>
              <TableCell className="font-medium">
                {contractor.first_name} {contractor.last_name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {contractor.phone || '—'}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {contractor.ssn_last_4 ? `•••• ${contractor.ssn_last_4}` : '—'}
              </TableCell>
              <TableCell>
                <Badge
                  variant={contractor.is_active ? 'default' : 'secondary'}
                  className={contractor.is_active ? 'bg-cta hover:bg-cta/90' : ''}
                >
                  {contractor.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-11 w-11 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-secondary border-border">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/contractors/${contractor.id}`)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/contractors/${contractor.id}/edit`)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {contractor.is_active ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeactivate(contractor.id)
                        }}
                        className="text-destructive focus:text-destructive"
                        disabled={deletingId === contractor.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === contractor.id ? 'Deactivating...' : 'Deactivate'}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivate(contractor.id)
                        }}
                        disabled={activatingId === contractor.id}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {activatingId === contractor.id ? 'Reactivating...' : 'Reactivate'}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})
