'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDashboardStats } from '@/lib/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, DollarSign, FileText, TrendingUp, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: dashboardStats, isLoading, error } = useDashboardStats()

  // Memoize stats to prevent recalculation on every render
  const stats = useMemo(() => {
    if (!dashboardStats) {
      return [
        { title: 'Total Contractors', value: '0', icon: Users, color: 'text-cta' },
        { title: 'Unpaid Amount', value: '$0.00', icon: DollarSign, color: 'text-destructive' },
        { title: 'Recent Paystubs', value: '0', icon: FileText, color: 'text-text' },
        { title: 'This Month', value: '$0.00', icon: TrendingUp, color: 'text-cta' },
      ]
    }

    return [
      {
        title: 'Total Contractors',
        value: dashboardStats.total_contractors.toString(),
        icon: Users,
        color: 'text-cta',
      },
      {
        title: 'Unpaid Amount',
        value: formatCurrency(dashboardStats.total_unpaid),
        icon: DollarSign,
        color: 'text-destructive',
      },
      {
        title: 'Recent Paystubs',
        value: dashboardStats.recent_paystubs.toString(),
        icon: FileText,
        color: 'text-text',
      },
      {
        title: 'This Month',
        value: formatCurrency(dashboardStats.this_month_earnings),
        icon: TrendingUp,
        color: 'text-cta',
      },
    ]
  }, [dashboardStats])

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-heading text-text">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.email}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">
                Failed to load dashboard statistics. Please try refreshing the page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="bg-secondary border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className={`text-2xl md:text-3xl font-heading ${stat.color}`}>
                      {stat.value}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Getting Started Card - Only show when stats are all zero */}
        {!isLoading && dashboardStats &&
         dashboardStats.total_contractors === 0 &&
         dashboardStats.recent_paystubs === 0 && (
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="font-heading">Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your dashboard is ready. Start by adding contractors and uploading paystubs.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
