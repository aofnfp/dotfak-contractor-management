'use client'

import { useState } from 'react'
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
import { usePayments, usePaymentsSummary, useManagerPayments, useDeleteManagerPayment } from '@/lib/hooks/usePayments'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToCSV } from '@/lib/utils/export'
import { DollarSign, CreditCard, TrendingUp, Download, Trash2, Users } from 'lucide-react'

/**
 * Manager Payments View (for manager role — read-only)
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
 * Admin view — Contractor payments tab content
 */
function ContractorPaymentsTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: payments, isLoading, error } = usePayments()
  const { data: summary, isLoading: summaryLoading } = usePaymentsSummary(isAdmin)

  const handleExport = () => {
    if (!payments || payments.length === 0) return

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
    <div className="space-y-6">
      {/* Actions */}
      {isAdmin && (
        <div className="flex justify-end gap-2">
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

      {/* Summary Stats */}
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

/**
 * Admin view — Manager payments tab content
 */
function ManagerPaymentsTab() {
  const { data: payments, isLoading, error } = useManagerPayments()
  const deleteManagerPayment = useDeleteManagerPayment()

  const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  const handleDelete = async (id: string, managerName: string) => {
    if (
      confirm(
        `Are you sure you want to delete this payment to ${managerName || 'this manager'}? This will reverse the payment allocation.`
      )
    ) {
      await deleteManagerPayment.mutateAsync(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Link href="/payments/new?type=manager">
          <Button className="bg-cta hover:bg-cta/90">
            <DollarSign className="h-4 w-4 mr-2" />
            Record Manager Payment
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid to Managers</CardTitle>
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
            <p className="text-destructive">Error loading manager payments</p>
          </CardContent>
        </Card>
      ) : !payments || payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Manager Payments
            </h3>
            <p className="text-muted-foreground">
              No manager payment records exist yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-heading">Date</TableHead>
                    <TableHead className="font-heading">Manager</TableHead>
                    <TableHead className="font-heading text-right">Amount</TableHead>
                    <TableHead className="font-heading">Method</TableHead>
                    <TableHead className="font-heading">Reference</TableHead>
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
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-cta" />
                          <span className="font-medium text-foreground">
                            {payment.manager_name || 'Unknown Manager'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="font-bold text-cta font-mono text-lg">
                          {formatCurrency(payment.amount)}
                        </span>
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

                      <TableCell>
                        {payment.transaction_reference ? (
                          <span className="font-mono text-sm text-foreground">
                            {payment.transaction_reference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">{'\u2014'}</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 w-11 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete Payment"
                          aria-label="Delete manager payment"
                          onClick={() => handleDelete(payment.id, payment.manager_name || '')}
                          disabled={deleteManagerPayment.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
              </div>
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
 * Admin: tabbed view (Contractor / Manager payments)
 * Manager: own payments only
 */
export default function PaymentsPage() {
  const { user } = useAuth()

  // Manager sees their own payments
  if (user?.role === 'manager') {
    return <ManagerPaymentsView />
  }

  const isAdmin = user?.role === 'admin'

  return <AdminPaymentsView isAdmin={isAdmin} />
}

function AdminPaymentsView({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'contractor' | 'manager'>('contractor')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-2">
            View and manage payment records
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('contractor')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'contractor'
              ? 'bg-cta text-white'
              : 'bg-background text-muted-foreground hover:bg-secondary'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Contractor Payments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manager')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'manager'
              ? 'bg-cta text-white'
              : 'bg-background text-muted-foreground hover:bg-secondary'
          }`}
        >
          <Users className="h-4 w-4" />
          Manager Payments
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'contractor' ? (
        <ContractorPaymentsTab isAdmin={isAdmin} />
      ) : (
        <ManagerPaymentsTab />
      )}
    </div>
  )
}
