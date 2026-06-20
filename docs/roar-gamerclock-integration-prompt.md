# ROAR x GamerClock Integration Prompt

You are taking over the ROAR mini-game integration for GamerClock.

## Context

GamerClock is a Next.js 14 App Router calendar app at `/Users/ck/gamecal`.
ROAR currently lives in `/Users/ck/Yissue_Brain/TTS_Home Supplies_Project/planb-lab` as the `mini-cup` feature:

- Page: `src/app/mini-cup/page.tsx`
- Main component: `src/components/MiniCupArena.tsx`
- APIs:
  - `src/app/api/mini-cup/matches/route.ts`
  - `src/app/api/mini-cup/cheer/route.ts`
  - `src/app/api/mini-cup/bets/route.ts`
  - `src/app/api/mini-cup/settle/route.ts`
- State/storage helpers:
  - `src/lib/miniCupSupabase.ts`
  - `src/lib/miniCupRateLimit.ts`
- Assets:
  - `public/mini-cup/assets/**`

GamerClock now has a Summer Cup calendar source:

- `src/lib/world-cup.ts`
- `src/app/api/world-cup/matches/route.ts`
- `src/app/api/events/route.ts` merges Summer Cup matches into the main calendar.
- `src/app/api/feed/[game]/route.ts` supports `/api/feed/world-cup`.
- `/roar` currently exists as a teaser/entry page.

The goal is to make ROAR the interactive game layer for the Summer Cup calendar, without breaking GamerClock's calendar-first UX.

## Product Direction

By July 2026, GamerClock should feel like it has a Summer Cup 2026 mode:

- Calendar contains every Summer Cup 2026 fixture as `Summer Cup 2026` events.
- Top calendar takeover invites users to play ROAR.
- Each match can open a ROAR experience scoped to that match.
- Users can cheer for one side, fill the crowd, earn coins/ranks, and share proof.
- ROAR should increase engagement while preserving fast calendar scanning.

## Implementation Target

Port the ROAR mini-game into GamerClock under:

- Page route: `/roar`
- Match route option: `/roar?matchId=<world-cup-event-id>`
- Internal API namespace: `/api/roar/*` or keep `/api/mini-cup/*` only if names are cleanly aliased.

Prefer a focused port over copying the whole PlanB Lab app:

1. Copy/adapt `MiniCupArena.tsx` into `src/components/roar/RoarArena.tsx`.
2. Copy only required assets from `planb-lab/public/mini-cup/assets`.
3. Reuse GamerClock UI primitives where practical.
4. Use `src/lib/world-cup.ts` and `/api/world-cup/matches` as the source of fixtures.
5. Keep ROAR's local fallback mode working if Supabase tables are not ready.
6. Add PostHog events for:
   - `roar_viewed`
   - `roar_match_selected`
   - `roar_cheer_submitted`
   - `roar_share_clicked`
   - `roar_rank_up`

## Data Integration

Summer Cup match events have:

- `id`
- `title`
- `start_at`
- `end_at`
- `description`
- `game.slug === "world-cup"`

ROAR should accept GamerClock event IDs as match IDs. Do not invent separate IDs unless you keep a stable mapping.

Use:

```ts
GET /api/world-cup/matches
GET /api/world-cup/matches?limit=200
```

For a match-scoped game:

```ts
const matchId = searchParams.get("matchId")
```

Then select that match from the world cup API. If absent, default to the next upcoming match.

## UX Requirements

- First screen should be the playable game, not a marketing page.
- Keep mobile portrait excellent.
- Preserve the stadium/crowd fantasy from ROAR.
- Make it obvious which Summer Cup match the user is cheering for.
- Add a compact path back to the calendar.
- Avoid official tournament logos, official trophy marks, or protected mascots.
- Use "Summer Cup 2026" and "ROAR", not official tournament branding beyond generic football/soccer language.

## Suggested GamerClock Touchpoints

- Calendar banner CTA: `/roar`
- Event detail panel CTA for `world-cup` events: `Play ROAR for this match`
- Weekly highlights Summer Cup 2026 card should use stadium art.
- `/games/world-cup` can link into `/roar`.

## Assets Already Copied Into GamerClock

- `public/mini-cup/assets/themes/hero-stadium.webp`
- `public/world-cup-crowd-board.webp`
- `public/world-cup-trophy.png`
- `public/roar-logo-lockup.png`
- `public/roar-mascot.png`

Additional assets can be copied from:

`/Users/ck/Yissue_Brain/TTS_Home Supplies_Project/planb-lab/public/mini-cup/assets`

Prioritize:

- `crowd/**`
- `mascot/**`
- `betting/**` if betting/coins remain in scope
- `sfx/**` only after checking browser autoplay constraints

## QA

Run:

```bash
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
```

Then verify:

- `/`
- `/roar`
- `/api/world-cup/matches`
- `/api/events?game=world-cup`
- `/api/feed/world-cup`

Use browser screenshots for desktop and mobile. Make sure the game is not blank, assets load, text does not overlap, and the calendar remains usable.
