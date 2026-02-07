import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

/**
 * API Client Configuration
 *
 * Axios instance with authentication interceptor
 * Automatically adds JWT token to all requests
 */

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Token Cache
 * Prevents synchronous localStorage reads on every API request
 */
let cachedToken: string | null = null

/**
 * Get authentication token from cache or localStorage
 * Caches token in memory to avoid repeated localStorage access
 */
function getAuthToken(): string | null {
  if (cachedToken) return cachedToken

  if (typeof window !== 'undefined') {
    cachedToken = localStorage.getItem('access_token')
  }
  return cachedToken
}

/**
 * Update cached token and sync with localStorage
 * Call this whenever token changes (login, logout, refresh)
 */
export function updateCachedToken(token: string | null) {
  cachedToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('access_token', token)
    } else {
      localStorage.removeItem('access_token')
    }
  }
}

/**
 * Request Interceptor
 * Adds Authorization header with JWT token if available
 * Uses cached token to avoid blocking localStorage reads
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken()

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor
 * Handles errors gracefully, especially 401 Unauthorized
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - session expired or invalid token
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear cached token and localStorage
        updateCachedToken(null)
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')

        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Extract a human-readable error message from an API error.
 * Handles both string details and Pydantic validation error arrays.
 */
export function getApiErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
  }
  return fallback
}

export default apiClient
