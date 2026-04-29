'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  adminImpersonationApi,
  type ImpersonationTarget,
} from '@/lib/api/admin-impersonation'
import { useImpersonation } from '@/lib/hooks/useImpersonation'

interface ImpersonatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImpersonatePicker({ open, onOpenChange }: ImpersonatePickerProps) {
  const { startImpersonating, isStarting } = useImpersonation()
  const [targets, setTargets] = useState<ImpersonationTarget[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    adminImpersonationApi
      .listTargets()
      .then((data) => setTargets(data))
      .catch((e) => setError(e?.response?.data?.detail || 'Failed to load users'))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!query) return targets
    const q = query.toLowerCase()
    return targets.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.code || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q),
    )
  }, [targets, query])

  const handlePick = async (target: ImpersonationTarget) => {
    try {
      await startImpersonating(target)
      onOpenChange(false)
      setQuery('')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to start impersonation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>View as another user</DialogTitle>
          <DialogDescription>
            Pick a contractor or manager to see exactly what they see. Read-only —
            writes are blocked while impersonating, and every session is recorded
            in the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by name, code, or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-md border border-border">
          {loading && (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading users…</div>
          )}
          {error && (
            <div className="p-6 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {query ? 'No users match that search.' : 'No impersonatable users found.'}
            </div>
          )}
          {!loading && !error && filtered.map((t) => (
            <button
              key={t.auth_user_id}
              onClick={() => handlePick(t)}
              disabled={isStarting}
              className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-secondary/50 disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{t.name || '(no name)'}</p>
                  <Badge variant="outline" className="text-xs uppercase tracking-wider">
                    {t.role}
                  </Badge>
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {t.code ? `${t.code} · ` : ''}
                  {t.email || '—'}
                </p>
              </div>
              <Eye className="h-4 w-4 shrink-0 text-cta" />
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
