export type OnboardingStatus =
  | 'not_invited'
  | 'invited'
  | 'account_created'
  | 'profile_completed'
  | 'contract_signed'
  | 'fully_onboarded'

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface Invitation {
  id: string
  contractor_id: string
  email: string
  token: string
  status: InvitationStatus
  expires_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string
  contractor_name?: string | null
  contractor_code?: string | null
}

export interface OnboardingStatusItem {
  contractor_id: string
  contractor_name: string
  contractor_code: string
  email: string | null
  onboarding_status: OnboardingStatus
  has_active_assignment: boolean
  has_auth_account: boolean
  contract_status: string | null
  invited_at: string | null
}

export interface VerifyTokenResponse {
  valid: boolean
  contractor_id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string | null
  address?: string | null
}

export interface SetupAccountRequest {
  token: string
  password: string
}

export interface SetupAccountResponse {
  success: boolean
  message: string
  access_token: string
  refresh_token: string
  contractor_id: string
}

export interface UpdateProfileRequest {
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  country?: string
  bank_account_last4?: string
}

export interface CompleteProfileResponse {
  success: boolean
  message: string
  contract_id: string | null
  onboarding_status: string
}

export interface InvitationCreateRequest {
  contractor_id: string
  email: string
}
