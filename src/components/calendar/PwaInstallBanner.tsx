'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [promoOpen, setPromoOpen] = useState(false)

  useEffect(() => {
    const wasDismissed = localStorage.getItem('gamecal-pwa-dismissed') === '1'
    setDismissed(wasDismissed)
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone
    setVisible(isMobile && !isStandalone && !wasDismissed)
  }, [])

  useEffect(() => {
    const handlePromoState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail
      setPromoOpen(Boolean(detail?.open))
    }

    window.addEventListener('gamerclock:roar-promo-state', handlePromoState)
    return () => window.removeEventListener('gamerclock:roar-promo-state', handlePromoState)
  }, [])

  if (!visible || dismissed || promoOpen) return null

  return (
    <div
      data-testid="pwa-install-banner"
      className="flex items-center justify-between gap-3 border-b border-indigo-900/50 bg-indigo-950/40 px-4 py-2 md:hidden"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Image src="/icon-192.png" alt="GamerClock" width={28} height={28} className="h-7 w-7 shrink-0 rounded-md" />
        <p className="min-w-0 text-xs text-zinc-300">
          Add GamerClock to your home screen — never miss a reset.
        </p>
      </div>
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
