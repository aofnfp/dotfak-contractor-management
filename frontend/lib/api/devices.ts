/**
 * Devices API client
 */

import apiClient from './client'
import type {
  Device,
  CreateDeviceRequest,
  UpdateDeviceRequest,
} from '@/lib/types/device'

export const devicesApi = {
  getAll: async (filters?: {
    status?: string
    contractor_assignment_id?: string
    manager_assignment_id?: string
  }): Promise<Device[]> => {
    const response = await apiClient.get('/devices', { params: filters })
    return response.data
  },

  getById: async (id: string): Promise<Device> => {
    const response = await apiClient.get(`/devices/${id}`)
    return response.data
  },

  create: async (data: CreateDeviceRequest): Promise<Device> => {
    const response = await apiClient.post('/devices', data)
    return response.data
  },

  update: async (id: string, data: UpdateDeviceRequest): Promise<Device> => {
    const response = await apiClient.put(`/devices/${id}`, data)
    return response.data
  },

  updateStatus: async (id: string, status: string): Promise<Device> => {
    const response = await apiClient.put(`/devices/${id}/status`, null, {
      params: { new_status: status },
    })
    return response.data
  },
}
