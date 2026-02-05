import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '@/lib/api/payments'
import { toast } from 'sonner'
import type { CreatePaymentRequest } from '@/lib/types/payment'

/**
 * List all payments
 */
export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.list(),
  })
}

/**
 * Get a single payment by ID
 */
export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.get(id),
    enabled: !!id,
  })
}

/**
 * Get payments for a specific contractor
 */
export function usePaymentsByContractor(contractorId: string) {
  return useQuery({
    queryKey: ['payments', 'contractor', contractorId],
    queryFn: () => paymentsApi.getByContractor(contractorId),
    enabled: !!contractorId,
  })
}

/**
 * Create a new payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => paymentsApi.create(data),
    onSuccess: (_, variables) => {
      // Invalidate only specific queries that are affected
      queryClient.invalidateQueries({ queryKey: ['payments'], exact: true })
      queryClient.invalidateQueries({ queryKey: ['payments', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['payments', 'contractor', variables.contractor_id] })
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      toast.success('Payment recorded successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to record payment')
    },
  })
}

/**
 * Preview FIFO allocation for a payment amount
 */
export function useAllocationPreview(contractorId: string, amount: number) {
  return useQuery({
    queryKey: ['payments', 'preview', contractorId, amount],
    queryFn: () => paymentsApi.previewAllocation(contractorId, amount),
    enabled: !!contractorId && amount > 0,
  })
}

/**
 * Get payment summary stats
 */
export function usePaymentsSummary() {
  return useQuery({
    queryKey: ['payments', 'summary'],
    queryFn: () => paymentsApi.getSummary(),
  })
}

/**
 * Delete a payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: (_, id) => {
      // Invalidate list and summary (most affected by deletion)
      queryClient.invalidateQueries({ queryKey: ['payments'], exact: true })
      queryClient.invalidateQueries({ queryKey: ['payments', 'summary'] })
      // Remove the deleted payment from cache
      queryClient.removeQueries({ queryKey: ['payments', id] })
      // Invalidate earnings as allocation may have changed
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      toast.success('Payment deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete payment')
    },
  })
}
