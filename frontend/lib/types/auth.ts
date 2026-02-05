/**
 * Authentication Types
 */

export interface User {
  id: string
  email: string
  role: 'admin' | 'contractor'
  contractor_id?: string
  first_name?: string
  last_name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  user: User
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
    token_type: string
  }
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
}
