import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paystubsApi } from '@/lib/api/paystubs'
import { toast } from 'sonner'
import type { UploadPaystubResponse } from '@/lib/types/paystub'

/**
 * Fetch all paystubs
 */
export function usePaystubs() {
  return useQuery({
    queryKey: ['paystubs'],
    queryFn: paystubsApi.list,
  })
}

/**
 * Fetch a single paystub by ID
 */
export function usePaystub(id: string) {
  const isValidId = !!id && id !== 'undefined' && id !== 'null'
  return useQuery({
    queryKey: ['paystubs', id],
    queryFn: () => paystubsApi.get(id),
    enabled: isValidId,
  })
}

/**
 * Fetch paystubs for a specific assignment
 */
export function useAssignmentPaystubs(assignmentId: string) {
  return useQuery({
    queryKey: ['paystubs', 'assignment', assignmentId],
    queryFn: () => paystubsApi.getByAssignment(assignmentId),
    enabled: !!assignmentId,
  })
}

/**
 * Fetch paystubs for a specific contractor
 */
export function useContractorPaystubs(contractorId: string) {
  return useQuery({
    queryKey: ['paystubs', 'contractor', contractorId],
    queryFn: () => paystubsApi.getByContractor(contractorId),
    enabled: !!contractorId,
  })
}

/**
 * Fetch paystubs for a specific client
 */
export function useClientPaystubs(clientId: string) {
  return useQuery({
    queryKey: ['paystubs', 'client', clientId],
    queryFn: () => paystubsApi.getByClient(clientId),
    enabled: !!clientId,
  })
}

/**
 * Upload a paystub
 */
export function useUploadPaystub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      clientCompanyId,
      contractorAssignmentId,
    }: {
      file: File
      clientCompanyId: string
      contractorAssignmentId?: string
    }) => paystubsApi.upload(file, clientCompanyId, contractorAssignmentId),
    onSuccess: (data: UploadPaystubResponse) => {
      queryClient.invalidateQueries({ queryKey: ['paystubs'] })

      // Invalidate queries for all processed paystubs
      data.paystubs.forEach((paystub) => {
        if (paystub.contractor_assignment_id) {
          queryClient.invalidateQueries({
            queryKey: ['paystubs', 'assignment', paystub.contractor_assignment_id],
          })
        }
      })

      // Invalidate earnings if any paystubs have earnings
      if (data.paystubs.some((p) => p.earnings)) {
        queryClient.invalidateQueries({ queryKey: ['earnings'] })
      }

      // Show success toast with count
      const autoMatchedCount = data.paystubs.filter((p) => p.auto_matched).length

      if (autoMatchedCount > 0) {
        toast.success(`${data.total_processed} paystub(s) uploaded successfully!`, {
          description: `${autoMatchedCount} auto-matched to contractor(s)`,
        })
      } else {
        toast.success(`${data.total_processed} paystub(s) uploaded successfully!`, {
          description: 'Please manually assign to contractors.',
        })
      }
    },
    onError: (error: any) => {
      toast.error('Failed to upload paystub', {
        description: error.response?.data?.detail || error.message,
      })
    },
  })
}

/**
 * Delete a paystub
 */
export function useDeletePaystub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: paystubsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paystubs'] })
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      toast.success('Paystub deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete paystub', {
        description: error.response?.data?.detail || error.message,
      })
    },
  })
}

/**
 * Re-process a paystub
 */
export function useReprocessPaystub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: paystubsApi.reprocess,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['paystubs', data.id] })
      queryClient.invalidateQueries({ queryKey: ['paystubs'] })
      toast.success('Paystub re-processed successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to re-process paystub', {
        description: error.response?.data?.detail || error.message,
      })
    },
  })
}

/**
 * Manually assign paystub to contractor
 */
export function useAssignPaystub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, assignmentId }: { id: string; assignmentId: string }) =>
      paystubsApi.assign(id, assignmentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['paystubs', data.id] })
      queryClient.invalidateQueries({ queryKey: ['paystubs'] })
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      toast.success('Paystub assigned successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to assign paystub', {
        description: error.response?.data?.detail || error.message,
      })
    },
  })
}
