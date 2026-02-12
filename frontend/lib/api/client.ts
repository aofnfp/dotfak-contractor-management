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
 * Token Refresh State
 * Prevents concurrent refresh attempts and queues retries
 */
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

function processQueue(error: any, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  refreshQueue = []
}

/**
 * Response Interceptor
 * On 401: attempts token refresh before giving up
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (typeof window === 'undefined') return Promise.reject(error)

      const refreshToken = localStorage.getItem('refresh_token')

      // No refresh token available — clear session
      if (!refreshToken) {
        updateCachedToken(null)
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/onboard')) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const baseURL = apiClient.defaults.baseURL || ''
        const res = await axios.post(`${baseURL}/auth/refresh`, null, {
          params: { refresh_token: refreshToken },
        })

        const newAccess = res.data?.session?.access_token
        const newRefresh = res.data?.session?.refresh_token

        if (!newAccess) throw new Error('No access token in refresh response')

        updateCachedToken(newAccess)
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh)

        processQueue(null, newAccess)

        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        updateCachedToken(null)
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/onboard')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
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
