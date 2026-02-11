'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PaymentForm } from '@/components/payments/PaymentForm'
import { ArrowLeft, Info, CheckCircle2 } from 'lucide-react'

function NewPaymentContent() {
  const searchParams = useSearchParams()
  const isManualMode = !!searchParams.get('earning_ids')
  const isManagerMode = searchParams.get('type') === 'manager'
  const personLabel = isManagerMode ? 'manager' : 'contractor'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href={isManualMode ? '/earnings/unpaid' : '/payments'}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {isManagerMode ? 'Record Manager Payment' : 'Record Payment'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isManualMode
              ? 'Review and confirm payment for selected earnings'
              : `Record a payment to a ${personLabel} with automatic allocation`}
          </p>
        </div>
      </div>

      {/* Info Box */}
      {isManualMode ? (
        <Card className="border-cta/30 bg-cta/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-cta mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Selected Earnings</h3>
                <p className="text-sm text-muted-foreground">
                  You selected specific earnings to pay from the unpaid list. The {personLabel}
                  {' '}and amount are pre-filled. Review the details and confirm.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                  <li>Choose a payment method and date</li>
                  <li>Add a transaction reference for your records</li>
                  <li>The selected earnings will be marked as paid after recording</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-cta/30 bg-cta/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-cta mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">FIFO Allocation</h3>
                <p className="text-sm text-muted-foreground">
                  Payments are automatically allocated to unpaid earnings using{' '}
                  <strong>First In, First Out (FIFO)</strong> logic. The oldest unpaid
                  earnings will be paid first.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                  <li>
                    Select a {personLabel} and enter the payment amount to see the allocation
                    preview
                  </li>
                  <li>
                    The system will show exactly which pay periods will be paid and how much
                  </li>
                  <li>
                    If the payment amount exceeds total pending, the extra will not be
                    allocated
                  </li>
                  <li>All allocations are recorded for audit and reporting purposes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      <PaymentForm />
    </div>
  )
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cta"></div>
      </div>
    }>
      <NewPaymentContent />
    </Suspense>
  )
}
