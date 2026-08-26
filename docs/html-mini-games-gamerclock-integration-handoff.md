# HTML Mini-Games → GamerClock Integration Handoff

Last updated: 2026-08-26  
Owner context: GamerClock parent product, HTML mini-games as embedded engagement layers

## 0. Purpose

This document is the working order for agents who need to connect existing HTML/JS mini-games to the GamerClock server so they can run inside GamerClock instead of living as detached files.

The goal is not just "show an HTML game in a page." The goal is:

1. A GamerClock user enters a calendar/game context.
2. GamerClock launches a mini-game related to that context.
3. The mini-game can run fast for guests.
4. Meaningful progress, score, rank, picks, rewards, and history can be saved after sign-in.
5. After play, the user is sent back into GamerClock: calendar, next event, reminders, feeds, or other games.

ROAR is the existing reference implementation, but future games should use a generic mini-game layer where possible.

## 1. Current GamerClock Repo

Repo:

```txt
/Users/ck/gamecal
```

Framework:

```txt
Next.js 14 App Router
React 18
Supabase
PostHog + Vercel Analytics + GA4 through src/lib/posthog.ts
```

Important existing files:

```txt
src/app/page.tsx
src/app/games/[slug]/page.tsx
src/app/games/[slug]/GameHubClient.tsx
src/app/roar/page.tsx
src/components/roar/RoarArena.tsx
src/components/roar/RoarAccountBridge.tsx
src/app/api/events/route.ts
src/app/api/games/route.ts
src/app/api/roar/*
src/lib/posthog.ts
src/lib/roar.ts
src/types/index.ts
public/mini-cup/assets/**
```

Useful commands:

```bash
cd /Users/ck/gamecal
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
corepack pnpm dev
```

Important repo rule:

```bash
# Do not use this:
git add -A .

# Add only touched files:
git add docs/html-mini-games-gamerclock-integration-handoff.md
```

## 2. Product Principle

Mini-games are retention layers inside GamerClock, not separate destinations.

Each game should answer:

- Why did this user enter from GamerClock?
- Which calendar event, game, season, or tournament does this mini-game belong to?
- What can a guest do immediately?
- What becomes better after sign-in?
- What CTA returns them to the calendar loop?
- What analytics event proves the loop worked?

Default loop:

```txt
Calendar / Game Hub / Event detail
  → Play mini-game
  → Guest quick play
  → Score / rank / reward moment
  → Sign in to save
  → Save progress
  → Follow next event / subscribe feed / track other games
```

## 3. Integration Levels

Use the lowest level that satisfies the product need.

### Level A — Static embed only

Use when:

- The game is pure HTML/CSS/JS.
- No score save is needed yet.
- It is just a playable promo or prototype.

Implementation:

```txt
public/mini-games/<slug>/index.html
public/mini-games/<slug>/assets/**
src/app/mini-games/[slug]/page.tsx
```

Render with an iframe:

```tsx
<iframe
  src={`/mini-games/${slug}/index.html?context=${encodeURIComponent(contextId)}`}
  title={gameTitle}
  sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
  className="h-[100dvh] w-full border-0"
/>
```

Notes:

- Do not use `allow-forms` unless the game has an actual form.
- Do not use `allow-top-navigation` unless there is a very deliberate reason.
- If the game needs audio, expect mobile browsers to require the first user gesture.

### Level B — Embedded HTML game + GamerClock bridge

Use when:

- The game needs score save, session save, analytics, or post-game CTAs.
- The HTML game should stay mostly intact.

Implementation:

```txt
public/mini-games/<slug>/index.html
src/app/play/[miniGameSlug]/page.tsx
src/components/minigames/MiniGameShell.tsx
src/components/minigames/MiniGameFrame.tsx
src/app/api/minigames/session/route.ts
src/app/api/minigames/score/route.ts
src/app/api/minigames/events/route.ts
src/lib/minigames.ts
```

The parent page owns:

- GamerClock header/back CTA
- selected event context
- auth gate
- save/claim/share CTA
- analytics

The iframe owns:

- game loop
- canvas or DOM rendering
- local controls
- immediate score feedback

Communication uses `postMessage`.

### Level C — Full React port

Use when:

- The game has complex UI that needs to feel native inside GamerClock.
- The iframe boundary becomes painful.
- The game must share UI, auth, API state, or animations deeply with GamerClock.

ROAR is now closer to Level C:

```txt
src/app/roar/page.tsx
src/components/roar/RoarArena.tsx
src/app/api/roar/*
```

Only choose Level C when the game is strategic. Most HTML mini-games should start at Level B.

## 4. Recommended Generic File Structure

