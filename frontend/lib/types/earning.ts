/**
 * Earning Types
 *
 * TypeScript interfaces for contractor earnings data
 */

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid'

export interface Earning {
  id: string
  contractor_assignment_id: string
  paystub_id: string
  pay_period_begin: string
  pay_period_end: string
  client_gross_pay: number
  client_total_hours: number
  contractor_regular_earnings: number
  contractor_bonus_share: number
  contractor_total_earnings: number
  company_margin: number
  payment_status: PaymentStatus
  amount_paid: number
  amount_pending: number
  created_at: string
  updated_at: string
}

export interface EarningWithDetails extends Earning {
  contractor_name: string
  contractor_code: string
  client_name: string
  client_code: string
  paystub_file_name: string
  paystub_check_date: string
}

/**
 * Summary stats for earnings overview
 */
export interface EarningsSummary {
  total_earnings: number
  total_paid: number
  total_pending: number
  count_unpaid: number
  count_partially_paid: number
  count_paid: number
}

/**
 * Filter options for earnings list
 */
export interface EarningsFilters {
  contractor_id?: string
  client_id?: string
  payment_status?: PaymentStatus
  start_date?: string
  end_date?: string
}
