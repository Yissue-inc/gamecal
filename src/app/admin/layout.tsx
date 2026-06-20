'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const SESSION_KEY = 'admin_secret'

async function verifySecret(secret: string): Promise<{ ok: boolean; networkError?: boolean }> {
  // URL 파라미터 대신 Authorization 헤더로 전달 (로그에 노출 방지)
  try {
    const res = await fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${secret}` },
    })
    return { ok: res.ok }
  } catch {
    return { ok: false, networkError: true }
  }
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [inputSecret, setInputSecret] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    async function verify() {
      // URL에 secret이 있으면 세션에 저장 후 URL에서 제거
      const fromUrl = searchParams.get('secret')
      if (fromUrl) {
        const result = await verifySecret(fromUrl)
        if (result.ok) {
          sessionStorage.setItem(SESSION_KEY, fromUrl)
          setAuthorized(true)
        } else if (result.networkError) {
          setError(true)
        }
        // URL에서 secret 제거 (히스토리/로그 노출 방지)
        const url = new URL(window.location.href)
        url.searchParams.delete('secret')
        router.replace(url.pathname + url.search)
        setChecking(false)
        return
      }

      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        const result = await verifySecret(stored)
        if (result.ok) setAuthorized(true)
        else sessionStorage.removeItem(SESSION_KEY)
        if (result.networkError) setError(true)
      }
      setChecking(false)
    }
    verify()
  }, [searchParams, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(false)
    const result = await verifySecret(inputSecret)
    if (result.ok) {
      sessionStorage.setItem(SESSION_KEY, inputSecret)
      setAuthorized(true)
    } else {
      setError(true)
    }
    setSubmitting(false)
  }

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
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="password"
                placeholder="Admin secret"
                value={inputSecret}
                onChange={(e) => setInputSecret(e.target.value)}
                autoFocus
              />
              {error && <p className="text-sm text-red-400">Could not verify the admin secret. Check the local server and try again.</p>}
              <Button type="submit" className="w-full" disabled={submitting || !inputSecret}>
                {submitting ? 'Verifying…' : 'Enter'}
              </Button>
            </form>
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
          <Link href="/admin/analytics" className="text-sm text-zinc-400 hover:text-white">Analytics</Link>
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
