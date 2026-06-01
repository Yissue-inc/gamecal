import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Wishlists — GamerClock',
  description: 'Your wishlisted game events and upcoming releases with reminders, all in one place.',
  openGraph: {
    title: 'My Wishlists — GamerClock',
    description: 'Wishlisted events and releases with browser push reminders.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Wishlists — GamerClock',
    description: 'Wishlisted events and releases with reminders.',
    images: ['/og-image.png'],
  },
}

export default function MyScheduleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
