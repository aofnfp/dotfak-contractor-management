'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EarningsTable } from '@/components/earnings/EarningsTable'
import { useUnpaidEarnings } from '@/lib/hooks/useEarnings'
import { useUnpaidManagerEarnings } from '@/lib/hooks/useManagerEarnings'
import { useContractors } from '@/lib/hooks/useContractors'
import { useClients } from '@/lib/hooks/useClients'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import { normalizeManagerEarnings } from '@/lib/utils/normalize-earnings'
import { AlertCircle, DollarSign, Users, CheckCircle2, X } from 'lucide-react'
import type { EarningWithDetails } from '@/lib/types/earning'

// Shared unpaid earnings UI
function UnpaidEarningsUI({
  earnings,
  isLoading,
  error,
  filterSlot,
  paymentType = 'contractor',
}: {
  earnings: EarningWithDetails[] | undefined
  isLoading: boolean
  error: unknown
  filterSlot?: React.ReactNode
  paymentType?: 'contractor' | 'manager'
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const stats = earnings
    ? {
        totalPending: earnings.reduce((sum, e) => sum + e.amount_pending, 0),
        totalContractors: new Set(earnings.map((e) => e.contractor_assignment_id)).size,
        count: earnings.length,
      }
    : { totalPending: 0, totalContractors: 0, count: 0 }

  const selectionInfo = useMemo(() => {
    if (!earnings || selectedIds.size === 0) {
      return { selectedEarnings: [], selectedPending: 0, uniqueContractors: new Set<string>(), isMixed: false }
    }
    const selectedEarnings = earnings.filter(e => selectedIds.has(e.id))
    const selectedPending = selectedEarnings.reduce((sum, e) => sum + e.amount_pending, 0)
    const uniqueContractors = new Set(selectedEarnings.map(e => e.contractor_id))
    return {
      selectedEarnings,
      selectedPending,
      uniqueContractors,
      isMixed: uniqueContractors.size > 1,
    }
  }, [earnings, selectedIds])

  const handlePaySelected = () => {
    const ids = Array.from(selectedIds).join(',')
    const typeParam = paymentType === 'manager' ? '&type=manager' : ''
    router.push(`/payments/new?earning_ids=${ids}${typeParam}`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Unpaid Earnings</h1>
          <p className="text-muted-foreground mt-2">
            Select earnings and record payments against them
          </p>
        </div>
        <Link href={`/payments/new${paymentType === 'manager' ? '?type=manager' : ''}`}>
          <Button className="bg-cta hover:bg-cta/90">
            <DollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      {isLoading ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.totalPending)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Owed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalContractors}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                With unpaid earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid Entries</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pay periods to settle
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {filterSlot}

      {/* Info Box */}
      <Card className="border-muted bg-secondary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Select & Pay</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Use the checkboxes to select specific earnings you want to pay, then click
                &ldquo;Pay Selected&rdquo; in the bar below. All selected earnings must belong
                to the same person.
              </p>
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
            <p className="text-destructive">Error loading unpaid earnings</p>
          </CardContent>
        </Card>
      ) : earnings && earnings.length > 0 ? (
        <div className={selectedIds.size > 0 ? 'pb-20' : ''}>
          <EarningsTable
            earnings={earnings}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-cta mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              All Caught Up!
            </h3>
            <p className="text-muted-foreground">
              There are no unpaid earnings at this time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sticky Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-foreground">
                {selectedIds.size} selected
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="font-mono font-bold text-cta">
                {formatCurrency(selectionInfo.selectedPending)} pending
              </span>
              {selectionInfo.isMixed && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-destructive font-medium">
                    Select earnings from one person only
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                className="bg-cta hover:bg-cta/90"
                disabled={selectionInfo.isMixed}
                onClick={handlePaySelected}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Pay Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Admin: contractor unpaid earnings with filters
function AdminUnpaidPage() {
  const { data: earnings, isLoading, error } = useUnpaidEarnings()
  const { data: contractors } = useContractors()
  const { data: clients } = useClients()
  const [contractorFilter, setContractorFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')

  const filteredEarnings = useMemo(() => {
    if (!earnings) return undefined
    return earnings.filter(e => {
      if (contractorFilter !== 'all' && e.contractor_id !== contractorFilter) return false
      if (clientFilter !== 'all' && e.client_company_id !== clientFilter) return false
      return true
    })
  }, [earnings, contractorFilter, clientFilter])

  const filterSlot = (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Contractor</Label>
            <Select value={contractorFilter} onValueChange={setContractorFilter}>
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
            <Select value={clientFilter} onValueChange={setClientFilter}>
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
  )

  return (
    <UnpaidEarningsUI
      earnings={filteredEarnings}
      isLoading={isLoading}
      error={error}
      filterSlot={filterSlot}
    />
  )
}

// Manager: own unpaid earnings, no filters needed
function ManagerUnpaidPage() {
  const { data: rawEarnings, isLoading, error } = useUnpaidManagerEarnings()

  const earnings = useMemo(
    () => rawEarnings ? normalizeManagerEarnings(rawEarnings) : undefined,
    [rawEarnings]
  )

  return (
    <UnpaidEarningsUI
      earnings={earnings}
      isLoading={isLoading}
      error={error}
      paymentType="manager"
    />
  )
}

export default function UnpaidEarningsPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'manager'

  if (isManager) {
    return <ManagerUnpaidPage />
  }

  return <AdminUnpaidPage />
}
