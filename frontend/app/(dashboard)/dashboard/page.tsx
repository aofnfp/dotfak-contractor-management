'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDashboardStats } from '@/lib/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, DollarSign, FileText, TrendingUp, Clock, Building2,
  AlertCircle, Wallet, PiggyBank, ArrowUpRight,
  ArrowDownRight, Upload, UserPlus, Sparkles, BarChart3,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MonthlyTrend } from '@/lib/api/dashboard'

function StatCard({
  title, value, subtitle, icon: Icon, color = 'text-foreground', loading = false,
}: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color?: string; loading?: boolean
}) {
  return (
    <Card className="bg-secondary border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-2xl font-heading ${color}`}>{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MiniBar({ value, max, color = 'bg-cta' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full bg-secondary rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function MonthlyTrendTable({ data }: { data: MonthlyTrend[] }) {
  const monthLabel = (m: string) => {
    const [year, month] = m.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`
  }

  const maxEarnings = Math.max(...data.map(d => d.contractor_earnings), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left py-2 font-medium">Month</th>
            <th className="text-right py-2 font-medium">Hrs</th>
            <th className="text-right py-2 font-medium">Client Gross</th>
            <th className="text-right py-2 font-medium">Earnings</th>
            <th className="text-right py-2 font-medium">Margin</th>
            <th className="text-right py-2 font-medium">Paid</th>
            <th className="text-right py-2 font-medium">Pending</th>
            <th className="py-2 pl-4 font-medium w-32"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month} className="border-b border-border/50 hover:bg-secondary/50">
              <td className="py-2 font-medium">{monthLabel(row.month)}</td>
              <td className="text-right py-2 font-mono text-muted-foreground">{row.hours.toFixed(0)}</td>
              <td className="text-right py-2 font-mono">{formatCurrency(row.client_gross)}</td>
              <td className="text-right py-2 font-mono text-cta font-semibold">
                {formatCurrency(row.contractor_earnings)}
                {row.bonus > 0 && (
                  <span className="text-amber-500 text-xs ml-1">+B</span>
                )}
              </td>
              <td className="text-right py-2 font-mono text-muted-foreground">
                {formatCurrency(row.margin)}
                <span className="text-xs ml-1">({row.margin_pct}%)</span>
              </td>
              <td className="text-right py-2 font-mono text-cta/80">{formatCurrency(row.paid)}</td>
              <td className="text-right py-2 font-mono">
                {row.pending > 0 ? (
                  <span className="text-destructive">{formatCurrency(row.pending)}</span>
                ) : (
                  <span className="text-muted-foreground">$0.00</span>
                )}
              </td>
              <td className="py-2 pl-4">
                <MiniBar value={row.contractor_earnings} max={maxEarnings} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading, error } = useDashboardStats()

  const isNewUser = !isLoading && stats &&
    stats.total_contractors === 0 && stats.total_paystubs === 0

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading text-text">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {stats?.earliest_period && stats?.latest_period
                ? `${formatDate(stats.earliest_period)} - ${formatDate(stats.latest_period)}`
                : `Welcome back, ${user?.email}`
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/paystubs/upload">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </Link>
            <Link href="/earnings">
              <Button size="sm" className="gap-2 bg-cta hover:bg-cta/90">
                <BarChart3 className="h-4 w-4" />
                Earnings
              </Button>
            </Link>
          </div>
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

        {/* Onboarding Guide - Only show for new users */}
        {isNewUser && (
          <Card className="bg-cta/10 border-cta/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-cta" />
                <CardTitle className="font-heading text-xl">Welcome to DotFak Contractor Management!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Get started in 2 simple steps:
              </p>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cta/20 flex items-center justify-center font-heading font-bold text-cta">1</div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-text mb-1">Add Your First Contractor</h3>
                    <p className="text-sm text-muted-foreground mb-3">Create a contractor profile with their rate structure.</p>
                    <Link href="/contractors">
                      <Button className="bg-cta hover:bg-cta/90 text-white">
                        <UserPlus className="mr-2 h-4 w-4" />Add Contractor
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cta/20 flex items-center justify-center font-heading font-bold text-cta">2</div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-text mb-1">Upload a Paystub</h3>
                    <p className="text-sm text-muted-foreground mb-3">Upload a PDF paystub and we'll calculate contractor earnings automatically.</p>
                    <Link href="/paystubs/upload">
                      <Button variant="outline" className="border-cta/50 text-text hover:bg-cta/10">
                        <Upload className="mr-2 h-4 w-4" />Upload Paystub
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* === MAIN DASHBOARD (only if we have data) === */}
        {!isNewUser && (
          <>
            {/* Row 1: Key Financial KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Client Gross Revenue"
                value={stats ? formatCurrency(stats.total_client_gross) : '$0'}
                subtitle={stats ? `${stats.total_paystubs} paystubs processed` : undefined}
                icon={Building2}
                color="text-foreground"
                loading={isLoading}
              />
              <StatCard
                title="Company Margin"
                value={stats ? formatCurrency(stats.total_margin) : '$0'}
                subtitle={stats ? `${stats.margin_pct}% of gross` : undefined}
                icon={PiggyBank}
                color="text-cta"
                loading={isLoading}
              />
              <StatCard
                title="Contractor Earnings"
                value={stats ? formatCurrency(stats.total_contractor_earnings) : '$0'}
                subtitle={stats ? `${stats.contractor_pct}% of gross` : undefined}
                icon={Wallet}
                color="text-foreground"
                loading={isLoading}
              />
              <StatCard
                title="Outstanding"
                value={stats ? formatCurrency(stats.total_pending) : '$0'}
                subtitle={stats ? `${stats.payment_rate.toFixed(0)}% payment rate` : undefined}
                icon={AlertCircle}
                color={stats && stats.total_pending > 0 ? 'text-destructive' : 'text-cta'}
                loading={isLoading}
              />
            </div>

            {/* Row 2: Payment & Hours Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Money Flow Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-heading">Money Flow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {stats && (
                    <>
                      {/* Gross → split */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Client Gross</span>
                          <span className="font-mono font-semibold">{formatCurrency(stats.total_client_gross)}</span>
                        </div>
                        <div className="w-full h-4 bg-secondary rounded-full overflow-hidden flex">
                          <div
                            className="bg-cta h-full"
                            style={{ width: `${stats.margin_pct}%` }}
                            title={`Company: ${formatCurrency(stats.total_margin)}`}
                          />
                          <div
                            className="bg-foreground/30 h-full"
                            style={{ width: `${stats.contractor_pct}%` }}
                            title={`Contractor: ${formatCurrency(stats.total_contractor_earnings)}`}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-cta">Company {stats.margin_pct}%</span>
                          <span className="text-muted-foreground">Contractor {stats.contractor_pct}%</span>
                        </div>
                      </div>

                      {/* Contractor breakdown */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">Contractor Breakdown</h4>
                          <div className="flex justify-between">
                            <span className="text-sm">Regular Earnings</span>
                            <span className="font-mono text-sm">{formatCurrency(stats.total_regular)}</span>
                          </div>
                          {stats.total_bonus > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm">
                                Bonus Share
                                <Badge variant="outline" className="ml-2 text-xs border-amber-500 text-amber-500">
                                  {stats.bonus_count}
                                </Badge>
                              </span>
                              <span className="font-mono text-sm text-amber-500">{formatCurrency(stats.total_bonus)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-border pt-2">
                            <span className="text-sm font-semibold">Total Owed</span>
                            <span className="font-mono text-sm font-semibold">{formatCurrency(stats.total_contractor_earnings)}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">Payment Status</h4>
                          <div className="flex justify-between">
                            <span className="text-sm flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3 text-cta" /> Paid
                            </span>
                            <span className="font-mono text-sm text-cta">{formatCurrency(stats.total_paid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm flex items-center gap-1">
                              <ArrowDownRight className="h-3 w-3 text-destructive" /> Pending
                            </span>
                            <span className="font-mono text-sm text-destructive">{formatCurrency(stats.total_pending)}</span>
                          </div>
                          <div className="pt-2">
                            <MiniBar value={stats.total_paid} max={stats.total_contractor_earnings} color="bg-cta" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {stats.payment_rate.toFixed(1)}% collected
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bank accounts */}
                      <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Bank Account Deposits</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                            <div className="h-8 w-8 rounded-full bg-cta/20 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-cta" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Admin (Chase)</p>
                              <p className="font-mono font-semibold">{formatCurrency(stats.admin_deposits)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                            <div className="h-8 w-8 rounded-full bg-foreground/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Contractor (Lead Bank)</p>
                              <p className="font-mono font-semibold">{formatCurrency(stats.contractor_deposits)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Right sidebar: Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-heading">Work Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stats && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Total Hours
                          </span>
                          <span className="font-mono font-semibold">{stats.total_hours.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Avg Hours/Period
                          </span>
                          <span className="font-mono">{stats.avg_hours_per_period}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Avg Earnings/Period
                          </span>
                          <span className="font-mono">{formatCurrency(stats.avg_earnings_per_period)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Pay Periods
                          </span>
                          <span className="font-mono">{stats.total_paystubs}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" /> Active Contractors
                          </span>
                          <span className="font-mono">{stats.active_contractors}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-heading">This Month</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Earnings</span>
                          <span className="font-mono font-semibold text-cta">
                            {formatCurrency(stats.this_month_earnings)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Hours</span>
                          <span className="font-mono">{stats.this_month_hours.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Company Margin</span>
                          <span className="font-mono">{formatCurrency(stats.this_month_margin)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Payment status badges */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-heading">Payment Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats && (
                      <>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className="border-yellow-600 text-yellow-600">Partially Paid</Badge>
                          <span className="font-mono text-sm">{stats.count_partial}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge className="bg-cta hover:bg-cta/90 text-white">Paid</Badge>
                          <span className="font-mono text-sm">{stats.count_paid}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge variant="destructive">Unpaid</Badge>
                          <span className="font-mono text-sm">{stats.count_unpaid}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 3: Monthly Trend */}
            {stats && stats.monthly_trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-heading">Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyTrendTable data={stats.monthly_trend} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
