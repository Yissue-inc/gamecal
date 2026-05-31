import type { Metadata } from 'next'
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
  openGraph: {
    title: 'GamerClock — Gaming Event Calendar',
    description: 'Track Fortnite, WoW, Pokémon GO, Genshin, LoL events. Auto-sync to Google Calendar.',
    images: ['/og-image.svg'],
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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
