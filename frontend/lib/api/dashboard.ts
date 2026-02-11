/**
 * Dashboard API client
 * Handles dashboard statistics and metrics
 */

import apiClient from './client'

export interface MonthlyTrend {
  month: string
  paystubs: number
  hours: number
  client_gross: number
  contractor_earnings: number
  regular: number
  bonus: number
  margin: number
  paid: number
  pending: number
  margin_pct: number
}

export interface DashboardStats {
  // Top-line KPIs
  total_contractors: number
  active_contractors: number
  total_paystubs: number
  recent_paystubs: number

  // Financial overview
  total_client_gross: number
  total_contractor_earnings: number
  total_regular: number
  total_bonus: number
  total_margin: number
  margin_pct: number
  contractor_pct: number

  // Payment status
  total_paid: number
  total_pending: number
  total_unpaid: number
  payment_rate: number
  count_paid: number
  count_partial: number
  count_unpaid: number
  bonus_count: number

  // Hours
  total_hours: number
  avg_hours_per_period: number
  avg_earnings_per_period: number

  // This month
  this_month_earnings: number
  this_month_hours: number
  this_month_margin: number

  // Bank flow
  admin_deposits: number
  contractor_deposits: number

  // Date range
  earliest_period: string | null
  latest_period: string | null

  // Monthly trend
  monthly_trend: MonthlyTrend[]
}

export interface ContractorMonthlyTrend {
  month: string
  hours: number
  earnings: number
  regular: number
  bonus: number
  paid: number
  pending: number
}

export interface ContractorDashboardStats {
  contractor_name: string
  contractor_code: string

  // Assignment
  assignments: {
    client_name: string
    client_code: string | null
    hourly_rate: number
    bonus_percentage: number
  }[]

  // Contract
  contract: {
    id: string
    status: string
    type: string
    version: number
  } | null

  // Earnings
  total_earnings: number
  total_regular: number
  total_bonus: number
  total_hours: number
  total_pay_periods: number

  // Payment
  total_paid: number
  total_pending: number
  payment_rate: number
  count_paid: number
  count_unpaid: number

  // This month
  this_month_earnings: number
  this_month_hours: number

  // Date range
  earliest_period: string | null
  latest_period: string | null

  // Monthly trend
  monthly_trend: ContractorMonthlyTrend[]

  // Manager
  manager: {
    name: string
    email: string | null
    phone: string | null
  } | null
}

export interface ManagerStaffMember {
  contractor_assignment_id: string
  contractor_name: string
  client_name: string
  total_hours: number
}

export interface ManagerDashboardStats {
  manager_name: string

  // Staff
  staff_count: number
  staff: ManagerStaffMember[]

  // Own earnings
  total_earnings: number
  total_paid: number
  total_pending: number
  total_hours: number
  payment_rate: number
  count_paid: number
  count_unpaid: number

  // This month
  this_month_earnings: number
  this_month_hours: number

  // Devices
  devices: {
    total: number
    in_use: number
    received: number
    delivered: number
  }

  // Date range
  earliest_period: string | null
  latest_period: string | null
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/dashboard/stats')
    return response.data
  },

  getContractorStats: async (): Promise<ContractorDashboardStats> => {
    const response = await apiClient.get('/dashboard/contractor')
    return response.data
  },

  getManagerStats: async (): Promise<ManagerDashboardStats> => {
    const response = await apiClient.get('/dashboard/manager')
    return response.data
  },
}
