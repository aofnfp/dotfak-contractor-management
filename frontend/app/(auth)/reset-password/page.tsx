'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import apiClient from '@/lib/api/client'

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Extract access_token from URL hash fragment on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')

    if (token) {
      setAccessToken(token)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      await apiClient.post('/auth/reset-password', {
        access_token: accessToken,
        new_password: password,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.')
    } finally {
      setIsLoading(false)
    }
  }

  // No token found in URL
  if (!accessToken && typeof window !== 'undefined' && !window.location.hash) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.06)_0%,transparent_70%)] p-4">
        <Card className="w-full max-w-md border-gold/30">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-heading text-center text-gold tracking-[0.08em]">
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                This password reset link is invalid or has expired. Please request a new one.
              </div>
              <div className="text-center text-sm">
                <Link href="/forgot-password" className="text-cta hover:underline">
                  Request new reset link
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.06)_0%,transparent_70%)] p-4">
      <Card className="w-full max-w-md border-gold/30">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-heading text-center text-gold tracking-[0.08em]">
            {success ? 'Password Reset' : 'Set New Password'}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground font-display italic">
            {success
              ? 'Your password has been updated successfully'
              : 'Enter your new password below'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="rounded-md bg-cta/10 p-3 text-sm text-cta border border-cta/20">
                Your password has been reset. You can now log in with your new password.
              </div>
              <div className="text-center">
                <Link href="/login">
                  <Button className="bg-cta hover:bg-cta/90 text-white">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-secondary border-border"
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-cta hover:bg-cta/90 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <Link href="/login" className="text-cta hover:underline">
                  Back to login
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
