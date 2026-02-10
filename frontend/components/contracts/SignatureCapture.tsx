'use client'

import { useState, useCallback } from 'react'
import { SignaturePad } from './SignaturePad'
import { TypedSignature } from './TypedSignature'
import type { SignatureMethod } from '@/lib/types/contract'

interface SignatureCaptureProps {
  onSignatureChange: (data: {
    signature_data: string | null
    signature_method: SignatureMethod
    signer_name: string
  }) => void
}

export function SignatureCapture({ onSignatureChange }: SignatureCaptureProps) {
  const [method, setMethod] = useState<SignatureMethod>('draw')
  const [signerName, setSignerName] = useState('')

  const handleDrawChange = useCallback((dataUrl: string | null) => {
    onSignatureChange({
      signature_data: dataUrl,
      signature_method: 'draw',
      signer_name: signerName,
    })
  }, [signerName, onSignatureChange])

  const handleTypeChange = useCallback((dataUrl: string | null, name: string) => {
    setSignerName(name)
    onSignatureChange({
      signature_data: dataUrl,
      signature_method: 'type',
      signer_name: name,
    })
  }, [onSignatureChange])

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setMethod('draw')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            method === 'draw'
              ? 'bg-cta/10 text-cta border-b-2 border-cta'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => setMethod('type')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            method === 'type'
              ? 'bg-cta/10 text-cta border-b-2 border-cta'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Type Signature
        </button>
      </div>

      {/* Content */}
      {method === 'draw' ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Your Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <SignaturePad onChange={handleDrawChange} />
        </div>
      ) : (
        <TypedSignature onChange={handleTypeChange} />
      )}
    </div>
  )
}
