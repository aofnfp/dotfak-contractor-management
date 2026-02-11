'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContractViewer } from '@/components/contracts/ContractViewer'
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge'
import { SignatureCapture } from '@/components/contracts/SignatureCapture'
import { useContract, useSignContract } from '@/lib/hooks/useContracts'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api/client'
import type { SignatureMethod } from '@/lib/types/contract'

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string
  const { user } = useAuth()

  const { data: contract, isLoading } = useContract(contractId)
  const signContract = useSignContract()

  const [showSignature, setShowSignature] = useState(false)
  const [signature, setSignature] = useState<{
    signature_data: string | null
    signature_method: SignatureMethod
    signer_name: string
  }>({ signature_data: null, signature_method: 'draw', signer_name: '' })

  const handleSign = async () => {
    if (!signature.signature_data || !signature.signer_name.trim()) {
      toast.error('Please provide your name and signature')
      return
    }

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
      setShowSignature(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to sign contract'))
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const { data } = await import('@/lib/api/contracts').then(m =>
        m.contractsApi.getPdf(contractId).then(d => ({ data: d }))
      )
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank')
      }
    } catch {
      toast.error('PDF not available yet')
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="text-center py-12 text-muted-foreground">Loading contract...</div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="flex-1 p-8">
        <div className="text-center py-12 text-destructive">Contract not found.</div>
      </div>
    )
  }

  const isAdmin = user?.role === 'admin'
  const canAdminSign = contract.status === 'pending_admin' && isAdmin
  const canContractorSign = contract.status === 'pending_contractor' && !isAdmin

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/contracts')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">
              Contract — {contract.contractor_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <ContractStatusBadge status={contract.status} />
              <span className="text-sm text-muted-foreground capitalize">
                {contract.contract_type} v{contract.version}
              </span>
              {contract.client_name && (
                <span className="text-sm text-muted-foreground">
                  | {contract.client_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {contract.status === 'fully_executed' && (
            <Button variant="outline" onClick={handleDownloadPdf} className="border-border">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
          {canAdminSign && !showSignature && (
            <Button
              onClick={() => setShowSignature(true)}
              className="bg-cta hover:bg-cta/90 text-white"
            >
              <FileSignature className="h-4 w-4 mr-2" />
              Counter-Sign
            </Button>
          )}
          {canContractorSign && !showSignature && (
            <Button
              onClick={() => setShowSignature(true)}
              className="bg-cta hover:bg-cta/90 text-white"
            >
              <FileSignature className="h-4 w-4 mr-2" />
              Sign Contract
            </Button>
          )}
        </div>
      </div>

      {/* Signatures info */}
      {contract.signatures && contract.signatures.length > 0 && (
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle className="text-lg">Signatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {contract.signatures.map((sig) => (
                <div key={sig.id} className="p-3 rounded-md bg-secondary">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium capitalize">{sig.signer_type}</span>
                      <span className="text-muted-foreground"> — {sig.signer_name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(sig.signed_at).toLocaleString()}
                    </span>
                  </div>
                  {sig.signature_data && (
                    <div className="bg-white rounded p-2 inline-block border border-border">
                      <img
                        src={sig.signature_data}
                        alt={`${sig.signer_name}'s signature`}
                        className="max-h-16"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signing section (admin counter-sign or contractor sign) */}
      {showSignature && (canAdminSign || canContractorSign) && (
        <Card className="border-cta/30">
          <CardHeader>
            <CardTitle className="text-lg">
              {canAdminSign ? 'Admin Counter-Signature' : 'Sign Contract'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignatureCapture onSignatureChange={setSignature} />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowSignature(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSign}
                className="bg-cta hover:bg-cta/90 text-white"
                disabled={!signature.signature_data || !signature.signer_name.trim() || signContract.isPending}
              >
                {signContract.isPending ? 'Signing...' : 'Sign Contract'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract content with signatures injected */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle className="text-lg">Contract Content</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractViewer htmlContent={contract.html_content} signatures={contract.signatures} />
        </CardContent>
      </Card>
    </div>
  )
}
