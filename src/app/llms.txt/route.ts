import { NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/app-url'
import { GUIDES } from '@/lib/guides'

export const dynamic = 'force-static'

export function GET() {
  const appUrl = getAppUrl()
  const guideList = GUIDES.map((guide) => `- ${guide.shortTitle}: ${appUrl}/guides/${guide.slug}`).join('\n')
  const body = `# GamerClock

GamerClock is a gaming event calendar and lightweight engagement platform for players.

## What GamerClock Helps With

- Track live game events, weekly resets, limited-time events, esports fixtures, and new releases.
- Save reminders and build a personal gaming schedule.
- Follow Summer Cup 2026 fixtures, results, group standings, goal scorers, and match history.
- Play ROAR, a Summer Cup 2026 crowd battle game tied to match pages and GamerClock accounts.

## Primary URLs

- Home calendar: ${appUrl}/
- Summer Cup 2026 board: ${appUrl}/summer-cup
- ROAR playable arena: ${appUrl}/roar
- Gaming calendar guides: ${appUrl}/guides
${guideList}
- New game releases: ${appUrl}/new-releases
- Game hubs: ${appUrl}/games/world-cup, ${appUrl}/games/fortnite, ${appUrl}/games/wow, ${appUrl}/games/pokemon-go, ${appUrl}/games/genshin, ${appUrl}/games/lol
- About: ${appUrl}/about

## Core Entities

- Brand: GamerClock
- Product type: gaming event calendar, web app, PWA
- Interactive game: ROAR
- Seasonal experience: Summer Cup 2026
- Main audience: players who follow live game events, esports fixtures, releases, and reminders

## Editorial Notes

- GamerClock uses "Summer Cup 2026" as a generic seasonal football tournament theme.
- GamerClock does not claim affiliation with FIFA or any official World Cup marks.
- ROAR is a free engagement game where users pick a side, cheer, and save rank progress after sign-in.

## Suggested Descriptions

- Short: GamerClock is a gaming event calendar for live events, releases, resets, reminders, and ROAR match participation.
- Long: GamerClock helps players track game events, release dates, weekly resets, esports fixtures, and Summer Cup 2026 matches in one calendar, with ROAR turning selected fixtures into a playable crowd battle.
`

  return new NextResponse(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
