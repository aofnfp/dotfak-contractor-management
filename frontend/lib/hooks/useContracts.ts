import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/lib/api/contracts'
import type { SignContractRequest, GenerateAmendmentRequest } from '@/lib/types/contract'

export function useContracts(statusFilter?: string) {
  return useQuery({
    queryKey: ['contracts', statusFilter],
    queryFn: () => contractsApi.list(statusFilter),
  })
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractsApi.get(id),
    enabled: !!id,
  })
}

export function usePendingSignatures(enabled = true) {
  return useQuery({
    queryKey: ['contracts', 'pending-signatures'],
    queryFn: () => contractsApi.listPendingSignatures(),
    enabled,
  })
}

export function useSignContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SignContractRequest }) =>
      contractsApi.sign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

export function useContractPdf(id: string) {
  return useQuery({
    queryKey: ['contracts', id, 'pdf'],
    queryFn: () => contractsApi.getPdf(id),
    enabled: !!id,
  })
}

export function useGenerateAmendment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateAmendmentRequest) => contractsApi.generateAmendment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}
