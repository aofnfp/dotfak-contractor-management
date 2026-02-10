import { useQuery } from '@tanstack/react-query'
import { earningsApi } from '@/lib/api/earnings'
import type { EarningsFilters } from '@/lib/types/earning'

/**
 * List all earnings with optional filters
 */
export function useEarnings(filters?: EarningsFilters) {
  return useQuery({
    queryKey: ['earnings', filters],
    queryFn: () => earningsApi.list(filters),
  })
}

/**
 * Get a single earning by ID
 */
export function useEarning(id: string) {
  return useQuery({
    queryKey: ['earnings', id],
    queryFn: () => earningsApi.get(id),
    enabled: !!id,
  })
}

/**
 * Get earnings for a specific contractor
 */
export function useEarningsByContractor(contractorId: string) {
  return useQuery({
    queryKey: ['earnings', 'contractor', contractorId],
    queryFn: () => earningsApi.getByContractor(contractorId),
    enabled: !!contractorId,
  })
}

/**
 * Get earnings for a specific client company
 */
export function useEarningsByClient(clientId: string) {
  return useQuery({
    queryKey: ['earnings', 'client', clientId],
    queryFn: () => earningsApi.getByClient(clientId),
    enabled: !!clientId,
  })
}

/**
 * Get all unpaid earnings
 */
export function useUnpaidEarnings() {
  return useQuery({
    queryKey: ['earnings', 'unpaid'],
    queryFn: () => earningsApi.getUnpaid(),
  })
}

/**
 * Get multiple earnings by IDs
 */
export function useEarningsByIds(ids: string[]) {
  return useQuery({
    queryKey: ['earnings', 'byIds', ...ids],
    queryFn: () => earningsApi.getByIds(ids),
    enabled: ids.length > 0,
  })
}

/**
 * Get earnings summary stats
 */
export function useEarningsSummary() {
  return useQuery({
    queryKey: ['earnings', 'summary'],
    queryFn: () => earningsApi.getSummary(),
  })
}
