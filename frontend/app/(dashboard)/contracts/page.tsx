'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FileSignature, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Pagination } from '@/components/ui/pagination'
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge'
import { useContracts, usePendingSignatures } from '@/lib/hooks/useContracts'
import type { ContractStatus } from '@/lib/types/contract'

const ITEMS_PER_PAGE = 20

export default function ContractsPage() {
  const { data: contracts, isLoading, error } = useContracts()
  const { data: pending } = usePendingSignatures()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    if (!contracts) return []
    if (statusFilter === 'all') return contracts
    return contracts.filter(c => c.status === statusFilter)
  }, [contracts, statusFilter])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  const stats = useMemo(() => {
    if (!contracts) return { total: 0, executed: 0, pendingAdmin: 0, pendingContractor: 0 }
    return {
      total: contracts.length,
      executed: contracts.filter(c => c.status === 'fully_executed').length,
      pendingAdmin: contracts.filter(c => c.status === 'pending_admin').length,
      pendingContractor: contracts.filter(c => c.status === 'pending_contractor').length,
    }
  }, [contracts])

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground mt-1">
          Manage contractor agreements and signatures
        </p>
      </div>

      {/* Pending signatures banner */}
      {pending && pending.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0" />
            <p className="text-sm text-orange-400">
              <strong>{pending.length} contract(s)</strong> awaiting your counter-signature.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.executed}</div>
          </CardContent>
        </Card>
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{stats.pendingAdmin}</div>
          </CardContent>
        </Card>
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Contractor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.pendingContractor}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-secondary">
        <CardContent className="pt-6">
          <Select
            value={statusFilter}
            onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1) }}
          >
            <SelectTrigger className="w-[220px] bg-secondary border-border">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_contractor">Awaiting Contractor</SelectItem>
              <SelectItem value="pending_admin">Awaiting Admin</SelectItem>
              <SelectItem value="fully_executed">Executed</SelectItem>
              <SelectItem value="superseded">Superseded</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
          <CardDescription>{filtered.length} contract(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load contracts.
            </div>
          ) : isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contracts found.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Contractor</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((contract) => (
                    <TableRow key={contract.id} className="border-border">
                      <TableCell className="font-medium">
                        {contract.contractor_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contract.client_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {contract.contract_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        v{contract.version}
                      </TableCell>
                      <TableCell>
                        <ContractStatusBadge status={contract.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/contracts/${contract.id}`}>
                          <Button variant="ghost" size="sm">
                            <FileSignature className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > ITEMS_PER_PAGE && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={ITEMS_PER_PAGE}
                  totalItems={filtered.length}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
