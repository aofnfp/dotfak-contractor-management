'use client'

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
import { PaymentTable } from '@/components/payments/PaymentTable'
import { usePayments, usePaymentsSummary, useManagerPayments } from '@/lib/hooks/usePayments'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToCSV } from '@/lib/utils/export'
import { DollarSign, CreditCard, TrendingUp, Download } from 'lucide-react'

/**
 * Manager Payments View
 */
function ManagerPaymentsView() {
  const { data: payments, isLoading, error } = useManagerPayments()

  const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Payments</h1>
        <p className="text-muted-foreground mt-2">
          View your payment history
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-cta" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cta">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments?.length || 0} payment(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading payments</p>
          </CardContent>
        </Card>
      ) : !payments || payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No payments recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/70">
                    <TableHead className="font-heading">Date</TableHead>
                    <TableHead className="font-heading">Amount</TableHead>
                    <TableHead className="font-heading">Method</TableHead>
                    <TableHead className="font-heading">Reference</TableHead>
                    <TableHead className="font-heading">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-secondary/30">
                      <TableCell className="text-sm">
                        {formatDate(payment.payment_date)}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-cta">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method ? (
                          <Badge variant="outline">
                            {payment.payment_method.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{'\u2014'}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {payment.transaction_reference || '\u2014'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {payment.notes || '\u2014'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Payments List Page
 *
 * View all contractor payments with summary stats
 */
export default function PaymentsPage() {
  const { user } = useAuth()

  // Manager sees their own payments
  if (user?.role === 'manager') {
    return <ManagerPaymentsView />
  }

  const isAdmin = user?.role === 'admin'

  return <AdminContractorPaymentsView isAdmin={isAdmin} />
}

function AdminContractorPaymentsView({ isAdmin }: { isAdmin: boolean }) {
  const { data: payments, isLoading, error } = usePayments()
  const { data: summary, isLoading: summaryLoading } = usePaymentsSummary(isAdmin)

  // Export payments to CSV
  const handleExport = () => {
    if (!payments || payments.length === 0) {
      return
    }

    const exportData = payments.map(payment => ({
      payment_date: payment.payment_date || '',
      contractor_code: payment.contractor_code || '',
      contractor_name: payment.contractor_name || '',
      amount: payment.amount || 0,
      payment_method: payment.payment_method || '',
      transaction_reference: payment.transaction_reference || '',
      notes: payment.notes || '',
    }))

    exportToCSV(
      exportData,
      [
        { key: 'payment_date', label: 'Payment Date' },
        { key: 'contractor_code', label: 'Contractor Code' },
        { key: 'contractor_name', label: 'Contractor Name' },
        { key: 'amount', label: 'Amount' },
        { key: 'payment_method', label: 'Payment Method' },
        { key: 'transaction_reference', label: 'Transaction Reference' },
        { key: 'notes', label: 'Notes' },
      ],
      'payments_export'
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-2">
            View and manage contractor payment records
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={!payments || payments.length === 0 || isLoading}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Link href="/payments/new">
              <Button className="bg-cta hover:bg-cta/90">
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Summary Stats (admin only) */}
      {isAdmin && summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {summary.total_payments}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Payment records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-cta" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cta">
                {formatCurrency(summary.total_amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all contractors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used Method</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {summary.count_by_method?.direct_deposit || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Direct deposits</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Payments Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading payments</p>
          </CardContent>
        </Card>
      ) : payments ? (
        <PaymentTable payments={payments} />
      ) : null}
    </div>
  )
}
