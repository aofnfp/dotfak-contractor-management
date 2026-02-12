/**
 * React Query hooks for assignments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentsApi, type CreateAssignmentRequest, type UpdateAssignmentRequest, type EndAssignmentRequest } from '@/lib/api/assignments'
import { toast } from 'sonner'

/**
 * Hook to fetch all assignments
 */
export function useAssignments() {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: assignmentsApi.getAll,
  })
}

/**
 * Hook to fetch a single assignment
 */
export function useAssignment(id: string) {
  return useQuery({
    queryKey: ['assignments', id],
    queryFn: () => assignmentsApi.getById(id),
    enabled: !!id,
  })
}

/**
 * Hook to fetch assignments for a contractor
 */
export function useContractorAssignments(contractorId: string) {
  return useQuery({
    queryKey: ['assignments', 'contractor', contractorId],
    queryFn: () => assignmentsApi.getByContractor(contractorId),
    enabled: !!contractorId,
  })
}

/**
 * Hook to create an assignment
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Assignment created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create assignment')
    },
  })
}

/**
 * Hook to update an assignment
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssignmentRequest }) =>
      assignmentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['assignments', variables.id] })
      toast.success('Assignment updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update assignment')
    },
  })
}

/**
 * Hook to end an assignment with a reason
 */
export function useEndAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EndAssignmentRequest }) =>
      assignmentsApi.endAssignment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['assignments', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['manager-assignments'] })
      toast.success('Assignment ended successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to end assignment')
    },
  })
}

/**
 * Hook to delete an assignment
 */
export function useDeleteAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Assignment deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete assignment')
    },
  })
}
