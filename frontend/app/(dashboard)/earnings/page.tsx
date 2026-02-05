'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EarningsTable } from '@/components/earnings/EarningsTable'
import { useEarnings, useEarningsSummary } from '@/lib/hooks/useEarnings'
import { useContractors } from '@/lib/hooks/useContractors'
import { useClients } from '@/lib/hooks/useClients'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToCSV } from '@/lib/utils/export'
import { DollarSign, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaymentStatus } from '@/lib/types/earning'

export default function EarningsPage() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all')
  const [contractorId, setContractorId] = useState<string>('all')
  const [clientId, setClientId] = useState<string>('all')

  // Build filters
  const filters = {
    payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
    contractor_id: contractorId !== 'all' ? contractorId : undefined,
    client_id: clientId !== 'all' ? clientId : undefined,
  }

  const { data: earnings, isLoading, error } = useEarnings(filters)
  const { data: summary, isLoading: summaryLoading } = useEarningsSummary()
  const { data: contractors } = useContractors()
  const { data: clients } = useClients()

  // Export earnings to CSV
  const handleExport = () => {
    if (!earnings || earnings.length === 0) {
      return
    }

    const exportData = earnings.map(earning => ({
      contractor_code: earning.contractor_code || '',
      contractor_name: `${earning.contractor_first_name || ''} ${earning.contractor_last_name || ''}`.trim(),
      client_name: earning.client_name || '',
      pay_period_begin: earning.pay_period_begin || '',
      pay_period_end: earning.pay_period_end || '',
      hours_worked: earning.client_total_hours || 0,
      client_gross_pay: earning.client_gross_pay || 0,
      contractor_earnings: earning.contractor_total_earnings || 0,
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
        { key: 'contractor_earnings', label: 'Contractor Earnings' },
        { key: 'amount_paid', label: 'Amount Paid' },
        { key: 'amount_pending', label: 'Amount Pending' },
        { key: 'payment_status', label: 'Payment Status' },
      ],
      'earnings_export'
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground mt-2">
            View and manage contractor earnings from paystubs
          </p>
        </div>
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
                Across all contractors
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
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(summary.total_pending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.count_unpaid} unpaid, {summary.count_partially_paid} partial
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
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
          </div>
        </CardContent>
      </Card>

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
      ) : earnings ? (
        <EarningsTable earnings={earnings} />
      ) : null}
    </div>
  )
}