Add this structure for future HTML games:

```txt
public/mini-games/
  <slug>/
    index.html
    manifest.json
    assets/
      ...

src/app/play/
  [miniGameSlug]/
    page.tsx

src/components/minigames/
  MiniGameShell.tsx
  MiniGameFrame.tsx
  MiniGameResultPanel.tsx
  MiniGameAuthGate.tsx

src/app/api/minigames/
  catalog/route.ts
  session/route.ts
  score/route.ts
  claim/route.ts

src/lib/
  minigames.ts
  minigame-bridge.ts
```

Do not create one-off routes for every tiny HTML game unless there is a product reason.

Good:

```txt
/play/reaction-rush?eventId=<event-id>&source=event_detail
/play/coin-flick?game=fortnite&source=game_hub
```

Avoid:

```txt
/reaction-rush-special-landing
/coinflick-final-final-v2
```

## 5. Mini-Game Manifest Contract

Each HTML game should ship with:

```txt
public/mini-games/<slug>/manifest.json
```

Recommended shape:

```json
{
  "slug": "reaction-rush",
  "title": "Reaction Rush",
  "description": "Tap targets before the timer expires.",
  "version": "1.0.0",
  "entry": "/mini-games/reaction-rush/index.html",
  "thumbnail": "/mini-games/reaction-rush/assets/thumbnail.webp",
  "orientation": "portrait",
  "input": ["tap", "keyboard"],
  "supportsGuest": true,
  "requiresAuthFor": ["save_score", "claim_reward"],
  "score": {
    "primaryMetric": "score",
    "higherIsBetter": true,
    "unit": "pts"
  },
  "calendar": {
    "allowedGameSlugs": ["world-cup", "fortnite", "wow"],
    "eventScoped": true
  },
  "analyticsPrefix": "minigame_reaction_rush"
}
```

The manifest should be treated as display/config only. Never trust it for permissions or reward amounts.

## 6. Parent → Iframe Context Contract

When `MiniGameFrame` loads the iframe, send context after the iframe posts `MINIGAME_READY`.

Parent message:

```ts
type MiniGameContextMessage = {
  type: 'GAMECLOCK_CONTEXT'
  payload: {
    miniGameSlug: string
    sessionId: string
    deviceId: string
    signedIn: boolean
    userId?: string
    source: string
    event?: {
      id: string
      title: string
      gameSlug: string
      startAt: string
      endAt?: string
      metadata?: Record<string, unknown>
    }
    game?: {
      slug: string
      name: string
      brandColor?: string
    }
    locale: string
  }
}
```

Iframe should listen:

```js
window.parent.postMessage({ type: 'MINIGAME_READY' }, window.location.origin)

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return
  if (event.data?.type !== 'GAMECLOCK_CONTEXT') return
  window.GAMERCLOCK_CONTEXT = event.data.payload
})
```

Use same-origin iframe URLs under `/mini-games/<slug>/` so origin checks stay simple.

## 7. Iframe → Parent Event Contract

The HTML game should emit lifecycle events:

```ts
type MiniGameOutboundMessage =
  | { type: 'MINIGAME_READY' }
  | { type: 'MINIGAME_STARTED'; payload?: MiniGameEventPayload }
  | { type: 'MINIGAME_SCORE_CHANGED'; payload: { score: number; combo?: number; coins?: number } }
  | { type: 'MINIGAME_COMPLETED'; payload: MiniGameCompletionPayload }
  | { type: 'MINIGAME_SAVE_REQUESTED'; payload: MiniGameCompletionPayload }
  | { type: 'MINIGAME_CTA_CLICKED'; payload: { cta: string; target?: string } }
  | { type: 'MINIGAME_ERROR'; payload: { message: string; code?: string } }

type MiniGameEventPayload = {
  miniGameSlug?: string
  eventId?: string
  gameSlug?: string
  source?: string
}

type MiniGameCompletionPayload = {
  score: number
  durationMs: number
  level?: number
  rankLabel?: string
  result?: 'win' | 'loss' | 'draw' | 'complete'
  stats?: Record<string, number | string | boolean>
}
```

Example inside HTML game:

```js
function sendToGamerClock(type, payload) {
  window.parent.postMessage({ type, payload }, window.location.origin)
}

sendToGamerClock('MINIGAME_STARTED', {
  miniGameSlug: window.GAMERCLOCK_CONTEXT?.miniGameSlug,
  eventId: window.GAMERCLOCK_CONTEXT?.event?.id,
  source: window.GAMERCLOCK_CONTEXT?.source
})

sendToGamerClock('MINIGAME_COMPLETED', {
  score,
  durationMs,
  rankLabel: 'A',
  stats: { taps, maxCombo }
})
```

