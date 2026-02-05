/**
 * Client Companies API client
 * Handles client company API requests
 */

import apiClient from './client'

export interface ClientCompany {
  id: string
  name: string
  code: string
  address?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const clientsApi = {
  /**
   * Get all client companies
   */
  getAll: async (): Promise<ClientCompany[]> => {
    const response = await apiClient.get('/clients')
    return response.data
  },

  /**
   * Get a single client company by ID
   */
  getById: async (id: string): Promise<ClientCompany> => {
    const response = await apiClient.get(`/clients/${id}`)
    return response.data
  },
}
