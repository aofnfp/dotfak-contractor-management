import apiClient from './client'
import type {
  Earning,
  EarningWithDetails,
  EarningsSummary,
  EarningsFilters,
} from '@/lib/types/earning'

export const earningsApi = {
  /**
   * List all earnings
   */
  list: async (filters?: EarningsFilters): Promise<EarningWithDetails[]> => {
    const params = new URLSearchParams()
    if (filters?.contractor_id) params.append('contractor_id', filters.contractor_id)
    if (filters?.client_id) params.append('client_id', filters.client_id)
    if (filters?.payment_status) params.append('payment_status', filters.payment_status)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)

    const response = await apiClient.get(`/earnings?${params.toString()}`)
    return response.data
  },

  /**
   * Get earning by ID
   */
  get: async (id: string): Promise<EarningWithDetails> => {
    const response = await apiClient.get(`/earnings/${id}`)
    return response.data
  },

  /**
   * Get earnings for a specific contractor
   */
  getByContractor: async (contractorId: string): Promise<EarningWithDetails[]> => {
    const response = await apiClient.get(`/earnings/contractor/${contractorId}`)
    return response.data
  },

  /**
   * Get earnings for a specific client company
   */
  getByClient: async (clientId: string): Promise<EarningWithDetails[]> => {
    const response = await apiClient.get(`/earnings/client/${clientId}`)
    return response.data
  },

  /**
   * Get all unpaid earnings
   */
  getUnpaid: async (): Promise<EarningWithDetails[]> => {
    const response = await apiClient.get('/earnings/unpaid/list')
    return response.data
  },

  /**
   * Get multiple earnings by IDs (parallel fetch)
   */
  getByIds: async (ids: string[]): Promise<EarningWithDetails[]> => {
    const results = await Promise.all(ids.map((id) => earningsApi.get(id)))
    return results
  },

  /**
   * Get earnings summary stats
   */
  getSummary: async (): Promise<EarningsSummary> => {
    const response = await apiClient.get('/earnings/summary')
    return response.data
  },
}
