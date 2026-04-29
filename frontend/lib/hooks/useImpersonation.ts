import { create } from 'zustand'
import { adminImpersonationApi, type ImpersonationTarget } from '@/lib/api/admin-impersonation'
import { updateImpersonatedUserId } from '@/lib/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

interface ImpersonationState {
  target: ImpersonationTarget | null
  isStarting: boolean
  setTarget: (t: ImpersonationTarget | null) => void
  startImpersonating: (target: ImpersonationTarget) => Promise<void>
  stopImpersonating: () => Promise<void>
}

/**
 * Read the persisted impersonation target from localStorage at module init,
 * so the banner and the API client header are correct on the very first
 * render after a refresh — no flicker, no half-state.
 */
function readPersistedTarget(): ImpersonationTarget | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('impersonate_target')
  const id = localStorage.getItem('impersonate_user_id')
  if (!raw || !id) {
    // Half-state: clear so we don't end up with stale data
    if (raw) localStorage.removeItem('impersonate_target')
    if (id) localStorage.removeItem('impersonate_user_id')
    return null
  }
  try {
    return JSON.parse(raw) as ImpersonationTarget
  } catch {
    localStorage.removeItem('impersonate_target')
    localStorage.removeItem('impersonate_user_id')
    return null
  }
}

export const useImpersonationStore = create<ImpersonationState>((set, get) => ({
  target: readPersistedTarget(),
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

/**
 * Returns the role the UI should show for. When an admin is impersonating,
 * this is the target's role; otherwise it's the user's actual role.
 *
 * Use this anywhere the navigation/menu/visibility should mirror the
 * effective viewer (sidebar, mobile nav, role-gated components). For
 * showing data that came from the API, the API itself is already scoped,
 * so just check what's in the response.
 */
export function useEffectiveRole(): 'admin' | 'contractor' | 'manager' | undefined {
  const target = useImpersonationStore((s) => s.target)
  const userRole = useAuth((s) => s.user?.role)
  if (target) return target.role
  return userRole as 'admin' | 'contractor' | 'manager' | undefined
}
