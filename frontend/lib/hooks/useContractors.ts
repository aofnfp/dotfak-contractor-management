/**
 * React Query hooks for contractors
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractorsApi, type Contractor, type CreateContractorRequest, type UpdateContractorRequest } from '@/lib/api/contractors'
import { toast } from 'sonner'

/**
 * Hook to fetch all contractors
 */
export function useContractors() {
  return useQuery({
    queryKey: ['contractors'],
    queryFn: contractorsApi.getAll,
  })
}

/**
 * Hook to fetch a single contractor
 */
export function useContractor(id: string) {
  return useQuery({
    queryKey: ['contractors', id],
    queryFn: () => contractorsApi.getById(id),
    enabled: !!id,
  })
}

/**
 * Hook to create a contractor
 */
export function useCreateContractor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: contractorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      toast.success('Contractor created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create contractor')
    },
  })
}

/**
 * Hook to update a contractor
 */
export function useUpdateContractor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractorRequest }) =>
      contractorsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      queryClient.invalidateQueries({ queryKey: ['contractors', variables.id] })
      toast.success('Contractor updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update contractor')
    },
  })
}

/**
 * Hook to delete a contractor
 */
export function useDeleteContractor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: contractorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      toast.success('Contractor deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete contractor')
    },
  })
}
