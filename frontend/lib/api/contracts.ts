import apiClient from './client'
import type {
  Contract,
  ContractListItem,
  SignContractRequest,
  GenerateAmendmentRequest,
} from '@/lib/types/contract'

export const contractsApi = {
  list: async (statusFilter?: string): Promise<ContractListItem[]> => {
    const params = statusFilter ? `?status_filter=${statusFilter}` : ''
    const response = await apiClient.get(`/contracts${params}`)
    return response.data
  },

  get: async (id: string): Promise<Contract> => {
    const response = await apiClient.get(`/contracts/${id}`)
    return response.data
  },

  sign: async (id: string, data: SignContractRequest): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/contracts/${id}/sign`, data)
    return response.data
  },

  getPdf: async (id: string): Promise<{ pdf_url: string }> => {
    const response = await apiClient.get(`/contracts/${id}/pdf`)
    return response.data
  },

  listPendingSignatures: async (): Promise<ContractListItem[]> => {
    const response = await apiClient.get('/contracts/pending-signatures')
    return response.data
  },

  generateAmendment: async (data: GenerateAmendmentRequest): Promise<Contract> => {
    const response = await apiClient.post('/contracts/generate-amendment', data)
    return response.data
  },

  generate: async (data: { contractor_assignment_id?: string; manager_assignment_id?: string }): Promise<Contract> => {
    const response = await apiClient.post('/contracts/generate', data)
    return response.data
  },
}
