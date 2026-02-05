/**
 * Payment Types
 *
 * TypeScript interfaces for payment tracking and allocation
 */

export type PaymentMethod =
  | 'direct_deposit'
  | 'check'
  | 'cash'
  | 'wire_transfer'
  | 'other'

export interface Payment {
  id: string
  contractor_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  transaction_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentWithDetails extends Payment {
  contractor_name: string
  contractor_code: string
  allocations: PaymentAllocation[]
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  earning_id: string
  amount: number
  created_at: string
  // Extended details for display
  earning_pay_period_begin?: string
  earning_pay_period_end?: string
  earning_total?: number
}

/**
 * For creating a new payment
 */
export interface CreatePaymentRequest {
  contractor_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  transaction_reference?: string
  notes?: string
  allocate_to_earnings?: {
    earning_id: string
    amount: number
  }[]
}

/**
 * FIFO allocation preview
 * Shows how payment will be distributed across unpaid earnings
 */
export interface AllocationPreviewItem {
  earning_id: string
  pay_period_begin: string
  pay_period_end: string
  current_pending: number
  will_allocate: number
  new_pending: number
  fully_paid: boolean
}

/**
 * Payment summary stats
 */
export interface PaymentsSummary {
  total_payments: number
  total_amount: number
  count_by_method: Record<PaymentMethod, number>
  recent_payments: PaymentWithDetails[]
}
