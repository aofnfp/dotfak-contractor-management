'use client'

import { memo, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Eye, User, Building2 } from 'lucide-react'
import type { EarningWithDetails } from '@/lib/types/earning'
import type { PaymentStatus } from '@/lib/types/earning'

interface EarningsTableProps {
  earnings: EarningWithDetails[]
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
}

const getPaymentStatusBadge = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-cta hover:bg-cta/90 text-white">
          Paid
        </Badge>
      )
    case 'partially_paid':
      return (
        <Badge variant="outline" className="border-yellow-600 text-yellow-600">
          Partially Paid
        </Badge>
      )
    case 'unpaid':
      return (
        <Badge variant="destructive">
          Unpaid
        </Badge>
      )
  }
}

export const EarningsTable = memo(function EarningsTable({
  earnings,
  selectable = false,
  selectedIds,
  onSelectionChange,
}: EarningsTableProps) {
  const totals = useMemo(() => ({
    totalRegular: earnings.reduce((sum, e) => sum + e.contractor_regular_earnings, 0),
    totalBonus: earnings.reduce((sum, e) => sum + e.contractor_bonus_share, 0),
    totalEarnings: earnings.reduce((sum, e) => sum + e.contractor_total_earnings, 0),
    totalPaid: earnings.reduce((sum, e) => sum + e.amount_paid, 0),
    totalPending: earnings.reduce((sum, e) => sum + e.amount_pending, 0),
  }), [earnings])

  const allSelected = useMemo(() => {
    if (!selectable || !selectedIds || earnings.length === 0) return false
    return earnings.every(e => selectedIds.has(e.id))
  }, [selectable, selectedIds, earnings])

  const toggleOne = useCallback((id: string) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }, [onSelectionChange, selectedIds])

  const toggleAll = useCallback(() => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(earnings.map(e => e.id)))
    }
  }, [onSelectionChange, allSelected, earnings])

  if (earnings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Earnings Found
          </h3>
          <p className="text-muted-foreground">
            No earnings match your current filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="font-heading">Pay Period</TableHead>
                <TableHead className="font-heading">Contractor</TableHead>
                <TableHead className="font-heading">Client</TableHead>
                <TableHead className="font-heading text-right">Hours</TableHead>
                <TableHead className="font-heading text-right">Regular</TableHead>
                <TableHead className="font-heading text-right">Bonus</TableHead>
                <TableHead className="font-heading text-right">Total Earnings</TableHead>
                <TableHead className="font-heading text-right">Paid</TableHead>
                <TableHead className="font-heading text-right">Pending</TableHead>
                <TableHead className="font-heading">Status</TableHead>
                <TableHead className="font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings.map((earning) => {
                const isSelected = selectable && selectedIds?.has(earning.id)
                return (
                  <TableRow
                    key={earning.id}
                    className={`hover:bg-secondary/20 ${isSelected ? 'bg-cta/5' : ''}`}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected || false}
                          onCheckedChange={() => toggleOne(earning.id)}
                          aria-label={`Select earning for ${formatDate(earning.pay_period_begin)}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {formatDate(earning.pay_period_begin)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          to {formatDate(earning.pay_period_end)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/contractors/${earning.contractor_id}`}
                        className="hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-cta" />
                          <div>
                            <div className="font-medium text-foreground">
                              {earning.contractor_name}
                            </div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {earning.contractor_code}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-foreground">
                            {earning.client_name}
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {earning.client_code}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      {Number(earning.client_total_hours).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      {formatCurrency(earning.contractor_regular_earnings)}
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      {earning.contractor_bonus_share > 0 ? (
                        <span className="text-amber-500 font-semibold">
                          {formatCurrency(earning.contractor_bonus_share)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="font-bold text-cta font-mono">
                        {formatCurrency(earning.contractor_total_earnings)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(earning.amount_paid)}
                    </TableCell>

                    <TableCell className="text-right">
                      <span
                        className={`font-mono ${
                          earning.amount_pending > 0
                            ? 'text-destructive font-semibold'
                            : earning.amount_pending < 0
                              ? 'text-amber-500 font-semibold'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {earning.amount_pending < 0
                          ? `(${formatCurrency(Math.abs(earning.amount_pending))})`
                          : formatCurrency(earning.amount_pending)}
                      </span>
                      {earning.amount_pending < 0 && (
                        <div className="text-xs text-amber-500">overpaid</div>
                      )}
                    </TableCell>

                    <TableCell>
                      {getPaymentStatusBadge(earning.payment_status)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/earnings/${earning.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 w-11 p-0"
                            title="View Breakdown"
                            aria-label="View earning breakdown"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {earning.paystub_id ? (
                          <Link href={`/paystubs/${earning.paystub_id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-11 w-11 p-0"
                              title="View Paystub"
                              aria-label="View paystub details"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 w-11 p-0 opacity-30 cursor-not-allowed"
                            title="No paystub linked"
                            aria-label="No paystub linked"
                            disabled
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        <div className="border-t border-border bg-secondary/20 px-6 py-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Showing {earnings.length} earning{earnings.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-6">
              <div>
                <span className="text-muted-foreground">Regular: </span>
                <span className="font-bold font-mono">
                  {formatCurrency(totals.totalRegular)}
                </span>
              </div>
              {totals.totalBonus > 0 && (
                <div>
                  <span className="text-muted-foreground">Bonus: </span>
                  <span className="font-bold text-amber-500 font-mono">
                    {formatCurrency(totals.totalBonus)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold text-cta font-mono">
                  {formatCurrency(totals.totalEarnings)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-bold text-cta font-mono">
                  {formatCurrency(totals.totalPaid)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <span className={`font-bold font-mono ${totals.totalPending > 0 ? 'text-destructive' : totals.totalPending < 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {totals.totalPending < 0 ? `(${formatCurrency(Math.abs(totals.totalPending))})` : formatCurrency(totals.totalPending)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
