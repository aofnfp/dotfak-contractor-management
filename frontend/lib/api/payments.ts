import apiClient from './client'
import type {
  Payment,
  PaymentWithDetails,
  CreatePaymentRequest,
  AllocationPreviewItem,
  PaymentsSummary,
} from '@/lib/types/payment'

export const paymentsApi = {
  /**
   * List all payments
   */
  list: async (): Promise<PaymentWithDetails[]> => {
    const response = await apiClient.get('/payments')
    return response.data
  },

  /**
   * Get payment by ID
   */
  get: async (id: string): Promise<PaymentWithDetails> => {
    const response = await apiClient.get(`/payments/${id}`)
    return response.data
  },

  /**
   * Get payments for a specific contractor
   */
  getByContractor: async (contractorId: string): Promise<PaymentWithDetails[]> => {
    const response = await apiClient.get(`/payments/contractor/${contractorId}`)
    return response.data
  },

  /**
   * Create a new payment with allocation
   */
  create: async (data: CreatePaymentRequest): Promise<PaymentWithDetails> => {
    const response = await apiClient.post('/payments', data)
    return response.data
  },

  /**
   * Preview FIFO allocation for a payment amount
   */
  previewAllocation: async (
    contractorId: string,
    amount: number
  ): Promise<AllocationPreviewItem[]> => {
    const response = await apiClient.get('/payments/preview-allocation', {
      params: { contractor_id: contractorId, amount },
    })
    return response.data
  },

  /**
   * Get payment summary stats
   */
  getSummary: async (): Promise<PaymentsSummary> => {
    const response = await apiClient.get('/payments/summary')
    return response.data
  },

  /**
   * Delete a payment
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/payments/${id}`)
  },
}

// ── Manager Payments ────────────────────────────────────────

export interface ManagerPayment {
  id: string
  manager_id: string
  manager_name?: string
  amount: number
  payment_method: string | null
  payment_date: string
  transaction_reference: string | null
  notes: string | null
  created_at: string
}

export interface CreateManagerPaymentRequest {
  manager_id: string
  amount: number
  payment_method?: string
  payment_date: string
  transaction_reference?: string
  notes?: string
  allocate_to_earnings?: { earning_id: string; amount: number }[]
}

export const managerPaymentsApi = {
  list: async (managerId?: string): Promise<ManagerPayment[]> => {
    const response = await apiClient.get('/payments/manager/list', {
      params: managerId ? { manager_id: managerId } : undefined,
    })
    return response.data
  },

  create: async (data: CreateManagerPaymentRequest): Promise<ManagerPayment> => {
    const response = await apiClient.post('/payments/manager', data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/payments/manager/${id}`)
  },

  previewAllocation: async (
    managerId: string,
    amount: number
  ): Promise<AllocationPreviewItem[]> => {
    const response = await apiClient.get('/payments/manager/preview-allocation', {
      params: { manager_id: managerId, amount },
    })
    return response.data
  },
}
