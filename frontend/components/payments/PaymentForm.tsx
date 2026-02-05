'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useContractors } from '@/lib/hooks/useContractors'
import { useCreatePayment, useAllocationPreview } from '@/lib/hooks/usePayments'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import type { PaymentMethod } from '@/lib/types/payment'

const paymentFormSchema = z.object({
  contractor_id: z.string().min(1, 'Contractor is required'),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['direct_deposit', 'check', 'cash', 'wire_transfer', 'other']),
  payment_date: z.string().min(1, 'Payment date is required'),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentFormSchema>

export function PaymentForm() {
  const router = useRouter()
  const { data: contractors } = useContractors()
  const createPayment = useCreatePayment()
  
  const [selectedContractorId, setSelectedContractorId] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [debouncedAmount, setDebouncedAmount] = useState<number>(0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'direct_deposit',
    },
  })

  // Debounce amount changes (500ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedAmount(paymentAmount)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [paymentAmount])

  const watchedAmount = watch('amount')

  // Fetch allocation preview with debounced amount
  const { data: allocationPreview, isLoading: previewLoading } = useAllocationPreview(
    selectedContractorId,
    debouncedAmount
  )

  // Memoize summary calculations to prevent recalculation on every render
  const summary = useMemo(() => {
    if (!allocationPreview || allocationPreview.length === 0) {
      return { totalPending: 0, willAllocate: 0, remaining: 0 }
    }

    return {
      totalPending: allocationPreview.reduce((sum, item) => sum + item.current_pending, 0),
      willAllocate: allocationPreview.reduce((sum, item) => sum + item.will_allocate, 0),
      remaining: allocationPreview.reduce((sum, item) => sum + item.new_pending, 0),
    }
  }, [allocationPreview])

  const onSubmit = async (data: PaymentFormData) => {
    await createPayment.mutateAsync(data)
    router.push('/payments')
  }

  const handleContractorChange = (contractorId: string) => {
    setSelectedContractorId(contractorId)
    setValue('contractor_id', contractorId)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0
    setPaymentAmount(value)
    setValue('amount', value)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Enter the payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contractor Selection */}
            <div className="space-y-2">
              <Label htmlFor="contractor_id">Contractor *</Label>
              <Select
                onValueChange={handleContractorChange}
                disabled={createPayment.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractors?.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.contractor_code} - {contractor.first_name}{' '}
                      {contractor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contractor_id && (
                <p className="text-sm text-destructive" role="alert" aria-live="polite">{errors.contractor_id.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                onChange={handleAmountChange}
                disabled={createPayment.isPending}
              />
              {errors.amount && (
                <p className="text-sm text-destructive" role="alert" aria-live="polite">{errors.amount.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                onValueChange={(value) =>
                  setValue('payment_method', value as PaymentMethod)
                }
                defaultValue="direct_deposit"
                disabled={createPayment.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                {...register('payment_date')}
                disabled={createPayment.isPending}
              />
              {errors.payment_date && (
                <p className="text-sm text-destructive" role="alert" aria-live="polite">{errors.payment_date.message}</p>
              )}
            </div>

            {/* Transaction Reference */}
            <div className="space-y-2">
              <Label htmlFor="transaction_reference">Transaction Reference</Label>
              <Input
                id="transaction_reference"
                placeholder="e.g., CHECK-12345 or TXN-ABC123"
                {...register('transaction_reference')}
                disabled={createPayment.isPending}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this payment"
                rows={3}
                {...register('notes')}
                disabled={createPayment.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* FIFO Allocation Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation Preview</CardTitle>
            <CardDescription>
              FIFO allocation - oldest earnings paid first
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedContractorId || paymentAmount <= 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a contractor and enter an amount to see the allocation preview
                </p>
              </div>
            ) : previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-11 w-11 animate-spin text-cta" />
              </div>
            ) : allocationPreview && allocationPreview.length > 0 ? (
              <div className="space-y-4">
                {/* Allocation Table */}
                <div className="border border-border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/50">
                        <TableHead className="font-heading">Pay Period</TableHead>
                        <TableHead className="font-heading text-right">Pending</TableHead>
                        <TableHead className="font-heading text-right">Will Pay</TableHead>
                        <TableHead className="font-heading text-right">New Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocationPreview.map((item) => (
                        <TableRow key={item.earning_id}>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium text-foreground">
                                {formatDate(item.pay_period_begin)}
                              </div>
                              <div className="text-muted-foreground">
                                to {formatDate(item.pay_period_end)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(item.current_pending)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-cta font-mono">
                              {formatCurrency(item.will_allocate)}
                            </span>
                            {item.fully_paid && (
                              <CheckCircle className="inline-block h-4 w-4 text-cta ml-2" />
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            <span
                              className={
                                item.new_pending > 0
                                  ? 'text-destructive'
                                  : 'text-cta'
                              }
                            >
                              {formatCurrency(item.new_pending)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="bg-secondary/20 p-4 rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Pending:</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(summary.totalPending)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Will Allocate:</span>
                    <span className="font-mono font-bold text-cta">
                      {formatCurrency(summary.willAllocate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining After:</span>
                    <span
                      className={`font-mono font-medium ${
                        summary.remaining > 0
                          ? 'text-destructive'
                          : 'text-cta'
                      }`}
                    >
                      {formatCurrency(summary.remaining)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-cta mb-4" />
                <p className="text-muted-foreground">
                  No unpaid earnings for this contractor
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/payments')}
          disabled={createPayment.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-cta hover:bg-cta/90"
          disabled={createPayment.isPending || !selectedContractorId || paymentAmount <= 0}
        >
          {createPayment.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            'Record Payment'
          )}
        </Button>
      </div>
    </form>
  )
}
