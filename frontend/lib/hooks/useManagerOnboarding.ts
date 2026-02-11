/**
 * React Query hooks for manager onboarding
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import {
  managerOnboardingApi,
  type ManagerSetupAccountRequest,
  type ManagerCompleteProfileRequest,
} from '@/lib/api/managerOnboarding'

export function useVerifyManagerToken(token: string) {
  return useQuery({
    queryKey: ['verify-manager-token', token],
    queryFn: () => managerOnboardingApi.verifyToken(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useManagerSetupAccount() {
  return useMutation({
    mutationFn: (data: ManagerSetupAccountRequest) => managerOnboardingApi.setupAccount(data),
  })
}

export function useManagerCompleteProfile() {
  return useMutation({
    mutationFn: (data: ManagerCompleteProfileRequest) => managerOnboardingApi.completeProfile(data),
  })
}
