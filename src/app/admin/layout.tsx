'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function AdminGate({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function verify() {
      const fromUrl = searchParams.get('secret')
      const stored = sessionStorage.getItem('admin_secret')
      const secret = fromUrl ?? stored

      if (!secret) {
        setChecking(false)
        return
      }

      const res = await fetch(`/api/admin/verify?secret=${encodeURIComponent(secret)}`)
      if (res.ok) {
        sessionStorage.setItem('admin_secret', secret)
        setAuthorized(true)
      }
      setChecking(false)
    }
    verify()
  }, [searchParams])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <Card className="w-full max-w-md bg-zinc-900">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add <code>?secret=YOUR_ADMIN_SECRET</code> to the URL.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold">GamerClock Admin</Link>
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">Dashboard</Link>
          <Link href="/admin/events" className="text-sm text-zinc-400 hover:text-white">Events</Link>
          <Link href="/admin/releases" className="text-sm text-zinc-400 hover:text-white">Releases</Link>
          <Link href="/admin/release-candidates" className="text-sm text-zinc-400 hover:text-white">Candidate Queue</Link>
          <Link href="/admin/settings" className="text-sm text-zinc-400 hover:text-white">Settings</Link>
          <Link href="/admin/event" className="text-sm text-zinc-400 hover:text-white">Launch Event</Link>
        </div>
      </nav>
      {children}
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  )
}
