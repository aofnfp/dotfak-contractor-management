import axios from 'axios'
import apiClient from './client'
import type {
  Invitation,
  OnboardingStatusItem,
  VerifyTokenResponse,
  SetupAccountRequest,
  SetupAccountResponse,
  UpdateProfileRequest,
  CompleteProfileResponse,
  InvitationCreateRequest,
} from '@/lib/types/onboarding'

/**
 * Public API client — no auth interceptor.
 * Used for verify-token and setup-account (contractor has no token yet).
 */
const publicClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

export const onboardingApi = {
  // ── Admin endpoints ──────────────────────────────────────────────

  createInvitation: async (data: InvitationCreateRequest): Promise<Invitation> => {
    const response = await apiClient.post('/onboarding/invitations', data)
    return response.data
  },

  listInvitations: async (): Promise<Invitation[]> => {
    const response = await apiClient.get('/onboarding/invitations')
    return response.data
  },

  resendInvitation: async (invitationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/onboarding/invitations/${invitationId}/resend`)
    return response.data
  },

  revokeInvitation: async (invitationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/onboarding/invitations/${invitationId}`)
    return response.data
  },

  getOnboardingStatus: async (): Promise<OnboardingStatusItem[]> => {
    const response = await apiClient.get('/onboarding/status')
    return response.data
  },

  // ── Public endpoints (no auth) ───────────────────────────────────

  verifyToken: async (token: string): Promise<VerifyTokenResponse> => {
    const response = await publicClient.get(`/onboarding/verify-token/${token}`)
    return response.data
  },

  setupAccount: async (data: SetupAccountRequest): Promise<SetupAccountResponse> => {
    const response = await publicClient.post('/onboarding/setup-account', data)
    return response.data
  },

  // ── Contractor endpoints (authenticated) ─────────────────────────

  updateProfile: async (data: UpdateProfileRequest): Promise<{ success: boolean }> => {
    const response = await apiClient.put('/onboarding/update-profile', data)
    return response.data
  },

  completeProfile: async (data: UpdateProfileRequest): Promise<CompleteProfileResponse> => {
    const response = await apiClient.post('/onboarding/complete-profile', data)
    return response.data
  },
}
