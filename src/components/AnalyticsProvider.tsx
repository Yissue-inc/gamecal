'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { Analytics } from '@vercel/analytics/react'
import { Suspense, useEffect } from 'react'

const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_GA4_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    __gamerclockGA4Initialized?: boolean
  }
}

function initializeGA4() {
  if (!gaMeasurementId || typeof window === 'undefined') return false

  window.dataLayer = window.dataLayer || []
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }

  if (!window.__gamerclockGA4Initialized) {
    window.gtag('js', new Date())
    window.gtag('config', gaMeasurementId, { send_page_view: false })
    window.__gamerclockGA4Initialized = true
  }

  return true
}

function GA4PageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!initializeGA4()) {
      return
    }

    const query = searchParams?.toString()
    const gtag = window.gtag
    if (!gtag) return

    gtag('config', gaMeasurementId, {
      page_path: query ? `${pathname}?${query}` : pathname,
      send_page_view: true,
    })
  }, [pathname, searchParams])

  return null
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
      <Suspense fallback={null}>
        <GA4PageTracker />
      </Suspense>
      {gaMeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
        </>
      )}
    </>
  )
}
