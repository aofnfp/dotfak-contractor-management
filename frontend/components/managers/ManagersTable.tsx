'use client'

import { useState, memo } from 'react'
import { MoreHorizontal, Trash2, Eye, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useDeleteManager, useInviteManager } from '@/lib/hooks/useManagers'
import type { Manager } from '@/lib/types/manager'

interface ManagersTableProps {
  managers: Manager[]
  isLoading: boolean
}

const statusColors: Record<string, string> = {
  not_invited: '',
  invited: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  in_progress: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  completed: 'bg-cta hover:bg-cta/90',
}

const statusLabels: Record<string, string> = {
  not_invited: 'Not Invited',
  invited: 'Invited',
  in_progress: 'In Progress',
  completed: 'Onboarded',
}

export const ManagersTable = memo(function ManagersTable({ managers, isLoading }: ManagersTableProps) {
  const router = useRouter()
  const deleteManager = useDeleteManager()
  const inviteManager = useInviteManager()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this manager?')) {
      setDeletingId(id)
      await deleteManager.mutateAsync(id)
      setDeletingId(null)
    }
  }

  const handleInvite = async (id: string) => {
    await inviteManager.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading managers...</div>
      </div>
    )
  }

  if (managers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">No managers found</p>
        <p className="text-sm text-muted-foreground">
          Click &quot;Add Manager&quot; to create your first manager
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/70">
            <TableHead className="font-heading">Name</TableHead>
            <TableHead className="font-heading">Email</TableHead>
            <TableHead className="font-heading">Phone</TableHead>
            <TableHead className="font-heading">Staff</TableHead>
            <TableHead className="font-heading">Onboarding</TableHead>
            <TableHead className="font-heading">Status</TableHead>
            <TableHead className="text-right font-heading">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((manager) => (
            <TableRow
              key={manager.id}
              className="hover:bg-secondary/30 cursor-pointer"
              onClick={() => router.push(`/managers/${manager.id}`)}
            >
              <TableCell className="font-medium">
                {manager.first_name} {manager.last_name}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {manager.email}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {manager.phone || '\u2014'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {manager.managed_count ?? 0}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={manager.onboarding_status === 'completed' ? 'default' : 'outline'}
                  className={statusColors[manager.onboarding_status] || ''}
                >
                  {statusLabels[manager.onboarding_status] || manager.onboarding_status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={manager.is_active ? 'default' : 'secondary'}
                  className={manager.is_active ? 'bg-cta hover:bg-cta/90' : ''}
                >
                  {manager.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-11 w-11 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-secondary border-border">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/managers/${manager.id}`)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {manager.onboarding_status === 'not_invited' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInvite(manager.id)
                        }}
                        disabled={inviteManager.isPending}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invitation
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(manager.id)
                      }}
                      className="text-destructive focus:text-destructive"
                      disabled={deletingId === manager.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingId === manager.id ? 'Deactivating...' : 'Deactivate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})
