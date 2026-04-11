import type { Metadata } from 'next'
import './globals.css'
import { AppLayout } from '@/components/layout/AppLayout'

export const metadata: Metadata = {
  title: 'TCG Vault',
  description: 'Pokemon & TCG inventory, pricing, and P&L tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
