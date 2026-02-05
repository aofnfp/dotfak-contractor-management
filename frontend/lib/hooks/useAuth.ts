import { create } from 'zustand'
import { authApi } from '@/lib/api/auth'
import { updateCachedToken } from '@/lib/api/client'
import type { LoginRequest, User } from '@/lib/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  setUser: (user: User, token: string) => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true })
    try {
      const response = await authApi.login(credentials)

      // Update cached token and localStorage
      updateCachedToken(response.session.access_token)

      // Save additional auth data
      if (typeof window !== 'undefined') {
        if (response.session.refresh_token) {
          localStorage.setItem('refresh_token', response.session.refresh_token)
        }
        localStorage.setItem('user', JSON.stringify(response.user))
      }

      // Update state
      set({
        user: response.user,
        token: response.session.access_token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    authApi.logout()

    // Clear cached token
    updateCachedToken(null)

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  },

  setUser: (user: User, token: string) => {
    set({
      user,
      token,
      isAuthenticated: true,
    })
  },
}))

/**
 * Initialize auth state from localStorage on app start
 */
export function initializeAuth() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        // Update cached token
        updateCachedToken(token)
        useAuth.getState().setUser(user, token)
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error)
        // Clear invalid data
        updateCachedToken(null)
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      }
    }
  }
}
