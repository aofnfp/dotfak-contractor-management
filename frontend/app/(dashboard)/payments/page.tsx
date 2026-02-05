'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentTable } from '@/components/payments/PaymentTable'
import { usePayments, usePaymentsSummary } from '@/lib/hooks/usePayments'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToCSV } from '@/lib/utils/export'
import { DollarSign, CreditCard, TrendingUp, Download } from 'lucide-react'

/**
 * Payments List Page
 *
 * View all contractor payments with summary stats
 */
export default function PaymentsPage() {
  const { data: payments, isLoading, error } = usePayments()
  const { data: summary, isLoading: summaryLoading } = usePaymentsSummary()

  // Export payments to CSV
  const handleExport = () => {
    if (!payments || payments.length === 0) {
      return
    }

    const exportData = payments.map(payment => ({
      payment_date: payment.payment_date || '',
      contractor_code: payment.contractor_code || '',
      contractor_name: `${payment.contractor_first_name || ''} ${payment.contractor_last_name || ''}`.trim(),
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
      </div>

      {/* Summary Stats */}
      {summaryLoading ? (
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
