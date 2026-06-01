import type { Metadata, Viewport } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { PreferencesProvider } from '@/hooks/usePreferences'
import { PostHogProvider } from '@/components/PostHogProvider'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { getAppUrl } from '@/lib/app-url'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-rajdhani',
})

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: 'GamerClock — Gaming Event Calendar | Never Miss a Reset',
  description:
    'Track Fortnite, WoW, Pokémon GO, Genshin, LoL events. Auto-sync to Google Calendar.',
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
    description: 'Track Fortnite, WoW, Pokémon GO, Genshin, LoL events. Auto-sync to Google Calendar.',
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
    description: 'Track Fortnite, WoW, Pokémon GO, Genshin, LoL events. Auto-sync to Google Calendar.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className="dark">
      <body className={`${inter.className} ${rajdhani.variable} bg-[#0f0f0f] text-white`}>
        <PostHogProvider>
          <AuthProvider>
            <PreferencesProvider>
              {children}
              <Toaster />
              <ServiceWorkerRegister />
            </PreferencesProvider>
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
