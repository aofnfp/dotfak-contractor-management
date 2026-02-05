/**
 * Contractors API client
 * Handles all contractor-related API requests
 */

import apiClient from './client'

export interface Contractor {
  id: string
  contractor_code: string
  first_name: string
  last_name: string
  phone?: string
  address?: string
  ssn_last_4?: string
  notes?: string
  is_active: boolean
  auth_user_id?: string
  created_at: string
  updated_at: string
}

export interface CreateContractorRequest {
  contractor_code?: string // Optional - auto-generated as DTK-001, DTK-002, etc.
  first_name: string
  last_name: string
  phone?: string
  address?: string
  ssn_last_4?: string
  notes?: string
  is_active?: boolean
}

export interface UpdateContractorRequest extends Partial<CreateContractorRequest> {}

export const contractorsApi = {
  /**
   * Get all contractors
   */
  getAll: async (): Promise<Contractor[]> => {
    const response = await apiClient.get('/contractors')
    return response.data
  },

  /**
   * Get a single contractor by ID
   */
  getById: async (id: string): Promise<Contractor> => {
    const response = await apiClient.get(`/contractors/${id}`)
    return response.data
  },

  /**
   * Create a new contractor
   */
  create: async (data: CreateContractorRequest): Promise<Contractor> => {
    const response = await apiClient.post('/contractors', data)
    return response.data
  },

  /**
   * Update an existing contractor
   */
  update: async (id: string, data: UpdateContractorRequest): Promise<Contractor> => {
    const response = await apiClient.put(`/contractors/${id}`, data)
    return response.data
  },

  /**
   * Delete a contractor
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/contractors/${id}`)
  },
}
