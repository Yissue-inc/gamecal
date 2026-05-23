'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-4 text-center">
      <h1 className="text-4xl font-bold text-red-400">Something went wrong</h1>
      <p className="mt-4 text-zinc-400">{error.message}</p>
      <div className="mt-8 flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go to Calendar</Link>
        </Button>
      </div>
    </div>
  )
}
