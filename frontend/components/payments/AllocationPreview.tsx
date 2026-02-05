'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { AllocationPreviewItem } from '@/lib/types/payment'

interface AllocationPreviewProps {
  allocations: AllocationPreviewItem[]
  totalAmount: number
}

/**
 * AllocationPreview Component
 *
 * Shows FIFO allocation preview - how payment will be distributed
 * across unpaid earnings (oldest first)
 */
export function AllocationPreview({ allocations, totalAmount }: AllocationPreviewProps) {
  if (allocations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No unpaid earnings found for this contractor
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.will_allocate, 0)
  const remainingUnallocated = totalAmount - totalAllocated

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Allocation Preview (FIFO)</span>
          <Badge variant="secondary" className="font-mono">
            {formatCurrency(totalAmount)}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Payment will be allocated to oldest unpaid earnings first (First In, First Out)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Allocation Table */}
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay Period</TableHead>
                <TableHead className="text-right">Current Pending</TableHead>
                <TableHead className="text-right">Will Allocate</TableHead>
                <TableHead className="text-right">New Pending</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.earning_id}>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(allocation.pay_period_begin), 'MMM d')} -{' '}
                      {format(new Date(allocation.pay_period_end), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(allocation.current_pending)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-cta">
                    {formatCurrency(allocation.will_allocate)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {allocation.fully_paid ? (
                      <span className="text-muted-foreground">$0.00</span>
                    ) : (
                      <span className="text-destructive">
                        {formatCurrency(allocation.new_pending)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {allocation.fully_paid ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Partial</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Payment:</span>
            <span className="font-mono font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Will Allocate:</span>
            <span className="font-mono text-cta">{formatCurrency(totalAllocated)}</span>
          </div>
          {remainingUnallocated > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining Unallocated:</span>
              <span className="font-mono text-destructive">
                {formatCurrency(remainingUnallocated)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-muted-foreground">
              Earnings {allocations.filter((a) => a.fully_paid).length} of{' '}
              {allocations.length} will be fully paid
            </span>
          </div>
        </div>

        {remainingUnallocated > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Payment amount exceeds
              total pending earnings. {formatCurrency(remainingUnallocated)} will not be
              allocated.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
