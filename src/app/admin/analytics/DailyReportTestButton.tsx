'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { adminFetch } from '@/lib/admin-fetch'

type SendState = 'idle' | 'sending'

export function DailyReportTestButton() {
  const [state, setState] = useState<SendState>('idle')

  async function sendTest() {
    setState('sending')
    try {
      const res = await adminFetch('/api/admin/daily-report/test', { method: 'POST' })
      const payload = await res.json().catch(() => ({}))

      if (!res.ok || !payload.success) {
        const message = payload?.email?.message ?? payload?.error ?? 'Could not send the test report.'
        toast.error(message)
        return
      }

      toast.success(`Test report sent to ${payload.recipient}.`)
    } catch {
      toast.error('Could not send the test report.')
    } finally {
      setState('idle')
    }
  }

  return (
    <Button onClick={sendTest} disabled={state === 'sending'}>
      {state === 'sending' ? 'Sending...' : 'Send Test Email'}
    </Button>
  )
}
