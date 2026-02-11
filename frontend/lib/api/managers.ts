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

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/manager-assignments/${id}`)
  },
}

export const managerEarningsApi = {
  getAll: async (managerId?: string): Promise<ManagerEarning[]> => {
    const params = managerId ? { manager_id: managerId } : {}
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
}
