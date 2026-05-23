'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { useAuth } from '@/hooks/useAuth'

export default function SettingsPage() {
  const { user, loading, isGuest } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isGuest) {
      router.push('/auth/login')
    }
  }, [loading, isGuest, router])

  if (loading || isGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          GAME<span className="text-primary">CAL</span>
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Settings</h1>
      </header>
      <SettingsForm
        email={user?.email ?? ''}
        onSaved={() => toast.success('Settings saved ✓')}
      />
    </div>
  )
}
