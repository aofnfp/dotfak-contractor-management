/**
 * React Query hooks for manager earnings
 */

import { useQuery } from '@tanstack/react-query'
import { managerEarningsApi } from '@/lib/api/managers'

export function useManagerEarnings(filters?: { manager_id?: string; payment_status?: string }) {
  return useQuery({
    queryKey: ['manager-earnings', filters],
    queryFn: () => managerEarningsApi.getAll(filters),
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

export function useUnpaidManagerEarnings() {
  return useQuery({
    queryKey: ['manager-earnings', 'unpaid'],
    queryFn: () => managerEarningsApi.getUnpaid(),
  })
}

export function useManagerEarningsByIds(ids: string[]) {
  return useQuery({
    queryKey: ['manager-earnings', 'byIds', ...ids],
    queryFn: () => managerEarningsApi.getByIds(ids),
    enabled: ids.length > 0,
  })
}
