'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ContractViewer } from '@/components/contracts/ContractViewer'
import { SignatureCapture } from '@/components/contracts/SignatureCapture'
import { useContract, useSignContract } from '@/lib/hooks/useContracts'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api/client'
import type { SignatureMethod } from '@/lib/types/contract'

interface ReviewContractStepProps {
  contractId: string
  onComplete: () => void
}

export function ReviewContractStep({ contractId, onComplete }: ReviewContractStepProps) {
  const { data: contract, isLoading } = useContract(contractId)
  const signContract = useSignContract()

  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState<{
    signature_data: string | null
    signature_method: SignatureMethod
    signer_name: string
  }>({ signature_data: null, signature_method: 'draw', signer_name: '' })

  const canSign = agreed && signature.signature_data && signature.signer_name.trim()

  const handleSign = async () => {
    if (!canSign || !signature.signature_data) return

    try {
      await signContract.mutateAsync({
        id: contractId,
        data: {
          signer_name: signature.signer_name,
          signature_data: signature.signature_data,
          signature_method: signature.signature_method,
        },
      })
      toast.success('Contract signed successfully!')
      onComplete()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to sign contract'))
    }
  }

  if (isLoading) {
    return (
      <Card className="border-secondary">
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading contract...
        </CardContent>
      </Card>
    )
  }

  if (!contract) {
    return (
      <Card className="border-secondary">
        <CardContent className="py-12 text-center text-destructive">
          Contract not found. Please contact admin.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Review & Sign Contract</CardTitle>
          <CardDescription>
            Please read the contract carefully before signing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractViewer htmlContent={contract.html_content} />
        </CardContent>
      </Card>

      <Card className="border-secondary">
        <CardHeader>
          <CardTitle className="text-lg">Your Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignatureCapture onSignatureChange={setSignature} />

          <div
            className="flex items-start gap-3 mt-4 p-4 rounded-lg border border-border bg-secondary cursor-pointer"
            onClick={() => setAgreed(!agreed)}
          >
            <Checkbox
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked)}
            />
            <span className="text-sm leading-relaxed">
              I have read and agree to the terms of this Independent Contractor Agreement.
              I understand that this constitutes a legally binding agreement.
            </span>
          </div>

          <Button
            onClick={handleSign}
            className="w-full bg-cta hover:bg-cta/90 text-white"
            disabled={!canSign || signContract.isPending}
          >
            {signContract.isPending ? 'Signing...' : 'Sign Contract'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
