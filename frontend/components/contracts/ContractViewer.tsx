'use client'

import { useMemo } from 'react'
import type { ContractSignature } from '@/lib/types/contract'

interface ContractViewerProps {
  htmlContent: string
  signatures?: ContractSignature[]
}

function injectSignatures(html: string, signatures: ContractSignature[]): string {
  let result = html
  for (const sig of signatures) {
    if (sig.signature_data) {
      const placeholder = `<!-- SIGNATURE_${sig.signer_type.toUpperCase()} -->`
      const sigHtml = `<img src="${sig.signature_data}" style="max-height: 60px;" />`
        + `<p style="margin: 4px 0; font-size: 12px;">${sig.signer_name}</p>`
        + `<p style="margin: 4px 0; font-size: 11px; color: #666;">Signed: ${new Date(sig.signed_at).toLocaleDateString()}</p>`
      result = result.replace(placeholder, sigHtml)
    }
  }
  return result
}

export function ContractViewer({ htmlContent, signatures }: ContractViewerProps) {
  const processedHtml = useMemo(() => {
    if (signatures && signatures.length > 0) {
      return injectSignatures(htmlContent, signatures)
    }
    return htmlContent
  }, [htmlContent, signatures])

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      <div
        className="p-8 max-h-[600px] overflow-y-auto prose prose-sm max-w-none text-black"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    </div>
  )
}
