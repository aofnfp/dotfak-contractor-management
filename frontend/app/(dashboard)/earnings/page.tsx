'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EarningsTable } from '@/components/earnings/EarningsTable'
import { useEarnings, useEarningsSummary } from '@/lib/hooks/useEarnings'
import { useManagerEarnings, useManagerEarningsSummary } from '@/lib/hooks/useManagerEarnings'
import { useContractors } from '@/lib/hooks/useContractors'
import { useClients } from '@/lib/hooks/useClients'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToCSV } from '@/lib/utils/export'
import { DollarSign, CheckCircle2, AlertCircle, Download, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { PaymentStatus } from '@/lib/types/earning'
import type { ManagerEarning } from '@/lib/types/manager'

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/10 text-green-500 border-green-500/20',
    partially_paid: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    unpaid: 'bg-red-500/10 text-red-500 border-red-500/20',
    overpaid: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }
  const labels: Record<string, string> = {
    paid: 'Paid',
    partially_paid: 'Partial',
    unpaid: 'Unpaid',
    overpaid: 'Overpaid',
  }
  return (
    <Badge variant="outline" className={styles[status] || ''}>
      {labels[status] || status}
    </Badge>
  )
}

function ManagerEarningsView() {
  const { data: earnings, isLoading, error } = useManagerEarnings()
  const { data: summary, isLoading: summaryLoading } = useManagerEarningsSummary()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
        <p className="text-muted-foreground mt-2">
          Your earnings from managed staff paystubs
        </p>
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
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(summary.total_earnings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.count_total} pay period{summary.count_total !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-cta" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cta">
                {formatCurrency(summary.total_paid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.count_paid} fully paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.total_pending > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatCurrency(summary.total_pending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.count_unpaid} unpaid, {summary.count_partially_paid} partial
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Earnings Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading earnings</p>
          </CardContent>
        </Card>
      ) : earnings && earnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Staff</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning: ManagerEarning) => (
                  <TableRow key={earning.id} className="border-border">
                    <TableCell className="font-medium">
                      {earning.contractor_name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {earning.client_name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {earning.pay_period_begin && earning.pay_period_end
                        ? `${formatDate(earning.pay_period_begin)} - ${formatDate(earning.pay_period_end)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {earning.staff_total_hours.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(earning.flat_hourly_rate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(earning.total_earnings)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={earning.payment_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No earnings found yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ContractorEarningsView({ isAdmin }: { isAdmin: boolean }) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all')
  const [contractorId, setContractorId] = useState<string>('all')
  const [clientId, setClientId] = useState<string>('all')

  const filters = {
    payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
    contractor_id: contractorId !== 'all' ? contractorId : undefined,
    client_id: clientId !== 'all' ? clientId : undefined,
  }

  const { data: earnings, isLoading, error } = useEarnings(filters)
  const { data: summary, isLoading: summaryLoading } = useEarningsSummary(isAdmin)
  const { data: contractors } = useContractors(isAdmin)
  const { data: clients } = useClients(isAdmin)

  const handleExport = () => {
    if (!earnings || earnings.length === 0) return

    const exportData = earnings.map(earning => ({
      contractor_code: earning.contractor_code || '',
      contractor_name: earning.contractor_name || '',
      client_name: earning.client_name || '',
      pay_period_begin: earning.pay_period_begin || '',
      pay_period_end: earning.pay_period_end || '',
      hours_worked: earning.client_total_hours || 0,
      client_gross_pay: earning.client_gross_pay || 0,
      regular_earnings: earning.contractor_regular_earnings || 0,
      bonus_share: earning.contractor_bonus_share || 0,
      total_earnings: earning.contractor_total_earnings || 0,
      amount_paid: earning.amount_paid || 0,
      amount_pending: earning.amount_pending || 0,
      payment_status: earning.payment_status || 'unpaid',
    }))

    exportToCSV(
      exportData,
      [
        { key: 'contractor_code', label: 'Contractor Code' },
        { key: 'contractor_name', label: 'Contractor Name' },
        { key: 'client_name', label: 'Client Company' },
        { key: 'pay_period_begin', label: 'Period Start' },
        { key: 'pay_period_end', label: 'Period End' },
        { key: 'hours_worked', label: 'Hours Worked' },
        { key: 'client_gross_pay', label: 'Client Gross Pay' },
        { key: 'regular_earnings', label: 'Regular Earnings' },
        { key: 'bonus_share', label: 'Bonus Share' },
        { key: 'total_earnings', label: 'Total Earnings' },
        { key: 'amount_paid', label: 'Amount Paid' },
        { key: 'amount_pending', label: 'Amount Pending' },
        { key: 'payment_status', label: 'Payment Status' },
      ],
      'earnings_export'
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground mt-2">
            View and manage contractor earnings from paystubs
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <Link href="/earnings/unpaid">
              <Button className="bg-cta hover:bg-cta/90 gap-2">
                <CreditCard className="h-4 w-4" />
                Unpaid Earnings
              </Button>
            </Link>
            <Button
              onClick={handleExport}
              disabled={!earnings || earnings.length === 0 || isLoading}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        )}
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(summary.total_earnings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Regular: {formatCurrency(summary.total_regular)}
                {summary.total_bonus > 0 && (
                  <> + Bonus: <span className="text-amber-500">{formatCurrency(summary.total_bonus)}</span></>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-cta" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cta">
                {formatCurrency(summary.total_paid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.count_paid} fully paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.total_pending > 0 ? 'text-destructive' : summary.total_pending < 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {summary.total_pending < 0
                  ? `(${formatCurrency(Math.abs(summary.total_pending))})`
                  : formatCurrency(summary.total_pending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.count_unpaid} unpaid, {summary.count_partially_paid} partial
              </p>
            </CardContent>
          </Card>

          {summary.total_bonus > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bonuses</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">
                  {formatCurrency(summary.total_bonus)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.count_with_bonus} paycheck{summary.count_with_bonus !== 1 ? 's' : ''} with bonus
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filter Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={paymentStatus}
                onValueChange={(value) => setPaymentStatus(value as PaymentStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>Contractor</Label>
                <Select value={contractorId} onValueChange={setContractorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All contractors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contractors</SelectItem>
                    {contractors?.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id}>
                        {contractor.contractor_code} - {contractor.first_name}{' '}
                        {contractor.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdmin && (
              <div className="space-y-2">
                <Label>Client Company</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.code} - {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading earnings</p>
          </CardContent>
        </Card>
      ) : earnings ? (
        <EarningsTable earnings={earnings} />
      ) : null}
    </div>
  )
}

export default function EarningsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'

  if (isManager) {
    return <ManagerEarningsView />
  }

  return <ContractorEarningsView isAdmin={isAdmin} />
}
