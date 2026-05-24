'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export function DigestSubscribe() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setLoading(true)
    try {
      const res = await fetch('/api/digest/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Subscribed! Weekly digest coming Monday.')
      setEmail('')
    } catch {
      toast.error('Could not subscribe. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-zinc-800 p-4">
      <p className="mb-2 text-[11px] text-zinc-400">📬 Weekly gaming digest</p>
      <form data-testid="digest-subscribe-form" onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          data-testid="digest-email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white placeholder:text-zinc-600"
        />
        <button
          type="submit"
          data-testid="digest-subscribe-btn"
          disabled={loading}
          className="rounded bg-indigo-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Go
        </button>
      </form>
    </div>
  )
}