## 8. Device ID and Guest Flow

ROAR already uses:

```txt
localStorage key: gamerclock_roar_device_id
```

For generic mini-games, prefer:

```txt
localStorage key: gamerclock_minigame_device_id
```

Device ID helper:

```ts
function getOrCreateMiniGameDeviceId() {
  const key = 'gamerclock_minigame_device_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = `mg_${crypto.randomUUID()}`
  window.localStorage.setItem(key, next)
  return next
}
```

Guest policy:

- Guest can play.
- Guest can generate local score/result.
- Guest can submit low-risk session pings if `deviceId` is present.
- Sign-in is required for durable profile score, rank, leaderboard, reward claim, or account history.
- The auth gate copy should be about saving, not blocking:

```txt
Play now. Sign in to save this score to GamerClock.
```

## 9. Generic API Design

Use `/api/minigames/*` for new games. Keep `/api/roar/*` for ROAR unless/until it is migrated.

### GET `/api/minigames/catalog`

Returns playable games from manifests plus server allowlist.

Response:

```json
{
  "games": [
    {
      "slug": "reaction-rush",
      "title": "Reaction Rush",
      "entry": "/mini-games/reaction-rush/index.html",
      "thumbnail": "/mini-games/reaction-rush/assets/thumbnail.webp",
      "supportsGuest": true
    }
  ]
}
```

### POST `/api/minigames/session`

Purpose:

- Create/update session for a guest or user.
- Bind session to event/game/source.
- Return `sessionId`.

Request:

```json
{
  "miniGameSlug": "reaction-rush",
  "eventId": "event-id-or-null",
  "gameSlug": "world-cup",
  "deviceId": "mg_uuid",
  "source": "event_detail"
}
```

Response:

```json
{
  "session": {
    "id": "uuid",
    "miniGameSlug": "reaction-rush",
    "eventId": "event-id-or-null"
  },
  "identity": "device",
  "persisted": true
}
```

### POST `/api/minigames/score`

Purpose:

- Save user-owned score.
- Requires sign-in.

Request:

```json
{
  "sessionId": "uuid",
  "miniGameSlug": "reaction-rush",
  "eventId": "event-id-or-null",
  "gameSlug": "world-cup",
  "score": 1234,
  "rankLabel": "A",
  "durationMs": 45000,
  "stats": {
    "taps": 221,
    "maxCombo": 18
  }
}
```

Unauthenticated response:

```json
{
  "error": "Sign in to save this mini-game score",
  "authRequired": true
}
```

Authenticated response:

```json
{
  "score": {
    "id": "uuid",
    "score": 1234,
    "rankLabel": "A"
  },
  "leaderboard": [],
  "awardedGp": 3
}
```

### GET `/api/minigames/score?miniGameSlug=<slug>&eventId=<id>`

Returns leaderboard for a specific mini-game and optional event.

### POST `/api/minigames/claim`

Optional. Use only if the game has rewards/coins/items.

Rules:

- Claim requires sign-in.
- Server decides reward amount.
- Never trust iframe reward values.

## 10. Suggested Supabase Tables

If the generic mini-game layer is implemented, add migrations rather than overloading ROAR tables.

Suggested tables:

```sql
create table if not exists mini_game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  mini_game_slug text not null,
  event_id text,
  game_slug text,
  source text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists mini_game_sessions_lookup_idx
  on mini_game_sessions (mini_game_slug, event_id, game_slug);

create index if not exists mini_game_sessions_identity_idx
  on mini_game_sessions (user_id, device_id);

create table if not exists mini_game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references mini_game_sessions(id) on delete set null,
  mini_game_slug text not null,
  event_id text,
  game_slug text,
  score integer not null default 0,
  rank_label text,
  duration_ms integer,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mini_game_slug, event_id)
);

create index if not exists mini_game_scores_leaderboard_idx
  on mini_game_scores (mini_game_slug, event_id, score desc, updated_at asc);
```

If eventless games are allowed, the `unique (user_id, mini_game_slug, event_id)` behavior with `NULL` event IDs needs special handling. Either use a generated scope key or store eventless scope as `'global'`.

## 11. Calendar/Event Context

Existing events use:

```ts
GameEvent {
  id: string
  game_id: string
  game?: Game
  title: string
  start_at: string
  end_at?: string
  metadata?: Record<string, unknown>
}
```

Relevant APIs:

```txt
GET /api/events
GET /api/events?game=<slug>
GET /api/games
GET /api/feed/<gameSlug>
```

For Summer Cup/ROAR reference:

