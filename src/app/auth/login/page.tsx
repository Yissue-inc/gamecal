'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-4">
      <Link href="/" className="mb-8 text-3xl font-bold tracking-tight">
        Gamer<span className="text-primary">Clock</span>
      </Link>
      {error && (
        <div className="mb-4 w-full max-w-md rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          Sign-in failed. Please try again.
        </div>
      )}
      <div data-testid="auth-modal" className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#1a1a1a] p-8">
        <AuthForm />
      </div>
      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-white">
        ← Back to calendar
      </Link>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
