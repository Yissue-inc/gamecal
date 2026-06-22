import type { Metadata, Viewport } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { PreferencesProvider } from '@/hooks/usePreferences'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { PostHogProvider } from '@/components/PostHogProvider'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { getAppUrl } from '@/lib/app-url'
import { JsonLd } from '@/components/seo/JsonLd'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-rajdhani',
})

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: 'GamerClock — Gaming Event Calendar | Never Miss a Reset',
    template: '%s',
  },
  description:
    'Track live game events, release dates, resets, esports fixtures, and Summer Cup 2026 ROAR matches. Save reminders and sync your gaming calendar.',
  keywords: [
    'gaming calendar',
    'game event calendar',
    'video game release calendar',
    'Fortnite events',
    'World of Warcraft reset',
    'Pokemon GO events',
    'Genshin Impact events',
    'League of Legends events',
    'Summer Cup 2026',
    'ROAR game',
  ],
  alternates: {
    canonical: '/',
  },
  applicationName: 'GamerClock',
  category: 'Gaming',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'GamerClock',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-1024.png', sizes: '1024x1024', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'GamerClock — Gaming Event Calendar',
    description: 'Track live game events, release dates, resets, esports fixtures, and Summer Cup 2026 ROAR matches.',
    url: '/',
    siteName: 'GamerClock',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GamerClock gaming event calendar',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GamerClock — Gaming Event Calendar',
    description: 'Track live game events, release dates, resets, esports fixtures, and Summer Cup 2026 ROAR matches.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const appUrl = getAppUrl()
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${appUrl}/#organization`,
      name: 'GamerClock',
      url: appUrl,
      logo: `${appUrl}/icon-512.png`,
      sameAs: ['https://gamerclock.com'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${appUrl}/#website`,
      name: 'GamerClock',
      url: appUrl,
      publisher: { '@id': `${appUrl}/#organization` },
      inLanguage: 'en-US',
      description:
        'GamerClock is a gaming event calendar for live events, release dates, weekly resets, esports fixtures, and ROAR match participation.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': `${appUrl}/#app`,
      name: 'GamerClock',
      url: appUrl,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description:
        'A free web app for tracking gaming events, saving reminders, syncing calendars, and playing ROAR for Summer Cup 2026 fixtures.',
      featureList: [
        'Gaming event calendar',
        'Game release tracking',
        'Calendar reminders',
        'Summer Cup 2026 fixtures',
        'ROAR crowd battle game',
        'Newsletter and push reminders',
      ],
    },
  ]

  return (
    <html lang="en-US" className="dark">
      <body className={`${inter.className} ${rajdhani.variable} bg-[#0f0f0f] text-white`}>
        <JsonLd data={structuredData} />
        <AnalyticsProvider>
          <PostHogProvider>
            <AuthProvider>
              <PreferencesProvider>
                {children}
                <Toaster />
                <ServiceWorkerRegister />
              </PreferencesProvider>
            </AuthProvider>
          </PostHogProvider>
        </AnalyticsProvider>
      </body>
    </html>
  )
}
