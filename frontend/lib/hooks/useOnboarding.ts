import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onboardingApi } from '@/lib/api/onboarding'
import type {
  InvitationCreateRequest,
  SetupAccountRequest,
  UpdateProfileRequest,
} from '@/lib/types/onboarding'

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => onboardingApi.getOnboardingStatus(),
  })
}

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: () => onboardingApi.listInvitations(),
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: InvitationCreateRequest) => onboardingApi.createInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
    },
  })
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: (invitationId: string) => onboardingApi.resendInvitation(invitationId),
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => onboardingApi.revokeInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
    },
  })
}

export function useVerifyToken(token: string) {
  return useQuery({
    queryKey: ['verify-token', token],
    queryFn: () => onboardingApi.verifyToken(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useSetupAccount() {
  return useMutation({
    mutationFn: (data: SetupAccountRequest) => onboardingApi.setupAccount(data),
  })
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => onboardingApi.updateProfile(data),
  })
}

export function useCompleteProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => onboardingApi.completeProfile(data),
  })
}
