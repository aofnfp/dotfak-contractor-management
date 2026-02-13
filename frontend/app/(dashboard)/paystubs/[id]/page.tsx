'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, FileText, User, Building2, Calendar, DollarSign, Clock, AlertCircle, Download, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePaystub, useDeletePaystub } from '@/lib/hooks/usePaystubs'
import { paystubsApi } from '@/lib/api/paystubs'
import { AssignPaystubDialog } from '@/components/paystubs/AssignPaystubDialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaystubDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function PaystubDetailPage({ params }: PaystubDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: paystub, isLoading, error } = usePaystub(id)
  const deletePaystub = useDeletePaystub()
  const [hasUnassignedAccounts, setHasUnassignedAccounts] = useState(false)
  const [checkingAccounts, setCheckingAccounts] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  // Check for unassigned accounts when paystub loads
  useEffect(() => {
    const checkAccounts = async () => {
      if (!paystub) return

      try {
        setCheckingAccounts(true)
        const result = await paystubsApi.checkAccounts(id)
        setHasUnassignedAccounts(result.needs_assignment)
      } catch (error) {
        console.error('Failed to check accounts:', error)
        setHasUnassignedAccounts(false)
      } finally {
        setCheckingAccounts(false)
      }
    }

    checkAccounts()
  }, [paystub, id])

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this paystub? This action cannot be undone.')) {
      await deletePaystub.mutateAsync(id)
      router.push('/paystubs')
    }
  }

  const handleAssignAccounts = () => {
    router.push(`/paystubs/${id}/assign`)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading paystub...</div>
        </div>
      </div>
    )
  }

  if (error || !paystub) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-4">Failed to load paystub</p>
          <Button onClick={() => router.push('/paystubs')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Paystubs
          </Button>
        </div>
      </div>
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
          <h1 className="text-3xl font-heading font-bold tracking-tight">Paystub Details</h1>
          <p className="text-muted-foreground">
            Pay period: {formatDate(paystub.pay_period_begin)} - {formatDate(paystub.pay_period_end)}
          </p>
        </div>
        <div className="flex gap-2">
          {hasUnassignedAccounts && !checkingAccounts && (
            <Button
              onClick={handleAssignAccounts}
              variant="outline"
              className="border-cta text-cta hover:bg-cta hover:text-white"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Assign Bank Accounts
            </Button>
          )}
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={deletePaystub.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deletePaystub.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        {paystub.auto_matched ? (
          <Badge className="bg-cta hover:bg-cta/90">
            Auto-matched to contractor
          </Badge>
        ) : paystub.contractor_assignment_id ? (
          <Badge variant="default">
            Manually Assigned
          </Badge>
        ) : (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            Needs Assignment
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contractor Info */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-cta" />
              <CardTitle>Contractor</CardTitle>
            </div>
            <CardDescription>Assigned contractor information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paystub.contractor_name ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{paystub.contractor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-mono text-sm">{paystub.contractor_code}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-11 w-11 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No contractor assigned
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setAssignDialogOpen(true)}
                >
                  Assign Contractor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cta" />
              <CardTitle>Client Company</CardTitle>
            </div>
            <CardDescription>Client organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{paystub.client_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Code</p>
              <p className="font-mono text-sm">{paystub.client_code}</p>
            </div>
          </CardContent>
        </Card>

        {/* Pay Summary */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-cta" />
              <CardTitle>Pay Summary</CardTitle>
            </div>
            <CardDescription>Paystub financial summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Gross Pay</p>
              <p className="text-2xl font-bold text-cta font-mono">
                {formatCurrency(paystub.gross_pay)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Pay</p>
              <p className="font-mono text-lg">
                {formatCurrency(paystub.net_pay)}
              </p>
            </div>
            {paystub.total_hours && (
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="font-mono">{Number(paystub.total_hours).toFixed(2)} hours</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Info */}
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cta" />
              <CardTitle>File Information</CardTitle>
            </div>
            <CardDescription>Upload and file details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Filename</p>
              <p className="text-sm font-mono truncate">{paystub.file_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">File Size</p>
              <p className="text-sm">{formatFileSize(paystub.file_size)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uploaded</p>
              <p className="text-sm">{formatDate(paystub.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uploaded By</p>
              <p className="text-sm">{paystub.uploader_email}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      {paystub.paystub_data?.earnings && paystub.paystub_data.earnings.length > 0 && (
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
            <CardDescription>Detailed earnings from paystub</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-heading">Description</TableHead>
                    <TableHead className="font-heading text-right">Hours</TableHead>
                    <TableHead className="font-heading text-right">Rate</TableHead>
                    <TableHead className="font-heading text-right">Amount</TableHead>
                    <TableHead className="font-heading text-right">YTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paystub.paystub_data.earnings.map((earning, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{earning.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {earning.hours ? Number(earning.hours).toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {earning.rate ? formatCurrency(earning.rate) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(earning.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {earning.ytd ? formatCurrency(earning.ytd) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Taxes */}
      {paystub.paystub_data?.taxes && paystub.paystub_data.taxes.length > 0 && (
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle>Taxes</CardTitle>
            <CardDescription>Tax deductions from paystub</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-heading">Description</TableHead>
                    <TableHead className="font-heading text-right">Current</TableHead>
                    <TableHead className="font-heading text-right">YTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paystub.paystub_data.taxes.map((tax, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{tax.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(tax.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {tax.ytd ? formatCurrency(tax.ytd) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Paystub Dialog */}
      <AssignPaystubDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        paystubId={id}
        clientCompanyId={paystub.client_company_id}
        clientName={paystub.client_name}
      />

      {/* Payment Distribution */}
      {paystub.payment_distribution && paystub.payment_distribution.length > 0 && (
        <Card className="border-secondary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-cta" />
              <CardTitle>Payment Distribution</CardTitle>
            </div>
            <CardDescription>How net pay is distributed across bank accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-heading">Bank</TableHead>
                    <TableHead className="font-heading">Account</TableHead>
                    <TableHead className="font-heading">Owner</TableHead>
                    <TableHead className="font-heading text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paystub.payment_distribution.map((dist, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{dist.bank_name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        ****{dist.account_last4}
                        {dist.account_name && (
                          <span className="text-muted-foreground ml-2">({dist.account_name})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dist.owner_type === 'contractor' ? 'default' : 'outline'}>
                          {dist.owner_type === 'contractor' ? 'Contractor' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(dist.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
