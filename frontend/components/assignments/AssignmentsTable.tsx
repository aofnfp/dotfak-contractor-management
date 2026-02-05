'use client'

import { useState, memo } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
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
import { useDeleteAssignment } from '@/lib/hooks/useAssignments'
import type { AssignmentWithDetails } from '@/lib/api/assignments'
import { formatCurrency } from '@/lib/utils'

interface AssignmentsTableProps {
  assignments: AssignmentWithDetails[]
  isLoading: boolean
}

export const AssignmentsTable = memo(function AssignmentsTable({ assignments, isLoading }: AssignmentsTableProps) {
  const router = useRouter()
  const deleteAssignment = useDeleteAssignment()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      setDeletingId(id)
      await deleteAssignment.mutateAsync(id)
      setDeletingId(null)
    }
  }

  const formatRate = (assignment: AssignmentWithDetails) => {
    if (assignment.rate_type === 'fixed' && assignment.fixed_hourly_rate) {
      return `${formatCurrency(assignment.fixed_hourly_rate)}/hr`
    } else if (assignment.rate_type === 'percentage' && assignment.percentage_rate) {
      return `${assignment.percentage_rate}%`
    }
    return '—'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading assignments...</div>
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">No assignments found</p>
        <p className="text-sm text-muted-foreground">
          Click "Create Assignment" to link a contractor to a client
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/70">
            <TableHead className="font-heading">Contractor</TableHead>
            <TableHead className="font-heading">Client</TableHead>
            <TableHead className="font-heading">Rate Type</TableHead>
            <TableHead className="font-heading">Rate</TableHead>
            <TableHead className="font-heading">Bonus Split</TableHead>
            <TableHead className="font-heading">Status</TableHead>
            <TableHead className="text-right font-heading">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow
              key={assignment.id}
              className="hover:bg-secondary/30 cursor-pointer"
              onClick={() => router.push(`/assignments/${assignment.id}`)}
            >
              <TableCell>
                <div>
                  <p className="font-medium">{assignment.contractor_name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {assignment.contractor_code}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{assignment.client_name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {assignment.client_code}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {assignment.rate_type === 'fixed' ? 'Fixed Hourly' : 'Percentage'}
                </Badge>
              </TableCell>
              <TableCell className="font-mono">
                {formatRate(assignment)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {assignment.bonus_split_percentage}%
              </TableCell>
              <TableCell>
                <Badge
                  variant={assignment.is_active ? 'default' : 'secondary'}
                  className={assignment.is_active ? 'bg-cta hover:bg-cta/90' : ''}
                >
                  {assignment.is_active ? 'Active' : 'Inactive'}
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
                        router.push(`/assignments/${assignment.id}`)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/assignments/${assignment.id}/edit`)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(assignment.id)
                      }}
                      className="text-destructive focus:text-destructive"
                      disabled={deletingId === assignment.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingId === assignment.id ? 'Deleting...' : 'Delete'}
                    </DropdownMenuItem>
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
