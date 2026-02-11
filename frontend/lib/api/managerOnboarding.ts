/**
 * Manager Onboarding API client
 */

import apiClient from './client'

export interface ManagerTokenVerification {
  valid: boolean
  manager_id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string
}

export interface ManagerSetupAccountRequest {
  token: string
  password: string
}

export interface ManagerSetupAccountResponse {
  success: boolean
  message: string
  access_token?: string
  refresh_token?: string
  manager_id?: string
}

export interface ManagerCompleteProfileRequest {
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  bank_account_last4?: string
}

export interface ManagerCompleteProfileResponse {
  success: boolean
  message: string
  contract_ids: string[]
  onboarding_status: string
}

export const managerOnboardingApi = {
  verifyToken: async (token: string): Promise<ManagerTokenVerification> => {
    const response = await apiClient.get(`/onboarding/manager/verify-token/${token}`)
    return response.data
  },

  setupAccount: async (data: ManagerSetupAccountRequest): Promise<ManagerSetupAccountResponse> => {
    const response = await apiClient.post('/onboarding/manager/setup-account', data)
    return response.data
  },

  completeProfile: async (data: ManagerCompleteProfileRequest): Promise<ManagerCompleteProfileResponse> => {
    const response = await apiClient.post('/onboarding/manager/complete-profile', data)
    return response.data
  },
}
