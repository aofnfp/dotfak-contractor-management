'use client'

interface ContractViewerProps {
  htmlContent: string
}

export function ContractViewer({ htmlContent }: ContractViewerProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      <div
        className="p-8 max-h-[600px] overflow-y-auto prose prose-sm max-w-none text-black"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}
