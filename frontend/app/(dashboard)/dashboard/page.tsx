'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, FileText, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    {
      title: 'Total Contractors',
      value: '0',
      icon: Users,
      color: 'text-cta',
    },
    {
      title: 'Unpaid Amount',
      value: '$0.00',
      icon: DollarSign,
      color: 'text-text',
    },
    {
      title: 'Recent Paystubs',
      value: '0',
      icon: FileText,
      color: 'text-text',
    },
    {
      title: 'This Month',
      value: '$0.00',
      icon: TrendingUp,
      color: 'text-text',
    },
  ]

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
                  <div className={`text-2xl md:text-3xl font-heading ${stat.color}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Getting Started Card */}
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
      </div>
    </div>
  )
}
