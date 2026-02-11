/**
 * React Query hooks for managers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { managersApi } from '@/lib/api/managers'
import type { CreateManagerRequest, UpdateManagerRequest } from '@/lib/types/manager'
import { toast } from 'sonner'

export function useManagers(enabled = true) {
  return useQuery({
    queryKey: ['managers'],
    queryFn: managersApi.getAll,
    enabled,
  })
}

export function useManager(id: string) {
  return useQuery({
    queryKey: ['managers', id],
    queryFn: () => managersApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: managersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      toast.success('Manager created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create manager')
    },
  })
}

export function useUpdateManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateManagerRequest }) =>
      managersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      queryClient.invalidateQueries({ queryKey: ['managers', variables.id] })
      toast.success('Manager updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update manager')
    },
  })
}

export function useDeleteManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: managersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      toast.success('Manager deactivated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to deactivate manager')
    },
  })
}

export function useInviteManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: managersApi.invite,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      queryClient.invalidateQueries({ queryKey: ['managers', id] })
      toast.success('Invitation sent successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to send invitation')
    },
  })
}
