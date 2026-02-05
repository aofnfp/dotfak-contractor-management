'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EarningsTable } from '@/components/earnings/EarningsTable'
import { useUnpaidEarnings } from '@/lib/hooks/useEarnings'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, DollarSign, Users, CheckCircle2 } from 'lucide-react'

export default function UnpaidEarningsPage() {
  const { data: earnings, isLoading, error } = useUnpaidEarnings()

  // Calculate stats from unpaid earnings
  const stats = earnings
    ? {
        totalPending: earnings.reduce((sum, e) => sum + e.amount_pending, 0),
        totalContractors: new Set(earnings.map((e) => e.contractor_assignment_id)).size,
        count: earnings.length,
      }
    : { totalPending: 0, totalContractors: 0, count: 0 }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Unpaid Earnings</h1>
          <p className="text-muted-foreground mt-2">
            View all earnings with outstanding payments
          </p>
        </div>
        <Link href="/payments/new">
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
              <p className="text-xs text-muted-foreground mt-1">
                Across all contractors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contractors Owed</CardTitle>
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

      {/* Alert Box */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Action Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                These earnings have not been paid yet. Review the list below and record
                payments when completed. Payments are allocated oldest-first (FIFO) to
                ensure proper tracking.
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
        <EarningsTable earnings={earnings} />
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
    </div>
  )
}
