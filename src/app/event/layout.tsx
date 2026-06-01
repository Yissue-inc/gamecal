import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GamerClock Level Up Launch Giveaway — GamerClock',
  description: 'Join the GamerClock launch giveaway for a chance to win a Steam $10 Gift Card. Silver tier or higher required.',
  openGraph: {
    title: 'GamerClock Level Up Launch Giveaway — GamerClock',
    description: 'Join the GamerClock launch giveaway. Steam $10 Gift Card x 5 winners.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GamerClock Level Up Launch Giveaway',
    description: 'Join the GamerClock Steam gift card giveaway.',
    images: ['/og-image.png'],
  },
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
