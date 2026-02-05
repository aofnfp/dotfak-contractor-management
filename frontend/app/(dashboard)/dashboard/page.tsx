'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDashboardStats } from '@/lib/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, DollarSign, FileText, TrendingUp, Loader2, UserPlus, Upload, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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

        {/* Onboarding Guide - Only show when stats are all zero */}
        {!isLoading && dashboardStats &&
         dashboardStats.total_contractors === 0 &&
         dashboardStats.recent_paystubs === 0 && (
          <Card className="bg-cta/10 border-cta/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-cta" />
                <CardTitle className="font-heading text-xl">Welcome to DotFak Contractor Management!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Your platform is ready to track contractor earnings and payments. Get started in just 2 simple steps:
              </p>

              {/* Step-by-step guide */}
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cta/20 flex items-center justify-center font-heading font-bold text-cta">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-text mb-1">Add Your First Contractor</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create a contractor profile with their details and rate structure (fixed hourly or percentage-based).
                    </p>
                    <Link href="/contractors">
                      <Button className="bg-cta hover:bg-cta/90 text-white">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Contractor
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cta/20 flex items-center justify-center font-heading font-bold text-cta">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-text mb-1">Upload a Paystub</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a PDF paystub and we'll automatically calculate contractor earnings based on their rate structure.
                    </p>
                    <Link href="/paystubs/upload">
                      <Button variant="outline" className="border-cta/50 text-text hover:bg-cta/10">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Paystub
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-secondary/50 border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  💡 <span className="font-medium text-text">Pro tip:</span> The system will auto-match paystubs to contractors
                  and calculate earnings based on their assigned rate structure. You can review everything before making payments.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