```txt
GET /api/world-cup/matches
GET /api/roar/matches
GET /api/events?game=world-cup
GET /api/feed/world-cup
```

For future HTML games:

- If game is attached to a calendar event, pass `eventId`.
- If game is attached to a game hub, pass `game=<slug>`.
- If game is a global arcade game, use no event but still pass `source`.

Recommended URLs:

```txt
/play/<miniGameSlug>?eventId=<event-id>&source=event_detail
/play/<miniGameSlug>?game=<game-slug>&source=game_hub
/play/<miniGameSlug>?source=arcade
```

## 12. Entry Points to Add

### Event detail panel

In `src/components/calendar/EventDetailPanel.tsx`, add a CTA when an event has mini-game metadata.

Possible metadata:

```ts
metadata: {
  miniGameSlug: 'reaction-rush',
  miniGameLabel: 'Play Reaction Rush'
}
```

CTA:

```tsx
<Link href={`/play/${miniGameSlug}?eventId=${event.id}&source=event_detail`}>
  Play for this event
</Link>
```

### Game hub

In `src/app/games/[slug]/GameHubClient.tsx`, add a mini-game module if the game has configured games.

Example:

```txt
Fortnite hub → "Play Drop Timer"
Summer Cup hub → "Play ROAR"
Genshin hub → "Play Resin Rush"
```

### Home calendar banner

For high-priority campaigns, add a small banner on `/` that links to:

```txt
/play/<miniGameSlug>?source=home_banner
```

Do not make every mini-game a homepage takeover.

## 13. MiniGameShell Responsibilities

`MiniGameShell` should do this:

1. Read URL params:

```txt
miniGameSlug
eventId
game
source
```

2. Resolve context:

- Load manifest/catalog by slug.
- Load event with `/api/events` or server helper if `eventId` exists.
- Load game with `/api/games` if `game` exists.
- Choose fallback context if nothing is provided.

3. Create session:

```txt
POST /api/minigames/session
```

4. Render:

- Back to calendar button.
- Compact event/game context.
- Iframe.
- Save/rank/share CTA zone.
- Guest sign-in prompt only after a meaningful moment.

5. Listen to iframe messages:

- `MINIGAME_READY`
- `MINIGAME_STARTED`
- `MINIGAME_SCORE_CHANGED`
- `MINIGAME_COMPLETED`
- `MINIGAME_SAVE_REQUESTED`
- `MINIGAME_CTA_CLICKED`
- `MINIGAME_ERROR`

6. Save:

- If signed in, call `/api/minigames/score`.
- If guest, open auth modal with pending context.

## 14. Analytics

Use the shared tracking function:

```ts
import { trackEvent } from '@/lib/posthog'
```

Standard events:

```txt
minigame_viewed
minigame_session_started
minigame_started
minigame_score_changed_sampled
minigame_completed
minigame_save_requested
minigame_auth_gate_hit
minigame_score_saved
minigame_calendar_return_clicked
minigame_feed_clicked
minigame_other_games_clicked
minigame_error
```

Properties:

```ts
{
  mini_game_slug,
  mini_game_title,
  event_id,
  event_title,
  game_slug,
  game_name,
  signed_in,
  source,
  score,
  rank_label,
  duration_ms
}
```

Important:

- Do not emit `score_changed` every tap. Sample it or only send major milestones.
- Keep PostHog/Vercel/GA4 through `trackEvent`; do not directly import `posthog-js` inside game components.
- If an iframe game needs analytics, route it through parent `postMessage`; do not add analytics scripts inside each HTML game.

## 15. Auth Gate

Follow ROAR policy:

```txt
Guest can play.
Sign-in required for durable save, rank, leaderboard, reward claim.
```

Auth gate timing:

- Do not block the first play.
- Show sign-in after:
  - game completed
  - score save requested
  - reward claim requested
  - leaderboard/rank action requested

Copy:

```txt
Sign in to save this score
Keep playing as guest
Your run is ready. Save it to your GamerClock profile.
```

On auth start, preserve context:

```txt
nextPath=/play/<miniGameSlug>?eventId=<event-id>&source=<source>
```

Use existing auth components:

```txt
src/components/auth/AuthModal.tsx
src/hooks/useAuth
```

## 16. Result and Retention CTAs

Every mini-game should have a result panel with:

Primary:

```txt
Save score
```

or, if already saved:

```txt
Follow next event
```

Secondary:

```txt
Back to calendar
```

Optional:

```txt
Subscribe to this game calendar
Track other games
Share result
Play again
```

Target URLs:

```txt
Calendar: /
Specific game calendar: /?game=<gameSlug>
Feed: /api/feed/<gameSlug>
Settings: /settings
Game hub: /games/<gameSlug>
```

