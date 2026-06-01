import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GP Shop — GamerClock',
  description: 'Spend your Gamer Points on streak freezes, double GP boosts, profile themes, and exclusive badges.',
  openGraph: {
    title: 'GP Shop — GamerClock',
    description: 'Spend your Gamer Points on streak freezes, double GP boosts, and exclusive profile badges.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GP Shop — GamerClock',
    description: 'Spend your Gamer Points on streak freezes and exclusive badges.',
    images: ['/og-image.png'],
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
