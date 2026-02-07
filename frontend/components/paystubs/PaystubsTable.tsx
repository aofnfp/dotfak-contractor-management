'use client'

import { useState, memo } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Eye, Trash2, UserCheck, FileText, AlertCircle } from 'lucide-react'
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
import { useDeletePaystub } from '@/lib/hooks/usePaystubs'
import type { PaystubWithDetails } from '@/lib/types/paystub'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaystubsTableProps {
  paystubs: PaystubWithDetails[]
  isLoading: boolean
}

export const PaystubsTable = memo(function PaystubsTable({ paystubs, isLoading }: PaystubsTableProps) {
  const router = useRouter()
  const deletePaystub = useDeletePaystub()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this paystub? This action cannot be undone.')) {
      setDeletingId(id)
      await deletePaystub.mutateAsync(id)
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading paystubs...</div>
      </div>
    )
  }

  if (paystubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">No paystubs found</p>
        <p className="text-sm text-muted-foreground">
          Upload a paystub to get started
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/70">
            <TableHead className="font-heading">Pay Period</TableHead>
            <TableHead className="font-heading">Contractor</TableHead>
            <TableHead className="font-heading">Client</TableHead>
            <TableHead className="font-heading">Gross Pay</TableHead>
            <TableHead className="font-heading">Hours</TableHead>
            <TableHead className="font-heading">Status</TableHead>
            <TableHead className="font-heading">Uploaded</TableHead>
            <TableHead className="text-right font-heading">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paystubs.map((paystub) => (
            <TableRow
              key={paystub.id}
              className="hover:bg-secondary/30 cursor-pointer"
              onClick={() => router.push(`/paystubs/${paystub.id}`)}
            >
              <TableCell>
                <div>
                  <p className="font-medium">
                    {formatDate(paystub.pay_period_begin)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    to {formatDate(paystub.pay_period_end)}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {paystub.contractor_name ? (
                  <div>
                    <p className="font-medium">{paystub.contractor_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {paystub.contractor_code}
                    </p>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unassigned
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{paystub.client_name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {paystub.client_code}
                  </p>
                </div>
              </TableCell>
              <TableCell className="font-mono">
                {formatCurrency(paystub.gross_pay)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {paystub.total_hours ? `${Number(paystub.total_hours).toFixed(2)} hrs` : '—'}
              </TableCell>
              <TableCell>
                {paystub.auto_matched ? (
                  <Badge className="bg-cta hover:bg-cta/90">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Auto-matched
                  </Badge>
                ) : paystub.contractor_assignment_id ? (
                  <Badge variant="default">
                    Manually Assigned
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Needs Assignment
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div>
                  <p>{formatDate(paystub.created_at)}</p>
                  <p className="text-xs">by {paystub.uploader_email}</p>
                </div>
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
                        router.push(`/paystubs/${paystub.id}`)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(paystub.id)
                      }}
                      className="text-destructive focus:text-destructive"
                      disabled={deletingId === paystub.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingId === paystub.id ? 'Deleting...' : 'Delete'}
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
