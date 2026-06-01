import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile & Badges — GamerClock',
  description: 'View your gaming streak, Gamer Points, badges, and party history on GamerClock.',
  openGraph: {
    title: 'Profile & Badges — GamerClock',
    description: 'Track your gaming streak, GP, and unlock badges on GamerClock.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Profile & Badges — GamerClock',
    description: 'Track your gaming streak, GP, and unlock badges.',
    images: ['/og-image.png'],
  },
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
