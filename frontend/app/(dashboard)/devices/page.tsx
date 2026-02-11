'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Search, Plus, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDevices } from '@/lib/hooks/useDevices'

const DevicesTable = dynamic(
  () => import('@/components/devices/DevicesTable').then(m => ({ default: m.DevicesTable })),
  { loading: () => <TableSkeleton rows={5} columns={6} /> }
)

const AddDeviceDialog = dynamic(
  () => import('@/components/devices/AddDeviceDialog').then(m => ({ default: m.AddDeviceDialog }))
)

export default function DevicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined
  const { data: devices, isLoading, error } = useDevices(filters)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const filteredDevices = useMemo(() => {
    if (!devices) return []
    if (!searchInput) return devices

    const q = searchInput.toLowerCase()
    return devices.filter((d) =>
      d.brand?.toLowerCase().includes(q) ||
      d.model?.toLowerCase().includes(q) ||
      d.serial_number?.toLowerCase().includes(q) ||
      d.contractor_name?.toLowerCase().includes(q) ||
      d.manager_name?.toLowerCase().includes(q)
    )
  }, [devices, searchInput])

  const stats = useMemo(() => {
    if (!devices) return { total: 0, in_use: 0, received: 0, delivered: 0 }
    return {
      total: devices.length,
      in_use: devices.filter(d => d.status === 'in_use').length,
      received: devices.filter(d => d.status === 'received').length,
      delivered: devices.filter(d => d.status === 'delivered').length,
    }
  }, [devices])

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground mt-1">
            Track laptops, routers, and other equipment
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-cta hover:bg-cta/90 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cta">{stats.in_use}</div>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.received}</div>
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-secondary">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by brand, model, serial, or name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-secondary">
        <CardHeader>
          <CardTitle>All Devices</CardTitle>
          <CardDescription>{filteredDevices.length} device(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load devices. Please try again.
            </div>
          ) : (
            <DevicesTable devices={filteredDevices} isLoading={isLoading} />
          )}
        </CardContent>
      </Card>

      {showAddDialog && (
        <AddDeviceDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
        />
      )}
    </div>
  )
}
