/**
 * Paystub type definitions
 */

export interface Paystub {
  id: string
  contractor_assignment_id: string | null
  client_company_id: string
  uploaded_by: string
  file_path: string
  file_name: string
  file_size: number
  file_hash: string
  paystub_data: PaystubData
  pay_period_begin: string
  pay_period_end: string
  check_date: string
  gross_pay: number
  net_pay: number
  total_hours: number | null
  auto_matched: boolean
  created_at: string
  updated_at: string
}

export interface PaystubWithDetails extends Paystub {
  contractor_name: string | null
  contractor_code: string | null
  client_name: string
  client_code: string
  uploader_email: string
}

export interface PaystubData {
  metadata: PaystubMetadata
  header: PaystubHeader
  summary: PaystubSummary
  earnings: Earning[]
  taxes: Tax[]
  pre_tax_deductions: Deduction[]
  deductions: Deduction[]
  employer_benefits: Benefit[]
  taxable_wages: TaxableWage[]
  tax_info: TaxInfo
  payment_info: PaymentInfo[]
}

export interface PaystubMetadata {
  organization: string
  extracted_at: string
  source_file: string
}

export interface PaystubHeader {
  company: {
    name: string
    address: string
  }
  employee: {
    name: string
    id?: string
  }
  pay_period: {
    begin: string
    end: string
  }
  check_date: string
}

export interface PaystubSummary {
  current: {
    gross_pay: number
    net_pay: number
    total_taxes: number
    total_deductions: number
  }
  ytd: {
    gross_pay: number
    net_pay: number
    total_taxes: number
    total_deductions: number
  }
}

export interface Earning {
  description: string
  hours?: number
  rate?: number
  amount: number
  ytd?: number
}

export interface Tax {
  description: string
  amount: number
  ytd?: number
}

export interface Deduction {
  description: string
  amount: number
  ytd?: number
}

export interface Benefit {
  description: string
  amount: number
  ytd?: number
}

export interface TaxableWage {
  description: string
  amount: number
  ytd?: number
}

export interface TaxInfo {
  marital_status: string
  federal_allowances: number
  state_allowances: number
}

export interface PaymentInfo {
  bank: string
  account_name: string
  account_number: string
  amount: number
  currency: string
}

export interface UploadPaystubRequest {
  file: File
  client_company_id: string
  contractor_assignment_id?: string
}

export interface UploadPaystubResponse {
  success: boolean
  message: string
  total_parsed: number
  total_processed: number
  total_skipped: number
  paystubs: Array<PaystubWithDetails & {
    earnings?: {
      id: string
      contractor_total: number
      regular_earnings: number
      bonus_share: number
    }
    earnings_error?: string
  }>
  errors?: string[]
}

// Bank Account Tracking Types
export interface UnassignedAccountInfo {
  account_last4: string
  bank_name: string
  account_name?: string
  amount: number
  currency: string
}

export interface AccountAssignmentItem {
  account_last4: string
  owner_type: 'contractor' | 'admin'
  owner_id: string
}

export interface AccountAssignmentRequest {
  assignments: AccountAssignmentItem[]
}

export interface AccountAssignmentResponse {
  paystub_id: number
  assigned_count: number
  success: boolean
}

export interface CheckAccountsResponse {
  paystub_id: number
  total_accounts: number
  assigned_accounts: number
  unassigned_accounts: UnassignedAccountInfo[]
  needs_assignment: boolean
}
