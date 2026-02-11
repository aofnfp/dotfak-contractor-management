/**
 * Assignments API client
 * Handles contractor-client assignment API requests
 */

import apiClient from './client'

export interface Assignment {
  id: string
  contractor_id: string
  client_company_id: string
  client_employee_id?: string
  job_title?: string
  rate_type: 'fixed' | 'percentage'
  fixed_hourly_rate?: number
  percentage_rate?: number
  bonus_split_percentage: number
  start_date: string
  end_date?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface AssignmentWithDetails extends Assignment {
  contractor_name: string
  contractor_code: string
  client_name: string
  client_code: string
}

export interface CreateAssignmentRequest {
  contractor_id: string
  client_company_id: string
  client_employee_id?: string
  job_title?: string
  rate_type: 'fixed' | 'percentage'
  fixed_hourly_rate?: number
  percentage_rate?: number
  bonus_split_percentage?: number
  start_date: string
  end_date?: string
  notes?: string
}

export interface UpdateAssignmentRequest extends Partial<Omit<CreateAssignmentRequest, 'contractor_id' | 'client_company_id'>> {
  is_active?: boolean
}

export const assignmentsApi = {
  /**
   * Get all assignments
   */
  getAll: async (): Promise<AssignmentWithDetails[]> => {
    const response = await apiClient.get('/assignments')
    return response.data
  },

  /**
   * Get a single assignment by ID
   */
  getById: async (id: string): Promise<AssignmentWithDetails> => {
    const response = await apiClient.get(`/assignments/${id}`)
    return response.data
  },

  /**
   * Get assignments for a specific contractor
   */
  getByContractor: async (contractorId: string): Promise<AssignmentWithDetails[]> => {
    const response = await apiClient.get(`/assignments?contractor_id=${contractorId}`)
    return response.data
  },

  /**
   * Create a new assignment
   */
  create: async (data: CreateAssignmentRequest): Promise<Assignment> => {
    const response = await apiClient.post('/assignments', data)
    return response.data
  },

  /**
   * Update an existing assignment
   */
  update: async (id: string, data: UpdateAssignmentRequest): Promise<Assignment> => {
    const response = await apiClient.put(`/assignments/${id}`, data)
    return response.data
  },

  /**
   * Delete an assignment
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/assignments/${id}`)
  },
}
