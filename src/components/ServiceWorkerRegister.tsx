'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/push'

export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker()
  }, [])
  return null
}
