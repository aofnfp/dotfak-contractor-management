'use client'

import { memo } from 'react'
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
import { ExternalLink, User, CreditCard, Trash2 } from 'lucide-react'
import type { PaymentWithDetails, PaymentMethod } from '@/lib/types/payment'
import { useDeletePayment } from '@/lib/hooks/usePayments'

interface PaymentTableProps {
  payments: PaymentWithDetails[]
}

const getPaymentMethodBadge = (method: PaymentMethod) => {
  const variants = {
    direct_deposit: { label: 'Direct Deposit', className: 'bg-cta hover:bg-cta/90 text-white' },
    check: { label: 'Check', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
    cash: { label: 'Cash', className: 'bg-green-600 hover:bg-green-700 text-white' },
    wire_transfer: { label: 'Wire Transfer', className: 'bg-purple-600 hover:bg-purple-700 text-white' },
    other: { label: 'Other', className: 'bg-gray-600 hover:bg-gray-700 text-white' },
  }

  const config = variants[method]
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}

export const PaymentTable = memo(function PaymentTable({ payments }: PaymentTableProps) {
  const deletePayment = useDeletePayment()

  const handleDelete = async (id: string, contractorName: string) => {
    if (
      confirm(
        `Are you sure you want to delete this payment to ${contractorName}? This will reverse the payment allocation.`
      )
    ) {
      await deletePayment.mutateAsync(id)
    }
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Payments Found
          </h3>
          <p className="text-muted-foreground">
            No payment records exist yet.
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
                <TableHead className="font-heading">Date</TableHead>
                <TableHead className="font-heading">Contractor</TableHead>
                <TableHead className="font-heading text-right">Amount</TableHead>
                <TableHead className="font-heading">Method</TableHead>
                <TableHead className="font-heading">Reference</TableHead>
                <TableHead className="font-heading text-right">Allocations</TableHead>
                <TableHead className="font-heading text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-secondary/20">
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {formatDate(payment.payment_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Recorded {formatDate(payment.created_at)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/contractors/${payment.contractor_id}`}
                      className="hover:underline"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-cta" />
                        <div>
                          <div className="font-medium text-foreground">
                            {payment.contractor_name}
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {payment.contractor_code}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-bold text-cta font-mono text-lg">
                      {formatCurrency(payment.amount)}
                    </span>
                  </TableCell>

                  <TableCell>
                    {getPaymentMethodBadge(payment.payment_method)}
                  </TableCell>

                  <TableCell>
                    {payment.transaction_reference ? (
                      <span className="font-mono text-sm text-foreground">
                        {payment.transaction_reference}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-medium text-foreground">
                      {payment.allocations?.length || 0} earning(s)
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/payments/${payment.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 w-11 p-0"
                          title="View Details"
                          aria-label="View payment details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 w-11 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Payment"
                        aria-label="Delete payment"
                        onClick={() => handleDelete(payment.id, payment.contractor_name)}
                        disabled={deletePayment.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              Showing {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </span>
            <div>
              <span className="text-muted-foreground">Total Paid: </span>
              <span className="font-bold text-cta font-mono text-lg">
                {formatCurrency(
                  payments.reduce((sum, p) => sum + p.amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
