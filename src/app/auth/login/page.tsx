'use client'

import Link from 'next/link'
import { AuthForm } from '@/components/auth/AuthForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-4">
      <Link href="/" className="mb-8 text-3xl font-bold tracking-tight">
        Gamer<span className="text-primary">Clock</span>
      </Link>
      <div data-testid="auth-modal" className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#1a1a1a] p-8">
        <AuthForm />
      </div>
      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-white">
        ← Back to calendar
      </Link>
    </div>
  )
}
