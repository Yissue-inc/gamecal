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
  }
}

function GA4PageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!gaMeasurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return
    }

    const query = searchParams?.toString()
    window.gtag('config', gaMeasurementId, {
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
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}', { send_page_view: false });
            `}
          </Script>
        </>
      )}
    </>
  )
}
