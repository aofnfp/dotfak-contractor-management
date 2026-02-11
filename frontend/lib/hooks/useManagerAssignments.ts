/**
 * React Query hooks for manager assignments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { managerAssignmentsApi } from '@/lib/api/managers'
import type { CreateManagerAssignmentRequest, UpdateManagerAssignmentRequest } from '@/lib/types/manager'
import { toast } from 'sonner'

export function useManagerAssignments(managerId?: string) {
  return useQuery({
    queryKey: ['manager-assignments', managerId],
    queryFn: () => managerAssignmentsApi.getAll(managerId),
  })
}

export function useCreateManagerAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: managerAssignmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      toast.success('Manager assignment created')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create assignment')
    },
  })
}

export function useUpdateManagerAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateManagerAssignmentRequest }) =>
      managerAssignmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-assignments'] })
      toast.success('Assignment updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update assignment')
    },
  })
}

export function useDeleteManagerAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: managerAssignmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      toast.success('Assignment deactivated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to deactivate assignment')
    },
  })
}
