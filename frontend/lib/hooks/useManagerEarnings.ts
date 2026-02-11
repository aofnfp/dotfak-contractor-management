/**
 * React Query hooks for manager earnings
 */

import { useQuery } from '@tanstack/react-query'
import { managerEarningsApi } from '@/lib/api/managers'

export function useManagerEarnings(managerId?: string) {
  return useQuery({
    queryKey: ['manager-earnings', managerId],
    queryFn: () => managerEarningsApi.getAll(managerId),
  })
}

export function useManagerEarning(id: string) {
  return useQuery({
    queryKey: ['manager-earnings', id],
    queryFn: () => managerEarningsApi.getById(id),
    enabled: !!id,
  })
}

export function useManagerEarningsSummary(enabled = true) {
  return useQuery({
    queryKey: ['manager-earnings', 'summary'],
    queryFn: () => managerEarningsApi.getSummary(),
    enabled,
  })
}
