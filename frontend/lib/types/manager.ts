/**
 * Manager Types
 *
 * TypeScript interfaces for manager-related data
 */

export interface Manager {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  auth_user_id?: string
  onboarding_status: 'not_invited' | 'invited' | 'in_progress' | 'completed'
  is_active: boolean
  notes?: string
  created_at: string
  updated_at?: string
  managed_count?: number
}

export interface CreateManagerRequest {
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  notes?: string
  is_active?: boolean
}

export interface UpdateManagerRequest extends Partial<CreateManagerRequest> {}

export interface ManagerAssignment {
  id: string
  manager_id: string
  contractor_assignment_id: string
  flat_hourly_rate: number
  start_date: string
  end_date?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at?: string
  // Enriched
  manager_name?: string
  contractor_name?: string
  client_name?: string
}

export interface CreateManagerAssignmentRequest {
  manager_id: string
  contractor_assignment_id: string
  flat_hourly_rate: number
  start_date: string
  end_date?: string
  is_active?: boolean
  notes?: string
}

export interface UpdateManagerAssignmentRequest {
  flat_hourly_rate?: number
  start_date?: string
  end_date?: string
  is_active?: boolean
  notes?: string
}

export type ManagerPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overpaid'

export interface ManagerEarning {
  id: string
  manager_id: string
  manager_assignment_id: string
  paystub_id: number
  contractor_assignment_id: string
  pay_period_begin?: string
  pay_period_end?: string
  staff_total_hours: number
  flat_hourly_rate: number
  total_earnings: number
  amount_paid: number
  amount_pending: number
  payment_status: ManagerPaymentStatus
  notes?: string
  created_at: string
  // Enriched
  manager_name?: string
  contractor_name?: string
  client_name?: string
}

export interface ManagerEarningsSummary {
  total_earnings: number
  total_paid: number
  total_pending: number
  count_total: number
  count_paid: number
  count_unpaid: number
  count_partially_paid: number
}
