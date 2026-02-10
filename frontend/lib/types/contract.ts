export type ContractType = 'original' | 'amendment'

export type ContractStatus =
  | 'draft'
  | 'pending_contractor'
  | 'pending_admin'
  | 'fully_executed'
  | 'superseded'
  | 'voided'

export type SignatureMethod = 'draw' | 'type'

export interface Contract {
  id: string
  contractor_id: string
  assignment_id: string
  contract_type: ContractType
  version: number
  parent_contract_id: string | null
  status: ContractStatus
  html_content: string
  contract_data: Record<string, any>
  pdf_url: string | null
  pdf_storage_path: string | null
  created_at: string
  updated_at: string
  contractor_name?: string
  contractor_code?: string
  client_name?: string
  signatures?: ContractSignature[]
}

export interface ContractListItem {
  id: string
  contractor_id: string
  assignment_id: string
  contract_type: ContractType
  version: number
  status: ContractStatus
  pdf_url: string | null
  created_at: string
  updated_at: string
  contractor_name?: string
  contractor_code?: string
  client_name?: string
}

export interface ContractSignature {
  id: string
  signer_type: 'contractor' | 'admin'
  signer_name: string
  signature_method: SignatureMethod
  signed_at: string
}

export interface SignContractRequest {
  signer_name: string
  signature_data: string
  signature_method: SignatureMethod
}

export interface GenerateAmendmentRequest {
  assignment_id: string
  changes_summary?: string
}
