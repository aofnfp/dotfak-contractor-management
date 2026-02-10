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

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/dashboard/stats')
    return response.data
  },
}
