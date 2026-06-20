import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GamerClock Promotions — GamerClock',
  description: 'GamerClock promotions are currently paused. Track game events, resets, release dates, and reminders on GamerClock.',
  openGraph: {
    title: 'GamerClock Promotions — GamerClock',
    description: 'Promotions are currently paused. Open GamerClock to track your game calendar.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GamerClock Promotions',
    description: 'Promotions are currently paused. Open GamerClock to track your game calendar.',
    images: ['/og-image.png'],
  },
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
