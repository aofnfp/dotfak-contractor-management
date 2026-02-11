'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Device } from '@/lib/types/device'

interface DevicesTableProps {
  devices: Device[]
  isLoading: boolean
}

const statusColors: Record<string, string> = {
  received: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  delivered: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  in_use: 'bg-cta hover:bg-cta/90',
  returned: '',
  lost: 'bg-destructive/20 text-destructive border-destructive/30',
}

const typeLabels: Record<string, string> = {
  laptop: 'Laptop',
  router: 'Router',
  phone: 'Phone',
  tablet: 'Tablet',
  other: 'Other',
}

export const DevicesTable = memo(function DevicesTable({ devices, isLoading }: DevicesTableProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading devices...</div>
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">No devices found</p>
        <p className="text-sm text-muted-foreground">
          Click &quot;Add Device&quot; to register a new device
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/70">
            <TableHead className="font-heading">Type</TableHead>
            <TableHead className="font-heading">Brand / Model</TableHead>
            <TableHead className="font-heading">Serial</TableHead>
            <TableHead className="font-heading">Contractor</TableHead>
            <TableHead className="font-heading">Manager</TableHead>
            <TableHead className="font-heading">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow
              key={device.id}
              className="hover:bg-secondary/30"
            >
              <TableCell className="font-medium">
                {typeLabels[device.device_type] || device.device_type}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {[device.brand, device.model].filter(Boolean).join(' ') || '\u2014'}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {device.serial_number || '\u2014'}
              </TableCell>
              <TableCell className="text-sm">
                {device.contractor_name || '\u2014'}
              </TableCell>
              <TableCell className="text-sm">
                {device.manager_name || '\u2014'}
              </TableCell>
              <TableCell>
                <Badge
                  variant={device.status === 'in_use' ? 'default' : 'outline'}
                  className={statusColors[device.status] || ''}
                >
                  {device.status.replace('_', ' ')}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})
