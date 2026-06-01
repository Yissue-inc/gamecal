import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weekly GP Leaderboard — GamerClock',
  description: 'Compete with other gamers for the weekly Gamer Points leaderboard. Check in daily, earn GP, and claim the top spot.',
  openGraph: {
    title: 'Weekly GP Leaderboard — GamerClock',
    description: 'Top gamers this week by Gamer Points. Check in daily to climb the ranks.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weekly GP Leaderboard — GamerClock',
    description: 'Top gamers this week by Gamer Points.',
    images: ['/og-image.png'],
  },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
