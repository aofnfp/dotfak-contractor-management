/**
 * React Query hooks for dashboard statistics
 */

import { useQuery } from '@tanstack/react-query'
import { dashboardApi, type DashboardStats, type ContractorDashboardStats } from '@/lib/api/dashboard'

/**
 * Hook to fetch dashboard statistics
 * Returns overview metrics for admin dashboard
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    // Refetch every 30 seconds to keep stats fresh
    refetchInterval: 30000,
    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch contractor's own dashboard statistics
 */
export function useContractorDashboardStats() {
  return useQuery<ContractorDashboardStats>({
    queryKey: ['dashboard', 'contractor'],
    queryFn: dashboardApi.getContractorStats,
    refetchInterval: 30000,
    placeholderData: (previousData) => previousData,
  })
}