For event-scoped games, keep this phrasing:

```txt
You played for <event title>. Follow the next window on GamerClock.
```

## 17. Security and Performance Rules for HTML Games

### Iframe security

Use same-origin iframe when possible:

```txt
/mini-games/<slug>/index.html
```

Use sandbox:

```tsx
sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
```

Do not allow:

```txt
allow-top-navigation
allow-modals
allow-forms
```

unless required and reviewed.

### Message security

Parent must check:

```ts
event.origin === window.location.origin
event.source === iframeRef.current?.contentWindow
```

Iframe must check:

```js
event.origin === window.location.origin
```

Validate payload shape. Do not trust iframe score blindly for rewards.

### Performance

Before importing an HTML game:

- Remove external CDNs if possible.
- Move assets under `public/mini-games/<slug>/assets`.
- Compress images to WebP/PNG as appropriate.
- Keep first load small.
- Make canvas dimensions responsive.
- Avoid forced full-page scroll traps.
- Audio must be user-gesture unlocked.
- Pause loop when iframe/page is hidden:

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame()
  else resumeGame()
})
```

## 18. Mobile Requirements

Minimum QA widths:

```txt
375 x 667
390 x 844
430 x 932
```

Rules:

- Core action visible within first screen when possible.
- Tap targets at least 44px.
- No horizontal overflow.
- No browser zoom on tap. Inputs should use `font-size: 16px` or avoid text inputs in game area.
- Use `100dvh`, not hard-coded `100vh`, for mobile shells.
- Respect `env(safe-area-inset-bottom)`.
- Do not put fixed CTAs over the main game controls.

## 19. Static HTML Game Intake Checklist

For each existing HTML game, collect:

```txt
Game name:
Slug:
Source folder:
Main HTML file:
Assets folder:
Third-party scripts:
Canvas or DOM:
Required orientation:
Inputs:
Audio:
Score variable:
Game-over event:
Restart function:
Can pause/resume:
Can accept context:
Needs eventId:
Needs gameSlug:
Needs leaderboard:
Needs rewards:
```

Then modify the HTML game minimally:

1. Add ready event:

```js
window.parent.postMessage({ type: 'MINIGAME_READY' }, window.location.origin)
```

2. Add context listener:

```js
window.addEventListener('message', receiveContext)
```

3. Add completed event:

```js
window.parent.postMessage({
  type: 'MINIGAME_COMPLETED',
  payload: { score, durationMs, stats }
}, window.location.origin)
```

4. Add pause/resume on visibility change.

5. Remove hard-coded external links that break the GamerClock loop.

## 20. Implementation Sequence for an Agent

Do this in order.

### Step 1 — Inventory

Find the HTML games and list:

```bash
find <source-folder> -maxdepth 3 -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' \)
```

For each game, identify:

- entry HTML
- asset paths
- score variable
- game over function
- restart function
- external network calls
- mobile assumptions

### Step 2 — Copy into public

Create:

```txt
public/mini-games/<slug>/
```

Copy only that game's files. Do not dump a whole unrelated repo.

### Step 3 — Normalize paths

Inside HTML/CSS/JS:

- Fix relative asset URLs.
- Remove absolute local filesystem paths.
- Remove references to `localhost`.
- Replace external scripts with local files if license allows.

### Step 4 — Add manifest

Create:

```txt
public/mini-games/<slug>/manifest.json
```

### Step 5 — Add bridge script

Prefer a tiny shared bridge copied into:

```txt
public/mini-games/_shared/gamerclock-bridge.js
```

HTML usage:

```html
<script src="/mini-games/_shared/gamerclock-bridge.js"></script>
```

Bridge exposes:

```js
window.GamerClockMiniGame.ready()
window.GamerClockMiniGame.started(payload)
window.GamerClockMiniGame.scoreChanged(payload)
window.GamerClockMiniGame.completed(payload)
window.GamerClockMiniGame.error(payload)
window.GamerClockMiniGame.onContext(callback)
```

### Step 6 — Build Next shell

Create:

```txt
src/app/play/[miniGameSlug]/page.tsx
src/components/minigames/MiniGameShell.tsx
src/components/minigames/MiniGameFrame.tsx
```

### Step 7 — Add API

Create generic endpoints only after shell works:

```txt
src/app/api/minigames/session/route.ts
src/app/api/minigames/score/route.ts
```

Use ROAR API patterns:

```txt
src/app/api/roar/session/route.ts
src/app/api/roar/score/route.ts
src/lib/roar.ts
```

But create a generic helper:

```txt
src/lib/minigames.ts
```

### Step 8 — Add entry points

Add CTAs from:

```txt
Event detail panel
Game hub
Home campaign banner if appropriate
```

### Step 9 — QA

Run:

```bash
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
```

Browser QA:

```txt
/play/<slug>
/play/<slug>?eventId=<event-id>&source=event_detail
/play/<slug>?game=<game-slug>&source=game_hub
/api/minigames/catalog
/api/minigames/score?miniGameSlug=<slug>
```

Mobile QA:

```txt
375 x 667
390 x 844
430 x 932
```

### Step 10 — Commit safely

Never:

```bash
git add -A .
```

Use:

```bash
git add \
  docs/html-mini-games-gamerclock-integration-handoff.md \
  public/mini-games/<slug> \
  src/app/play/[miniGameSlug]/page.tsx \
  src/components/minigames \
  src/app/api/minigames \
  src/lib/minigames.ts
