/**
 * React Query hooks for client companies
 */

import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api/clients'

/**
 * Hook to fetch all client companies
 */
export function useClients(enabled = true) {
  return useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
    enabled,
  })
}

/**
 * Hook to fetch a single client company
 */
export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
  })
}
