'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useEarningsByIds } from '@/lib/hooks/useEarnings'
import { useCreatePayment, useAllocationPreview } from '@/lib/hooks/usePayments'
import { paymentsApi } from '@/lib/api/payments'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import type { PaymentMethod } from '@/lib/types/payment'

interface IndividualPaymentRow {
  earning_id: string
  pay_period_begin: string
  pay_period_end: string
  earned: number
  amount: number
  payment_date: string
  transaction_reference: string
  payment_method: PaymentMethod
}

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
  const searchParams = useSearchParams()
  const { data: contractors } = useContractors()
  const createPayment = useCreatePayment()

  // Check for manual allocation mode (earning_ids in URL)
  const earningIdsParam = searchParams.get('earning_ids')
  const earningIds = useMemo(
    () => (earningIdsParam ? earningIdsParam.split(',').filter(Boolean) : []),
    [earningIdsParam]
  )
  const isManualMode = earningIds.length > 0
  const isMultiEarning = earningIds.length > 1

  // Payment mode: single (one check) or individual (separate checks)
  const [paymentMode, setPaymentMode] = useState<'single' | 'individual'>('single')
  const isIndividualMode = isManualMode && isMultiEarning && paymentMode === 'individual'

  // Fetch pre-selected earnings for manual mode
  const { data: selectedEarnings, isLoading: earningsLoading } = useEarningsByIds(earningIds)

  // Derive contractor and amount from selected earnings
  const manualInfo = useMemo(() => {
    if (!selectedEarnings || selectedEarnings.length === 0) {
      return { contractorId: '', contractorName: '', totalPending: 0 }
    }
    const first = selectedEarnings[0]
    return {
      contractorId: first.contractor_id,
      contractorName: `${first.contractor_code} - ${first.contractor_name}`,
      totalPending: selectedEarnings.reduce((sum, e) => sum + e.amount_pending, 0),
    }
  }, [selectedEarnings])

  const [selectedContractorId, setSelectedContractorId] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [debouncedAmount, setDebouncedAmount] = useState<number>(0)

  // Individual mode state
  const [individualRows, setIndividualRows] = useState<IndividualPaymentRow[]>([])
  const [sharedNotes, setSharedNotes] = useState('')
  const [isSubmittingIndividual, setIsSubmittingIndividual] = useState(false)
  const [submitProgress, setSubmitProgress] = useState({ current: 0, total: 0 })

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

  // Auto-fill form values when manual mode earnings load
  useEffect(() => {
    if (isManualMode && manualInfo.contractorId) {
      setSelectedContractorId(manualInfo.contractorId)
      setValue('contractor_id', manualInfo.contractorId, { shouldValidate: true })
      setPaymentAmount(manualInfo.totalPending)
      setDebouncedAmount(manualInfo.totalPending)
      setValue('amount', manualInfo.totalPending, { shouldValidate: true })
    }
  }, [isManualMode, manualInfo.contractorId, manualInfo.totalPending, setValue])

  // Initialize individual rows when earnings load or mode switches
  useEffect(() => {
    if (selectedEarnings && selectedEarnings.length > 0 && paymentMode === 'individual') {
      const today = new Date().toISOString().split('T')[0]
      setIndividualRows(
        selectedEarnings.map((e) => ({
          earning_id: e.id,
          pay_period_begin: e.pay_period_begin,
          pay_period_end: e.pay_period_end,
          earned: e.contractor_total_earnings,
          amount: e.amount_pending,
          payment_date: today,
          transaction_reference: '',
          payment_method: 'direct_deposit' as PaymentMethod,
        }))
      )
    }
  }, [selectedEarnings, paymentMode])

  // Debounce amount changes (500ms delay) — only for FIFO mode
  useEffect(() => {
    if (isManualMode) return
    const timeoutId = setTimeout(() => {
      setDebouncedAmount(paymentAmount)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [paymentAmount, isManualMode])

  // Fetch allocation preview with debounced amount — only for FIFO mode
  const { data: allocationPreview, isLoading: previewLoading } = useAllocationPreview(
    isManualMode ? '' : selectedContractorId,
    isManualMode ? 0 : debouncedAmount
  )

  // Memoize FIFO summary calculations
  const fifoSummary = useMemo(() => {
    if (!allocationPreview || allocationPreview.length === 0) {
      return { totalPending: 0, willAllocate: 0, remaining: 0 }
    }
    return {
      totalPending: allocationPreview.reduce((sum, item) => sum + item.current_pending, 0),
      willAllocate: allocationPreview.reduce((sum, item) => sum + item.will_allocate, 0),
      remaining: allocationPreview.reduce((sum, item) => sum + item.new_pending, 0),
    }
  }, [allocationPreview])

  // Individual mode total
  const individualTotal = useMemo(
    () => individualRows.reduce((sum, r) => sum + r.amount, 0),
    [individualRows]
  )

  // Single payment submit
  const onSubmit = async (data: PaymentFormData) => {
    const payload: any = { ...data }

    // In manual mode, include explicit allocations
    if (isManualMode && selectedEarnings) {
      payload.allocate_to_earnings = selectedEarnings.map((e) => ({
        earning_id: e.id,
        amount: e.amount_pending,
      }))
    }

    await createPayment.mutateAsync(payload)
    router.push('/payments')
  }

  // Individual payments submit
  const handleIndividualSubmit = async () => {
    const validRows = individualRows.filter((r) => r.amount > 0)
    if (validRows.length === 0 || !manualInfo.contractorId) return

    setIsSubmittingIndividual(true)
    setSubmitProgress({ current: 0, total: validRows.length })

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i]
        await paymentsApi.create({
          contractor_id: manualInfo.contractorId,
          amount: row.amount,
          payment_method: row.payment_method,
          payment_date: row.payment_date,
          transaction_reference: row.transaction_reference || undefined,
          notes: sharedNotes || undefined,
          allocate_to_earnings: [{ earning_id: row.earning_id, amount: row.amount }],
        })
        setSubmitProgress({ current: i + 1, total: validRows.length })
      }
      router.push('/payments')
    } catch (error) {
      console.error('Failed to create individual payments:', error)
    } finally {
      setIsSubmittingIndividual(false)
    }
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

  const updateIndividualRow = (index: number, field: keyof IndividualPaymentRow, value: any) => {
    setIndividualRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: field === 'amount' ? (parseFloat(value) || 0) : value }
      return updated
    })
  }

  // Manual mode loading state
  if (isManualMode && earningsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-11 w-11 animate-spin text-cta" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle — only shown for multiple earnings */}
      {isManualMode && isMultiEarning && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium mr-2">Payment Style:</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPaymentMode('single')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    paymentMode === 'single'
                      ? 'bg-cta text-white'
                      : 'bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Single Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('individual')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    paymentMode === 'individual'
                      ? 'bg-cta text-white'
                      : 'bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Individual Payments
                </button>
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {paymentMode === 'single'
                  ? 'One check covers all earnings'
                  : 'Separate check per earning'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {isIndividualMode ? (
        /* ===== INDIVIDUAL PAYMENTS MODE ===== */
        <div className="space-y-6">
          {/* Contractor (locked) */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Payments</CardTitle>
              <CardDescription>
                Each earning gets its own payment with separate amount, date, and reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contractor</Label>
                <Input
                  value={manualInfo.contractorName}
                  disabled
                  className="bg-secondary/30"
                />
              </div>

              {/* Editable table */}
              <div className="border border-border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      <TableHead className="font-heading min-w-[140px]">Pay Period</TableHead>
                      <TableHead className="font-heading text-right min-w-[80px]">Earned</TableHead>
                      <TableHead className="font-heading min-w-[110px]">Amount</TableHead>
                      <TableHead className="font-heading min-w-[140px]">Date</TableHead>
                      <TableHead className="font-heading min-w-[150px]">Reference</TableHead>
                      <TableHead className="font-heading min-w-[140px]">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {individualRows.map((row, idx) => (
                      <TableRow key={row.earning_id}>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-foreground">
                              {formatDate(row.pay_period_begin)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              to {formatDate(row.pay_period_end)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(row.earned)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amount || ''}
                            onChange={(e) => updateIndividualRow(idx, 'amount', e.target.value)}
                            disabled={isSubmittingIndividual}
                            className="w-24 font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.payment_date}
                            onChange={(e) => updateIndividualRow(idx, 'payment_date', e.target.value)}
                            disabled={isSubmittingIndividual}
                            className="w-36"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="CHK-001"
                            value={row.transaction_reference}
                            onChange={(e) => updateIndividualRow(idx, 'transaction_reference', e.target.value)}
                            disabled={isSubmittingIndividual}
                            className="w-36"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.payment_method}
                            onValueChange={(v) => updateIndividualRow(idx, 'payment_method', v)}
                            disabled={isSubmittingIndividual}
                          >
                            <SelectTrigger className="w-36">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="bg-secondary/20 p-4 rounded-md flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total ({individualRows.filter((r) => r.amount > 0).length} payments):
                </span>
                <span className="font-mono font-bold text-cta text-lg">
                  {formatCurrency(individualTotal)}
                </span>
              </div>

              {/* Shared Notes */}
              <div className="space-y-2">
                <Label htmlFor="shared_notes">Notes (applied to all payments)</Label>
                <Textarea
                  id="shared_notes"
                  placeholder="Optional notes about these payments"
                  rows={2}
                  value={sharedNotes}
                  onChange={(e) => setSharedNotes(e.target.value)}
                  disabled={isSubmittingIndividual}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/earnings/unpaid')}
              disabled={isSubmittingIndividual}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-cta hover:bg-cta/90"
              disabled={isSubmittingIndividual || individualRows.filter((r) => r.amount > 0).length === 0}
              onClick={handleIndividualSubmit}
            >
              {isSubmittingIndividual ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording {submitProgress.current}/{submitProgress.total}...
                </>
              ) : (
                `Record ${individualRows.filter((r) => r.amount > 0).length} Payments (${formatCurrency(individualTotal)})`
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* ===== SINGLE PAYMENT MODE (existing) ===== */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  {isManualMode
                    ? 'Paying selected earnings — contractor and amount are pre-filled'
                    : 'Enter the payment information'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contractor Selection */}
                <div className="space-y-2">
                  <Label htmlFor="contractor_id">Contractor *</Label>
                  {isManualMode ? (
                    <Input
                      value={manualInfo.contractorName}
                      disabled
                      className="bg-secondary/30"
                    />
                  ) : (
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
                  )}
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
                    value={paymentAmount || ''}
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

            {/* Right Panel: Manual Allocation Preview OR FIFO Preview */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isManualMode ? 'Selected Earnings' : 'Allocation Preview'}
                </CardTitle>
                <CardDescription>
                  {isManualMode
                    ? `${selectedEarnings?.length || 0} earning(s) will be marked as paid`
                    : 'FIFO allocation - oldest earnings paid first'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isManualMode ? (
                  /* Manual mode: show selected earnings */
                  selectedEarnings && selectedEarnings.length > 0 ? (
                    <div className="space-y-4">
                      <div className="border border-border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-secondary/50">
                              <TableHead className="font-heading">Pay Period</TableHead>
                              <TableHead className="font-heading text-right">Hours</TableHead>
                              <TableHead className="font-heading text-right">Earned</TableHead>
                              <TableHead className="font-heading text-right">Pending</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedEarnings.map((earning) => (
                              <TableRow key={earning.id}>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="font-medium text-foreground">
                                      {formatDate(earning.pay_period_begin)}
                                    </div>
                                    <div className="text-muted-foreground">
                                      to {formatDate(earning.pay_period_end)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {Number(earning.client_total_hours).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(earning.contractor_total_earnings)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-bold text-cta font-mono">
                                    {formatCurrency(earning.amount_pending)}
                                  </span>
                                  <CheckCircle className="inline-block h-4 w-4 text-cta ml-2" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Summary */}
                      <div className="bg-secondary/20 p-4 rounded-md space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Earnings:</span>
                          <span className="font-mono font-medium">
                            {formatCurrency(
                              selectedEarnings.reduce((s, e) => s + e.contractor_total_earnings, 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Already Paid:</span>
                          <span className="font-mono font-medium">
                            {formatCurrency(
                              selectedEarnings.reduce((s, e) => s + e.amount_paid, 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border pt-2">
                          <span className="text-muted-foreground font-semibold">This Payment:</span>
                          <span className="font-mono font-bold text-cta">
                            {formatCurrency(manualInfo.totalPending)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No earnings found for the selected IDs
                      </p>
                    </div>
                  )
                ) : (
                  /* FIFO mode: existing preview */
                  !selectedContractorId || paymentAmount <= 0 ? (
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
                            {formatCurrency(fifoSummary.totalPending)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Will Allocate:</span>
                          <span className="font-mono font-bold text-cta">
                            {formatCurrency(fifoSummary.willAllocate)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining After:</span>
                          <span
                            className={`font-mono font-medium ${
                              fifoSummary.remaining > 0
                                ? 'text-destructive'
                                : 'text-cta'
                            }`}
                          >
                            {formatCurrency(fifoSummary.remaining)}
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
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(isManualMode ? '/earnings/unpaid' : '/payments')}
              disabled={createPayment.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cta hover:bg-cta/90"
              disabled={
                createPayment.isPending ||
                (isManualMode
                  ? !selectedEarnings || selectedEarnings.length === 0
                  : !selectedContractorId || paymentAmount <= 0)
              }
            >
              {createPayment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                `Record Payment${isManualMode ? ` (${formatCurrency(paymentAmount)})` : ''}`
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