```

## 21. QA Checklist

Functional:

- [ ] Game loads inside GamerClock route.
- [ ] No blank iframe.
- [ ] Assets return 200.
- [ ] Game starts without sign-in.
- [ ] Game completes.
- [ ] Parent receives `MINIGAME_COMPLETED`.
- [ ] Guest sees save/sign-in prompt after meaningful moment.
- [ ] Signed-in user can save score.
- [ ] Score appears in leaderboard/history.
- [ ] Back to calendar CTA works.
- [ ] Feed CTA works if game has a feed.
- [ ] Event-scoped URL preserves `eventId`.

Analytics:

- [ ] `minigame_viewed`
- [ ] `minigame_session_started`
- [ ] `minigame_started`
- [ ] `minigame_completed`
- [ ] `minigame_auth_gate_hit`
- [ ] `auth_submitted`
- [ ] `auth_success`
- [ ] `minigame_score_saved`
- [ ] `minigame_calendar_return_clicked`

Mobile:

- [ ] 375px no horizontal overflow.
- [ ] 390px core controls visible.
- [ ] 430px layout still intentional.
- [ ] Tap target >= 44px.
- [ ] No accidental page zoom.
- [ ] Audio unlock works or fails quietly.

Security:

- [ ] iframe sandbox present.
- [ ] postMessage origin checked.
- [ ] parent verifies `event.source`.
- [ ] no untrusted remote scripts.
- [ ] server validates score payload.
- [ ] reward claim is server-authoritative.

Performance:

- [ ] images compressed.
- [ ] animation pauses on hidden tab.
- [ ] no runaway intervals after restart.
- [ ] no console error loop.
- [ ] build output does not balloon unexpectedly.

## 22. Suggested First PR Scope

Do not implement every system at once. First PR should prove the path with one simple game.

Recommended first PR:

1. Add `public/mini-games/_shared/gamerclock-bridge.js`.
2. Add one HTML game under `public/mini-games/<slug>`.
3. Add `/play/[miniGameSlug]` shell.
4. Add parent/iframe messaging.
5. Add analytics only, no persistence.
6. Add a result panel with "Back to calendar" and "Play again."

Second PR:

1. Add `/api/minigames/session`.
2. Add `/api/minigames/score`.
3. Add auth gate.
4. Add leaderboard/history.

Third PR:

1. Add event detail CTAs.
2. Add game hub modules.
3. Add feed/next-event retention.
4. Add rewards/claims if needed.

## 23. Common Failure Modes

### Game works standalone but not in iframe

Likely causes:

- HTML assumes root-relative assets.
- JS blocks iframe with `window.top`.
- Pointer lock/fullscreen requires sandbox permission.
- Browser audio blocked until user gesture.

### Score never reaches parent

Likely causes:

- iframe uses `'*'` target but parent checks origin incorrectly.
- parent listener not installed before game posts complete.
- event type string mismatch.
- game completes before `GAMECLOCK_CONTEXT` arrives.

### Mobile screen scrolls weirdly

Likely causes:

- iframe uses `100vh` instead of `100dvh`.
- parent has fixed CTA over iframe.
- body overflow rules conflict.
- canvas has fixed desktop width.

### Save works locally but fails on production

Likely causes:

- Supabase env missing.
- migration not applied.
- RLS/admin client mismatch.
- auth cookie not available in route.
- score payload has non-JSON values.

### Analytics missing

Likely causes:

- iframe tried to emit analytics directly.
- parent did not route `postMessage` events to `trackEvent`.
- ad blockers hide PostHog but Vercel/GA4 still should receive shared `trackEvent`.

## 24. Relationship to ROAR

ROAR should remain the premium reference:

```txt
/roar
src/components/roar/RoarArena.tsx
src/app/api/roar/*
```

Do not destabilize ROAR while building generic mini-games.

Re-use lessons:

- guest first
- sign-in to save
- event-scoped deep links
- compact calendar return CTA
- PostHog event names
- mobile-first layout
- local fallback when persistence is unavailable

But do not blindly copy:

- ROAR-specific table names
- ROAR's football-specific language
- `mini-cup` asset paths
- Summer Cup-specific data assumptions

## 25. Agent Start Prompt

Paste this to an implementation agent:

```txt
You are integrating existing HTML mini-games into GamerClock.

Read:
- docs/html-mini-games-gamerclock-integration-handoff.md
- docs/roar-gamerclock-integration-prompt.md
- src/app/roar/page.tsx
- src/components/roar/RoarArena.tsx
- src/app/api/roar/session/route.ts
- src/app/api/roar/score/route.ts
- src/lib/posthog.ts

Goal:
Implement one HTML mini-game as a GamerClock embedded game at /play/<slug>.

Rules:
- Do not use git add -A.
- Guests can play.
- Sign-in is required only for durable score/rank/reward save.
- Use postMessage bridge between iframe and parent.
- Parent owns analytics/auth/calendar CTAs.
- Run tsc/lint/build.
- QA mobile 375/390/430 widths.

Deliver:
- copied game under public/mini-games/<slug>
- manifest.json
- shared iframe bridge if missing
- /play/[miniGameSlug] shell
- result panel
- analytics events
- QA notes
```

## 26. Open Decisions for CK

These should be decided before building many games:

1. Should the generic route be `/play/<slug>` or `/mini-games/<slug>`?
   - Recommendation: `/play/<slug>` for user-facing routes, `/mini-games/<slug>` only for static files.
2. Should all mini-game scores grant GP?
   - Recommendation: no. Start with score save only; add GP per game after abuse review.
3. Should eventless games appear on the calendar?
   - Recommendation: no. Put them in a Game Hub/Arcade module first.
4. Should HTML games be allowed to fetch remote APIs directly?
   - Recommendation: no. Proxy through GamerClock APIs.
5. Should ROAR migrate to the generic mini-game tables?
   - Recommendation: not now. Stabilize generic path with one small game first.

---

## 27. 진행 기록 (2026-08-26) — PR2 완료 + `pilgrims-path` 편입

§22 의 "Second PR" 범위를 구현했다. 첫 게임으로 천로역정(`pilgrims-path`)을 새로 넣었다.

### 넣은 것

| 파일 | 내용 |
|---|---|
| `public/mini-games/pilgrims-path/index.html` | 단일 파일 게임(360KB). 외부 이미지·사운드 0개 — 전 어셋을 코드로 생성한다 |
| `public/mini-games/pilgrims-path/manifest.json` | §5 계약 그대로 |
| `public/mini-games/pilgrims-path/assets/cinematic/` | 컷신 일러스트 교체 위치 (§26 하단, 별도 사양서 있음) |
| `src/lib/minigames.ts` | 카탈로그 등록 + **서버 헬퍼** (identity·스코프키·stats 정제·점수 상한) |
| `src/app/api/minigames/session/route.ts` | §9 세션 API. 게스트 허용, 저장 불가 환경에서는 로컬 세션으로 폴백 |
| `src/app/api/minigames/score/route.ts` | §9 점수 API + 리더보드. 미로그인 401 `authRequired` |
| `supabase/migrations/021_mini_game_sessions_scores.sql` | §10 테이블 2종 + RLS |
| `src/components/minigames/MiniGameShell.tsx` | 세션 생성 · 점수 저장 · 인증 게이트 · 로그인 후 보류 저장 재개 |
| `src/components/minigames/MiniGameResultPanel.tsx` | 저장 상태 표시 · 개인 최고 안내 · 재시도 |

### §10 의 미해결 항목을 이렇게 정했다

> "If eventless games are allowed, the `unique (user_id, mini_game_slug, event_id)` behavior
> with NULL event IDs needs special handling."

→ **`event_scope` 컬럼을 따로 둔다.** 이벤트가 없으면 `'global'` 이 들어간다.
`event_id` 는 원본 그대로 남겨 두고, 유일 제약과 리더보드 인덱스는 `event_scope` 를 쓴다.

### 서버가 아이프레임을 믿지 않는 지점 (§17)

- 점수는 `clampMiniGameScore()` 로 매니페스트 지표별 상한까지 자른다.
- `stats` 는 얕은 스칼라 24개까지만, 문자열은 120자까지만 통과시킨다.
- `sessionId` 가 `local_` 로 시작하면 DB 참조로 쓰지 않는다.
- 개인 최고 기록은 서버가 비교한다 — 더 나쁜 기록이 덮어쓰지 못한다.

### 저장이 불가능해도 플레이는 막지 않는다

Supabase 미설정, 마이그레이션 이전, 세션 API 실패 — 세 경우 모두 로컬 세션으로 폴백하고
게임은 정상 시작한다. 점수 저장만 "아직 켜지지 않았다"고 안내한다.

### QA 결과

```
corepack pnpm exec tsc --noEmit   ✓
corepack pnpm lint                ✓ No ESLint warnings or errors
corepack pnpm build               ✓  /play/[miniGameSlug] 10.3 kB / 207 kB
```

| 확인 | 결과 |
|---|---|
| `/play/pilgrims-path?source=arcade` 게스트 실행 | ✓ |
| `MINIGAME_READY` / `STARTED` / `SCORE_CHANGED` / `COMPLETED` 수신 | ✓ (payload 실측 확인) |
| 결과 패널 · 랭크 라벨 표시 | ✓ `12 chapters · Safely Home` |
| 게스트 점수 저장 → 401 `authRequired` → 인증 게이트 | ✓ |
| `GET /api/minigames/catalog` | ✓ 4종 |
| `GET /api/minigames/score?miniGameSlug=…` | ✓ `{rows:[],me:null}` |
| 알 수 없는 슬러그 → 400 | ✓ |
| 375 / 430 가로 오버플로 | ✓ 없음 (부모·아이프레임 양쪽) |
| 터치 가상 패드 | ✓ 세로 화면에서 자동 표시 |

### 이 과정에서 고친 임베드 관련 버그 (다음 게임에도 해당)

1. **`document.hidden` 이 참인데 화면은 보이는 임베드** — 아이프레임/아티팩트 뷰어에서
   실측으로 발생했다. `document.hidden` 만 보고 루프를 멈추면 사용자에겐 그냥 먹통이다.
   → **최근 5초 안에 입력이 있었으면 계속 돌린다.** 진짜 숨은 탭은 입력이 없으므로 그대로 멈춘다.
2. **`Math.max(1, scale)`** 로 캔버스 최소 배율을 1로 두면 375px 에서 480px 캔버스가 넘친다.
   → 1 미만 배율을 허용해야 한다. §18 "375px no horizontal overflow" 를 지키려면 필수다.
3. **컨텍스트 도착 전에 그린 DOM 은 언어가 어긋난다** — 시작 오버레이만 한국어로 남았다.
   → 언어 변경 리스너를 두고 컨텍스트 수신 시 다시 그린다.

### 손대지 않은 것 — 판단이 필요하다

`public/mini-games/_bible-shared/assets/` 에 **번들 69개 중 실제 참조는 5개**,
미사용분이 **약 92MB** 다. 그런데 이 폴더는 **지금도 다른 세션이 쓰고 있다**
(작업 중 `index-C4RrB1b9.js` → `index-CNnS1f5y.js` 로 참조가 바뀌는 것을 목격).
빌드가 돌아가는 중에 지우면 라이브가 깨질 수 있어 **삭제하지 않았다.**

정리하려면 light-warrior/jonah 작업이 멈춘 시점에 아래처럼 확인 후 지운다:

```bash
grep -oh 'assets/index-[A-Za-z0-9_-]*\.\(js\|css\)' public/mini-games/*/index.html \
  | sed 's|assets/||' | sort -u > /tmp/used.txt
ls public/mini-games/_bible-shared/assets/ | grep -E '^index-.*\.(js|css|map)$' \
  | grep -vFf /tmp/used.txt        # ← 지울 목록. 눈으로 확인 후 삭제
```

### 공유 브리지 보강 (모든 게임에 적용)

`_shared/gamerclock-bridge.js` 의 READY 핸드셰이크를 고정 3회 펄스에서
**컨텍스트가 올 때까지 400ms 간격 재시도**(최대 20초)로 바꿨다.

부모 React 가 느리게 마운트되면 고정 펄스(120/500/1200ms)를 전부 놓치고,
게임은 멀쩡히 돌아가는데 부모는 로딩 베일에 갇힌다 — §23 "Score never reaches parent"
의 첫 번째 원인과 같은 뿌리다. 컨텍스트 수신 자체가 "부모가 듣고 있다"는 증거이므로
그때 재시도를 멈춘다. 부모 없이 열린 페이지는 20초 뒤 알아서 멈춘다.

### 다음 (§22 Third PR)

- 이벤트 상세/게임 허브 CTA
- 리더보드 화면 노출 (API 는 이미 있다)
- GP 지급 여부 결정 (§26-2 는 "일단 하지 말자" 권고)
