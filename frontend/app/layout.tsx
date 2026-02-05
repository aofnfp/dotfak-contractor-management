import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { RootErrorBoundary } from '@/components/common/RootErrorBoundary'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'DotFak Contractor Management',
  description: 'Contractor management and profit-sharing platform for DotFak Group LLC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <RootErrorBoundary>
            {children}
          </RootErrorBoundary>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
