'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const wasDismissed = localStorage.getItem('gamecal-pwa-dismissed') === '1'
    setDismissed(wasDismissed)
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone
    setVisible(isMobile && !isStandalone && !wasDismissed)
  }, [])

  if (!visible || dismissed) return null

  return (
    <div
      data-testid="pwa-install-banner"
      className="flex items-center justify-between gap-3 border-b border-indigo-900/50 bg-indigo-950/40 px-4 py-2 md:hidden"
    >
      <p className="text-xs text-zinc-300">
        📱 Add GAMECAL to your home screen — never miss a reset.
      </p>
      <button
        type="button"
        data-testid="pwa-dismiss"
        onClick={() => {
          localStorage.setItem('gamecal-pwa-dismissed', '1')
          setDismissed(true)
        }}
        className="shrink-0 text-zinc-500 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
