import { create } from 'zustand'
import { adminImpersonationApi, type ImpersonationTarget } from '@/lib/api/admin-impersonation'
import { updateImpersonatedUserId } from '@/lib/api/client'
import { useQueryClient } from '@tanstack/react-query'

interface ImpersonationState {
  target: ImpersonationTarget | null
  isStarting: boolean
  setTarget: (t: ImpersonationTarget | null) => void
  startImpersonating: (target: ImpersonationTarget) => Promise<void>
  stopImpersonating: () => Promise<void>
}

export const useImpersonationStore = create<ImpersonationState>((set, get) => ({
  target: null,
  isStarting: false,

  setTarget: (t) => set({ target: t }),

  startImpersonating: async (target) => {
    set({ isStarting: true })
    try {
      await adminImpersonationApi.start(target.auth_user_id)
      updateImpersonatedUserId(target.auth_user_id)
      if (typeof window !== 'undefined') {
        localStorage.setItem('impersonate_target', JSON.stringify(target))
      }
      set({ target, isStarting: false })
    } catch (e) {
      set({ isStarting: false })
      throw e
    }
  },

  stopImpersonating: async () => {
    const current = get().target
    updateImpersonatedUserId(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('impersonate_target')
    }
    set({ target: null })
    if (current) {
      try {
        await adminImpersonationApi.stop(current.auth_user_id)
      } catch (e) {
        console.error('Failed to record impersonation stop:', e)
      }
    }
  },
}))

/** Initialize impersonation state from localStorage on app start. */
export function initializeImpersonation() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem('impersonate_target')
  const id = localStorage.getItem('impersonate_user_id')
  if (raw && id) {
    try {
      const target = JSON.parse(raw) as ImpersonationTarget
      updateImpersonatedUserId(id)
      useImpersonationStore.getState().setTarget(target)
    } catch {
      localStorage.removeItem('impersonate_target')
      localStorage.removeItem('impersonate_user_id')
    }
  }
}

/** Hook for components — returns the store, plus a helper to invalidate caches on switch. */
export function useImpersonation() {
  const queryClient = useQueryClient()
  const store = useImpersonationStore()

  return {
    ...store,
    startImpersonating: async (target: ImpersonationTarget) => {
      await store.startImpersonating(target)
      // Reset cached queries so the UI re-fetches as the impersonated user
      queryClient.invalidateQueries()
    },
    stopImpersonating: async () => {
      await store.stopImpersonating()
      queryClient.invalidateQueries()
    },
  }
}
