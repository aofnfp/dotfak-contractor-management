'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PaymentForm } from '@/components/payments/PaymentForm'
import { ArrowLeft, Info } from 'lucide-react'

/**
 * Record Payment Page
 *
 * Page for recording new contractor payments with FIFO allocation
 */
export default function NewPaymentPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/payments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Record Payment</h1>
          <p className="text-muted-foreground mt-2">
            Record a payment to a contractor with automatic allocation
          </p>
        </div>
      </div>

      {/* Info Box */}
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
                  Select a contractor and enter the payment amount to see the allocation
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

      {/* Payment Form */}
      <PaymentForm />
    </div>
  )
}
