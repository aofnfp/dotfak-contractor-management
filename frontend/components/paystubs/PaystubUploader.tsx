'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUploadPaystub } from '@/lib/hooks/usePaystubs'
import type { UploadPaystubResponse } from '@/lib/types/paystub'

interface PaystubUploaderProps {
  clientCompanyId: string
  contractorAssignmentId?: string
  onUploadSuccess?: (response: UploadPaystubResponse) => void
}

export function PaystubUploader({
  clientCompanyId,
  contractorAssignmentId,
  onUploadSuccess,
}: PaystubUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadResult, setUploadResult] = useState<UploadPaystubResponse | null>(null)
  const uploadPaystub = useUploadPaystub()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setUploadStatus('idle')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadStatus('uploading')
    try {
      const response = await uploadPaystub.mutateAsync({
        file: selectedFile,
        clientCompanyId,
        contractorAssignmentId,
      })
      setUploadStatus('success')
      setUploadResult(response)
      onUploadSuccess?.(response)
      // Reset after 2 seconds
      setTimeout(() => {
        setSelectedFile(null)
        setUploadStatus('idle')
        setUploadResult(null)
      }, 2000)
    } catch (error) {
      setUploadStatus('error')
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setUploadStatus('idle')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {!selectedFile && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-cta bg-cta/10' : 'border-border hover:border-cta/50'}
            ${isDragReject ? 'border-destructive bg-destructive/10' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? 'text-cta' : 'text-muted-foreground'}`} />

          {isDragActive ? (
            <div>
              <p className="text-lg font-medium text-cta">Drop the PDF here</p>
              <p className="text-sm text-muted-foreground mt-1">Release to upload</p>
            </div>
          ) : isDragReject ? (
            <div>
              <p className="text-lg font-medium text-destructive">Invalid file type</p>
              <p className="text-sm text-muted-foreground mt-1">Only PDF files are allowed</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">Drag & drop a paystub PDF here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
              <p className="text-xs text-muted-foreground mt-4">
                Maximum file size: 10MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <Card className="border-secondary">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <FileText className="h-10 w-10 text-cta flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  {uploadStatus === 'idle' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemove}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Upload Status */}
                {uploadStatus === 'success' && uploadResult && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-cta">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {uploadResult.message}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Processed {uploadResult.total_processed} of {uploadResult.total_parsed} paystub(s)
                      {uploadResult.total_skipped > 0 && ` (${uploadResult.total_skipped} skipped)`}
                    </p>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                        <p className="text-xs font-medium text-destructive mb-1">Issues:</p>
                        <ul className="text-xs text-destructive/80 space-y-0.5">
                          {uploadResult.errors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="flex items-center gap-2 mt-3 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Upload failed. Please try again.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            {uploadStatus === 'idle' && (
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleUpload}
                  className="bg-cta hover:bg-cta/90 text-white flex-1"
                  disabled={uploadPaystub.isPending}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadPaystub.isPending ? 'Uploading...' : 'Upload Paystub'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRemove}
                  className="border-border"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
