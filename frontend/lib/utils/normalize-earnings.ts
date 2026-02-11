/**
 * Normalize manager earnings to match the EarningWithDetails shape
 * so we can reuse the same EarningsTable and summary UI.
 */

import type { EarningWithDetails, EarningsSummary, PaymentStatus } from '@/lib/types/earning'
import type { ManagerEarning, ManagerEarningsSummary } from '@/lib/types/manager'

export function normalizeManagerEarning(e: ManagerEarning): EarningWithDetails {
  return {
    id: e.id,
    contractor_assignment_id: e.contractor_assignment_id,
    paystub_id: String(e.paystub_id),
    pay_period_begin: e.pay_period_begin || '',
    pay_period_end: e.pay_period_end || '',
    client_gross_pay: 0,
    client_total_hours: e.staff_total_hours,
    contractor_regular_earnings: e.total_earnings,
    contractor_bonus_share: 0,
    contractor_total_earnings: e.total_earnings,
    company_margin: 0,
    payment_status: e.payment_status as PaymentStatus,
    amount_paid: e.amount_paid,
    amount_pending: e.amount_pending,
    created_at: e.created_at,
    updated_at: e.created_at,
    contractor_id: e.manager_id,
    client_company_id: '',
    contractor_name: e.contractor_name || '—',
    contractor_code: `$${e.flat_hourly_rate.toFixed(2)}/hr`,
    client_name: e.client_name || '—',
    client_code: '',
    paystub_file_name: '',
    paystub_check_date: '',
  }
}

export function normalizeManagerEarnings(earnings: ManagerEarning[]): EarningWithDetails[] {
  return earnings.map(normalizeManagerEarning)
}

export function normalizeManagerSummary(s: ManagerEarningsSummary): EarningsSummary {
  return {
    total_regular: s.total_earnings,
    total_bonus: 0,
    total_earnings: s.total_earnings,
    total_paid: s.total_paid,
    total_pending: s.total_pending,
    count_unpaid: s.count_unpaid,
    count_partially_paid: s.count_partially_paid,
    count_paid: s.count_paid,
    count_with_bonus: 0,
  }
}
