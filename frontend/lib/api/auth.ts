import apiClient from './client'
import type { LoginRequest, LoginResponse } from '@/lib/types/auth'

/**
 * Auth API Module
 *
 * Handles authentication requests to the backend API
 */

export const authApi = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    return response.data
  },

  /**
   * Logout user (client-side only, no backend call needed)
   */
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}
