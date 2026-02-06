import apiClient from './client'
import type {
  Paystub,
  PaystubWithDetails,
  UploadPaystubResponse,
  CheckAccountsResponse,
  AccountAssignmentRequest,
  AccountAssignmentResponse,
} from '@/lib/types/paystub'

export const paystubsApi = {
  /**
   * List all paystubs
   */
  list: async (): Promise<PaystubWithDetails[]> => {
    const response = await apiClient.get('/paystubs')
    return response.data
  },

  /**
   * Get paystub by ID
   */
  get: async (id: string): Promise<PaystubWithDetails> => {
    const response = await apiClient.get(`/paystubs/${id}`)
    return response.data
  },

  /**
   * Get paystubs for a specific contractor assignment
   */
  getByAssignment: async (assignmentId: string): Promise<PaystubWithDetails[]> => {
    const response = await apiClient.get(`/paystubs/assignment/${assignmentId}`)
    return response.data
  },

  /**
   * Get paystubs for a specific contractor
   */
  getByContractor: async (contractorId: string): Promise<PaystubWithDetails[]> => {
    const response = await apiClient.get(`/paystubs/contractor/${contractorId}`)
    return response.data
  },

  /**
   * Get paystubs for a specific client company
   */
  getByClient: async (clientId: string): Promise<PaystubWithDetails[]> => {
    const response = await apiClient.get(`/paystubs/client/${clientId}`)
    return response.data
  },

  /**
   * Upload a paystub file
   */
  upload: async (
    file: File,
    clientCompanyId: string,
    contractorAssignmentId?: string
  ): Promise<UploadPaystubResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('client_company_id', clientCompanyId)
    if (contractorAssignmentId) {
      formData.append('contractor_assignment_id', contractorAssignmentId)
    }

    const response = await apiClient.post('/paystubs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Delete a paystub
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/paystubs/${id}`)
  },

  /**
   * Re-process a paystub (re-extract data)
   */
  reprocess: async (id: string): Promise<PaystubWithDetails> => {
    const response = await apiClient.post(`/paystubs/${id}/reprocess`)
    return response.data
  },

  /**
   * Manually assign a paystub to a contractor
   */
  assign: async (id: string, assignmentId: string): Promise<PaystubWithDetails> => {
    const response = await apiClient.patch(`/paystubs/${id}/assign`, {
      contractor_assignment_id: assignmentId,
    })
    return response.data
  },

  /**
   * Check if paystub has unassigned bank accounts
   */
  checkAccounts: async (id: string): Promise<CheckAccountsResponse> => {
    const response = await apiClient.get(`/paystubs/${id}/check-accounts`)
    return response.data
  },

  /**
   * Assign bank accounts from a paystub
   */
  assignAccounts: async (
    id: string,
    request: AccountAssignmentRequest
  ): Promise<AccountAssignmentResponse> => {
    const response = await apiClient.post(`/paystubs/${id}/assign-accounts`, request)
    return response.data
  },
}
