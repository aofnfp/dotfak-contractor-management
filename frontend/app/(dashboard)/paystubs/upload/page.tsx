'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PaystubUploader } from '@/components/paystubs/PaystubUploader'
import { useClients } from '@/lib/hooks/useClients'
import { useAssignments } from '@/lib/hooks/useAssignments'
import { paystubsApi } from '@/lib/api/paystubs'
import type { UploadPaystubResponse } from '@/lib/types/paystub'

export default function UploadPaystubPage() {
  const router = useRouter()
  const { data: clients } = useClients()
  const { data: assignments } = useAssignments()

  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')

  const activeClients = clients?.filter((c) => c.is_active) || []
  const activeAssignments = assignments?.filter((a) => a.is_active) || []

  // Filter assignments by selected client
  const filteredAssignments = selectedClientId
    ? activeAssignments.filter((a) => a.client_company_id === selectedClientId)
    : activeAssignments

  const handleUploadSuccess = async (response: UploadPaystubResponse) => {
    // Check if any uploaded paystubs have unassigned accounts
    if (response.paystubs && response.paystubs.length > 0) {
      // Check the first uploaded paystub for unassigned accounts
      const firstPaystub = response.paystubs[0]

      if (!firstPaystub?.id) {
        setTimeout(() => router.push('/paystubs'), 1500)
        return
      }

      try {
        const checkResult = await paystubsApi.checkAccounts(firstPaystub.id)

        if (checkResult.needs_assignment) {
          // Redirect to assignment page for this paystub
          setTimeout(() => {
            router.push(`/paystubs/${firstPaystub.id}/assign`)
          }, 1500)
          return
        }
      } catch (error) {
        console.error('Failed to check accounts:', error)
        // Continue to paystubs list on error
      }
    }

    // Navigate to paystubs list page to see all uploaded paystubs
    setTimeout(() => {
      router.push('/paystubs')
    }, 1500)
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/paystubs')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Upload Paystub</h1>
          <p className="text-muted-foreground">
            Upload a PDF paystub to extract earnings data
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Configuration */}
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Select client and optionally specify contractor assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client Selection */}
            <div className="grid gap-2">
              <Label htmlFor="client">
                Client Company <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => {
                  setSelectedClientId(value)
                  setSelectedAssignmentId('') // Reset assignment when client changes
                }}
                required
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select a client company" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {activeClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Required to identify the paystub source
              </p>
            </div>

            {/* Assignment Selection (Optional) */}
            <div className="grid gap-2">
              <Label htmlFor="assignment">
                Contractor Assignment (Optional)
              </Label>
              <Select
                value={selectedAssignmentId}
                onValueChange={setSelectedAssignmentId}
                disabled={!selectedClientId}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={
                    selectedClientId
                      ? "Select assignment or let system auto-match"
                      : "Select a client first"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {filteredAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.contractor_name} ({assignment.contractor_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If not selected, the system will attempt to auto-match based on employee ID
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <h4 className="text-sm font-medium mb-2">Auto-Matching</h4>
              <p className="text-xs text-muted-foreground">
                The system will automatically match paystubs to contractors using the employee ID
                from the paystub. If no match is found, you can manually assign it later.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Drag and drop or click to select a PDF paystub
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedClientId ? (
              <PaystubUploader
                clientCompanyId={selectedClientId}
                contractorAssignmentId={selectedAssignmentId || undefined}
                onUploadSuccess={handleUploadSuccess}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Select a client company first</p>
                <p className="text-sm text-muted-foreground">
                  Choose a client from the configuration panel to enable upload
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
