import apiClient from './client'

export interface ImpersonationTarget {
  auth_user_id: string
  role: 'contractor' | 'manager'
  name: string
  code?: string | null
  email?: string | null
}

export const adminImpersonationApi = {
  listTargets: async (): Promise<ImpersonationTarget[]> => {
    const response = await apiClient.get('/admin/impersonate/targets')
    return response.data
  },

  start: async (targetAuthUserId: string): Promise<{ target: ImpersonationTarget }> => {
    const response = await apiClient.post('/admin/impersonate/start', {
      target_auth_user_id: targetAuthUserId,
    })
    return response.data
  },

  stop: async (targetAuthUserId: string): Promise<void> => {
    await apiClient.post('/admin/impersonate/stop', {
      target_auth_user_id: targetAuthUserId,
    })
  },
}
