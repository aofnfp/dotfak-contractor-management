'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
import { usePayment, useDeletePayment } from '@/lib/hooks/usePayments'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { PaymentMethod } from '@/lib/types/payment'

const getPaymentMethodBadge = (method: PaymentMethod) => {
  const variants = {
    direct_deposit: { label: 'Direct Deposit', className: 'bg-cta hover:bg-cta/90 text-white' },
    check: { label: 'Check', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
    cash: { label: 'Cash', className: 'bg-green-600 hover:bg-green-700 text-white' },
    wire_transfer: {
      label: 'Wire Transfer',
      className: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    other: { label: 'Other', className: 'bg-gray-600 hover:bg-gray-700 text-white' },
  }

  const config = variants[method]
  return <Badge className={config.className}>{config.label}</Badge>
}

/**
 * Payment Details Page
 *
 * View detailed information about a specific payment including allocations
 */
export default function PaymentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.id as string

  const { data: payment, isLoading, error } = usePayment(paymentId)
  const deletePayment = useDeletePayment()

  const handleDelete = async () => {
    if (
      confirm(
        `Are you sure you want to delete this payment to ${payment?.contractor_name}? This will reverse all payment allocations.`
      )
    ) {
      await deletePayment.mutateAsync(paymentId)
      router.push('/payments')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-cta" />
      </div>
    )
  }

  if (error || !payment) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Error loading payment details</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/payments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Payments
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Payment Details</h1>
          <p className="text-muted-foreground mt-2">
            Recorded on {formatDate(payment.created_at)}
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deletePayment.isPending}
        >
          {deletePayment.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Payment
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount */}
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-cta mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-cta font-mono">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
            </div>

            {/* Payment Date */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Payment Date</p>
                <p className="text-base font-medium text-foreground">
                  {formatDate(payment.payment_date)}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
                {getPaymentMethodBadge(payment.payment_method)}
              </div>
            </div>

            {/* Transaction Reference */}
            {payment.transaction_reference && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Transaction Reference</p>
                  <p className="text-base font-medium text-foreground font-mono">
                    {payment.transaction_reference}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {payment.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-base text-foreground">{payment.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contractor Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contractor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-cta mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Contractor</p>
                <Link
                  href={`/contractors/${payment.contractor_id}`}
                  className="text-lg font-semibold text-foreground hover:underline"
                >
                  {payment.contractor_name}
                </Link>
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  {payment.contractor_code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Allocations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment Allocations</span>
            <Badge variant="secondary">
              {payment.allocations?.length || 0} allocation(s)
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            This payment was allocated to the following earnings (FIFO - oldest first)
          </p>
        </CardHeader>
        <CardContent>
          {payment.allocations && payment.allocations.length > 0 ? (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-heading">Pay Period</TableHead>
                    <TableHead className="font-heading text-right">Total Earnings</TableHead>
                    <TableHead className="font-heading text-right">Allocated Amount</TableHead>
                    <TableHead className="font-heading text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payment.allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-foreground">
                            {allocation.earning_pay_period_begin &&
                              formatDate(allocation.earning_pay_period_begin)}
                          </div>
                          <div className="text-muted-foreground">
                            to{' '}
                            {allocation.earning_pay_period_end &&
                              formatDate(allocation.earning_pay_period_end)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {allocation.earning_total
                          ? formatCurrency(allocation.earning_total)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-cta font-mono text-lg">
                          {formatCurrency(allocation.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-cta">
                          Paid
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary Footer */}
              <div className="border-t border-border bg-secondary/20 px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Allocated</span>
                  <span className="font-bold text-cta font-mono text-lg">
                    {formatCurrency(
                      payment.allocations.reduce((sum, a) => sum + a.amount, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No allocations found for this payment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
