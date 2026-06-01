import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GameCAL Level Up Launch 이벤트 — GamerClock',
  description: 'GamerClock 론칭 기념 이벤트 참여하고 Steam 기프트카드를 받아가세요! Silver 이상 유저 참여 가능.',
  openGraph: {
    title: 'GameCAL Level Up Launch 이벤트 — GamerClock',
    description: 'GamerClock 론칭 기념 이벤트에 참여하세요. Steam 기프트카드 × 5명 추첨!',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameCAL Level Up Launch 이벤트',
    description: 'GamerClock 론칭 기념 Steam 기프트카드 이벤트!',
    images: ['/og-image.png'],
  },
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
