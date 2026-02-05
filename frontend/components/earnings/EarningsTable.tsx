'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExternalLink, FileText, User, Building2 } from 'lucide-react'
import type { EarningWithDetails } from '@/lib/types/earning'
import type { PaymentStatus } from '@/lib/types/earning'

interface EarningsTableProps {
  earnings: EarningWithDetails[]
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

export const EarningsTable = memo(function EarningsTable({ earnings }: EarningsTableProps) {
  // Memoize totals calculation to prevent recalculation on every render
  const totals = useMemo(() => ({
    totalEarnings: earnings.reduce((sum, e) => sum + e.contractor_total_earnings, 0),
    totalPending: earnings.reduce((sum, e) => sum + e.amount_pending, 0),
  }), [earnings])

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
                <TableHead className="font-heading">Pay Period</TableHead>
                <TableHead className="font-heading">Contractor</TableHead>
                <TableHead className="font-heading">Client</TableHead>
                <TableHead className="font-heading text-right">Hours</TableHead>
                <TableHead className="font-heading text-right">Total Earnings</TableHead>
                <TableHead className="font-heading text-right">Paid</TableHead>
                <TableHead className="font-heading text-right">Pending</TableHead>
                <TableHead className="font-heading">Status</TableHead>
                <TableHead className="font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings.map((earning) => (
                <TableRow key={earning.id} className="hover:bg-secondary/20">
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
                      href={`/contractors/${earning.contractor_assignment_id}`}
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
                    {earning.client_total_hours.toFixed(2)}
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
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatCurrency(earning.amount_pending)}
                    </span>
                  </TableCell>

                  <TableCell>
                    {getPaymentStatusBadge(earning.payment_status)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
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
                      <Link href={`/earnings/${earning.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 w-11 p-0"
                          title="View Details"
                          aria-label="View earning details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
                <span className="text-muted-foreground">Total Earnings: </span>
                <span className="font-bold text-cta font-mono">
                  {formatCurrency(totals.totalEarnings)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Pending: </span>
                <span className="font-bold text-destructive font-mono">
                  {formatCurrency(totals.totalPending)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
