/**
 * Managers API client
 */

import apiClient from './client'
import type {
  Manager,
  CreateManagerRequest,
  UpdateManagerRequest,
  ManagerAssignment,
  CreateManagerAssignmentRequest,
  UpdateManagerAssignmentRequest,
  ManagerEarning,
  ManagerEarningsSummary,
} from '@/lib/types/manager'

export const managersApi = {
  getAll: async (): Promise<Manager[]> => {
    const response = await apiClient.get('/managers')
    return response.data
  },

  getById: async (id: string): Promise<Manager> => {
    const response = await apiClient.get(`/managers/${id}`)
    return response.data
  },

  create: async (data: CreateManagerRequest): Promise<Manager> => {
    const response = await apiClient.post('/managers', data)
    return response.data
  },

  update: async (id: string, data: UpdateManagerRequest): Promise<Manager> => {
    const response = await apiClient.put(`/managers/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/managers/${id}`)
  },

  invite: async (id: string, email: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/managers/${id}/invite`, { email })
    return response.data
  },
}

export const managerAssignmentsApi = {
  getAll: async (managerId?: string): Promise<ManagerAssignment[]> => {
    const params = managerId ? { manager_id: managerId } : {}
    const response = await apiClient.get('/manager-assignments', { params })
    return response.data
  },

  create: async (data: CreateManagerAssignmentRequest): Promise<ManagerAssignment> => {
    const response = await apiClient.post('/manager-assignments', data)
    return response.data
  },

  update: async (id: string, data: UpdateManagerAssignmentRequest): Promise<ManagerAssignment> => {
    const response = await apiClient.put(`/manager-assignments/${id}`, data)
    return response.data
  },

  endAssignment: async (id: string, data: { end_reason: string; end_notes?: string; end_date?: string }): Promise<ManagerAssignment> => {
    const response = await apiClient.post(`/manager-assignments/${id}/end`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/manager-assignments/${id}`)
  },
}

export const managerEarningsApi = {
  getAll: async (filters?: { manager_id?: string; payment_status?: string }): Promise<ManagerEarning[]> => {
    const params: Record<string, string> = {}
    if (filters?.manager_id) params.manager_id = filters.manager_id
    if (filters?.payment_status) params.payment_status = filters.payment_status
    const response = await apiClient.get('/manager-earnings', { params })
    return response.data
  },

  getById: async (id: string): Promise<ManagerEarning> => {
    const response = await apiClient.get(`/manager-earnings/${id}`)
    return response.data
  },

  getSummary: async (): Promise<ManagerEarningsSummary> => {
    const response = await apiClient.get('/manager-earnings/summary')
    return response.data
  },

  getUnpaid: async (): Promise<ManagerEarning[]> => {
    const response = await apiClient.get('/manager-earnings', {
      params: { payment_status: 'unpaid' },
    })
    return response.data
  },

  getByIds: async (ids: string[]): Promise<ManagerEarning[]> => {
    const results = await Promise.all(ids.map((id) => managerEarningsApi.getById(id)))
    return results
  },
}
