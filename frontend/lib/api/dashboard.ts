/**
 * Dashboard API client
 * Handles dashboard statistics and metrics
 */

import apiClient from './client'

export interface DashboardStats {
  total_contractors: number
  total_unpaid: number
  recent_paystubs: number
  this_month_earnings: number
}

export const dashboardApi = {
  /**
   * Get dashboard statistics
   * Returns overview metrics for admin dashboard
   */
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/dashboard/stats')
    return response.data
  },
}
