'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, DollarSign, Clock, FileText, User, Building2,
  TrendingUp, Gift, Calculator, CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEarning } from '@/lib/hooks/useEarnings'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { EarningsBreakdown } from '@/lib/types/earning'

interface EarningDetailPageProps {
  params: Promise<{
    id: string
  }>
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      )
    case 'partially_paid':
      return (
        <Badge className="bg-yellow-600 hover:bg-yellow-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          Partially Paid
        </Badge>
      )
    default:
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Unpaid
        </Badge>
      )
  }
}

function VarianceStatusBadge({ status, amount }: { status: string; amount: number }) {
  if (status === 'correct') {
    return <Badge className="bg-emerald-600 hover:bg-emerald-700">Correct</Badge>
  }
  if (status === 'overpaid') {
    return (
      <Badge className="bg-blue-600 hover:bg-blue-700">
        Overpaid by {formatCurrency(Math.abs(amount))}
      </Badge>
    )
  }
  return (
    <Badge variant="destructive">
      Underpaid by {formatCurrency(Math.abs(amount))}
    </Badge>
  )
}

export default function EarningDetailPage({ params }: EarningDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: earning, isLoading, error } = useEarning(id)

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading earning details...</div>
        </div>
      </div>
    )
  }

  if (error || !earning) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-4">Failed to load earning details</p>
          <Button onClick={() => router.push('/earnings')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Earnings
          </Button>
        </div>
      </div>
    )
  }

  const breakdown: EarningsBreakdown | undefined = earning.earnings_breakdown

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/earnings')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Earning Details</h1>
          <p className="text-muted-foreground">
            Pay period: {formatDate(earning.pay_period_begin)} - {formatDate(earning.pay_period_end)}
          </p>
        </div>
        <div className="flex gap-2">
          {earning.paystub_id && (
            <Link href={`/paystubs/${earning.paystub_id}`}>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                View Paystub
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-secondary">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Client Gross Pay</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {formatCurrency(earning.client_gross_pay)}
            </p>
            {earning.client_name && (
              <p className="text-xs text-muted-foreground mt-1">{earning.client_name}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-cta" />
              <CardDescription>Contractor Earnings</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cta font-mono">
              {formatCurrency(earning.contractor_total_earnings)}
            </p>
            {earning.contractor_name && (
              <p className="text-xs text-muted-foreground mt-1">{earning.contractor_name}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Hours Worked</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {Number(earning.client_total_hours).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">hours</p>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Payment Status</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <PaymentStatusBadge status={earning.payment_status} />
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  Paid: <span className="font-mono text-emerald-500">{formatCurrency(earning.amount_paid)}</span>
                </span>
                {earning.amount_pending !== 0 && (
                  <span className="text-muted-foreground">
                    Pending: <span className={`font-mono ${Number(earning.amount_pending) > 0 ? 'text-red-500' : 'text-amber-500'}`}>
                      {formatCurrency(Math.abs(Number(earning.amount_pending)))}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown - Regular Lines */}
      {breakdown && breakdown.earnings_breakdown.length > 0 && (
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-cta" />
              <CardTitle>Earnings Breakdown</CardTitle>
            </div>
            <CardDescription>
              How contractor earnings are calculated from each pay line
              {breakdown.rate_type === 'fixed' && (
                <span className="ml-2 font-mono text-xs">
                  (Base rate: ${breakdown.rate_value}/hr contractor | ${breakdown.client_base_rate ?? '—'}/hr client)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-heading">Description</TableHead>
                    <TableHead className="font-heading text-right">Hours</TableHead>
                    <TableHead className="font-heading text-right">Multiplier</TableHead>
                    <TableHead className="font-heading text-right">Rate</TableHead>
                    <TableHead className="font-heading text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.earnings_breakdown.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{line.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(line.hours).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={line.multiplier > 1 ? 'default' : 'outline'} className="font-mono">
                          {line.multiplier}x
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(line.contractor_rate)}/hr
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(line.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-heading">
                      Regular Earnings Subtotal
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(earning.contractor_regular_earnings)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bonus Breakdown */}
      {breakdown && breakdown.bonus_count > 0 && (
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              <CardTitle>Bonus Breakdown</CardTitle>
            </div>
            <CardDescription>
              Bonus earnings split at {breakdown.bonus_split_percentage}% contractor share
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-heading">Description</TableHead>
                    <TableHead className="font-heading text-right">Client Amount</TableHead>
                    <TableHead className="font-heading text-right">Split %</TableHead>
                    <TableHead className="font-heading text-right">Contractor Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.bonus_items ? (
                    breakdown.bonus_items.map((bonus, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{bonus.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(bonus.client_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">{bonus.split_percentage}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-amber-500">
                          {formatCurrency(bonus.contractor_share)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="font-medium">Bonus Total</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(breakdown.bonus_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono">{breakdown.bonus_split_percentage}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-amber-500">
                        {formatCurrency(earning.contractor_bonus_share)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-heading">
                      Total Bonus Share
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-amber-500">
                      {formatCurrency(earning.contractor_bonus_share)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Summary */}
      <Card className="border-secondary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-cta" />
            <CardTitle>Calculation Summary</CardTitle>
          </div>
          <CardDescription>How all values add up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Rate info */}
            {breakdown && (
              <div className="rounded-md bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground mb-1">Rate Configuration</p>
                <p className="font-medium">
                  {breakdown.rate_type === 'fixed'
                    ? `Fixed rate: $${breakdown.rate_value}/hr`
                    : `Percentage: ${breakdown.rate_value}%`}
                  {breakdown.client_base_rate && (
                    <span className="text-muted-foreground ml-2">
                      (Client base rate: ${breakdown.client_base_rate}/hr)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Financial breakdown */}
            <div className="rounded-md border border-border">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Client Gross Pay</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(earning.client_gross_pay)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium pl-8">Regular Earnings</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(earning.contractor_regular_earnings)}
                    </TableCell>
                  </TableRow>
                  {earning.contractor_bonus_share > 0 && (
                    <TableRow>
                      <TableCell className="font-medium pl-8 text-amber-500">Bonus Share</TableCell>
                      <TableCell className="text-right font-mono text-amber-500">
                        + {formatCurrency(earning.contractor_bonus_share)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="border-t-2">
                    <TableCell className="font-heading">Contractor Total</TableCell>
                    <TableCell className="text-right font-mono font-bold text-cta">
                      {formatCurrency(earning.contractor_total_earnings)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">Company Margin</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(earning.company_margin)}
                      <span className="text-xs ml-1">
                        ({earning.client_gross_pay > 0
                          ? ((earning.company_margin / earning.client_gross_pay) * 100).toFixed(1)
                          : 0}%)
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Payment status */}
            <div className="rounded-md border border-border">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Amount Paid</TableCell>
                    <TableCell className="text-right font-mono text-emerald-500">
                      {formatCurrency(earning.amount_paid)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Amount Pending</TableCell>
                    <TableCell className={`text-right font-mono ${Number(earning.amount_pending) > 0 ? 'text-red-500' : Number(earning.amount_pending) < 0 ? 'text-amber-500' : ''}`}>
                      {formatCurrency(Number(earning.amount_pending))}
                    </TableCell>
                  </TableRow>
                  {earning.variance_status && (
                    <TableRow>
                      <TableCell className="font-medium">Payment Variance</TableCell>
                      <TableCell className="text-right">
                        <VarianceStatusBadge
                          status={earning.variance_status}
                          amount={earning.payment_variance ?? 0}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-3">
        {earning.paystub_id && (
          <Link href={`/paystubs/${earning.paystub_id}`}>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              View Source Paystub
            </Button>
          </Link>
        )}
        {earning.contractor_assignment_id && (
          <Link href={`/contractors/${earning.contractor_assignment_id}`}>
            <Button variant="outline" className="gap-2">
              <User className="h-4 w-4" />
              View Contractor
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
