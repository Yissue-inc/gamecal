# ROAR → GamerClock Retention Loop Prompt

You are the ROAR implementation agent. GamerClock is the parent product and ROAR is the Summer Cup 2026 participation layer inside it.

## Product Intent

ROAR should not behave like a detached mini-game. It should create a loop:

1. User arrives for Summer Cup match interest.
2. GamerClock shows the match calendar, scores, scorers, and group standings.
3. User enters ROAR for a specific match.
4. ROAR gives the user a reason to cheer, pick a side, earn a rank, and share.
5. After the moment, ROAR sends the user back into GamerClock to follow the next match and discover other game calendars.

The goal is not only ROAR playtime. The goal is higher GamerClock usage: more calendar follows, more event detail opens, more signed-in users, more reminders, and more returning users.

## Current GamerClock Surface

GamerClock already has:

- `/` main calendar
- `/roar` ROAR entry page
- `/api/world-cup/matches`
- `/api/events?game=world-cup`
- `/api/feed/world-cup`
- `NEXT UP` Summer Cup Pulse panel with:
  - recent scores
  - goal scorers
  - group standings
  - ROAR CTA
- Summer Cup 2026 event detail CTA:
  - `/roar?matchId=<world-cup-event-id>&source=event_detail`

GamerClock has also added account-owned ROAR API endpoints:

- `POST /api/roar/session`
- `GET /api/roar/session?matchId=<id>&deviceId=<id>`
- `POST /api/roar/cheer`
- `GET /api/roar/cheer?matchId=<id>`
- `POST /api/roar/score`
- `GET /api/roar/score?matchId=<id>`

Important behavior:

- Guests can start sessions and submit cheers using `deviceId`.
- Signed-in users save scores and ranks under GamerClock `user.id`.
- `POST /api/roar/score` requires sign-in.

## Your Task

Design and implement the post-game and in-game retention prompts that return users to GamerClock.

### Required ROAR Moments

1. **Before play**
   - Show the selected match.
   - Show “Back this side” / “Pick your side”.
   - If guest: “Play now, sign in to save your rank.”
   - If signed in: “Progress saves to GamerClock.”

2. **During play**
   - Keep the current match visible.
   - Show next match or group context in a compact way.
   - Avoid making the user feel they left the calendar completely.

3. **After play**
   - Show score, rank, supported team, and match title.
   - Primary CTA:
     - “Follow next match”
     - links to `/` with Summer Cup 2026 still selected.
   - Secondary CTA:
     - “Add Summer Cup calendar”
     - links to `/api/feed/world-cup`
   - Tertiary CTA:
     - “Track my other games”
     - links to `/settings` or `/`

4. **If not signed in**
   - Show:
     - “Sign in to save this ROAR rank”
     - “Keep playing as guest”
   - Do not block the fun too early.

5. **If signed in**
   - Confirm:
     - rank saved
     - GP awarded if API returns it
     - leaderboard position if available

## Suggested Copy

- “You backed Brazil. Follow their next match on GamerClock.”
- “Your ROAR rank is saved to your GamerClock profile.”
- “Don’t miss the next kickoff.”
- “Add the Summer Cup calendar.”
- “Track the games you actually play after the match.”

## Analytics Events

Add or call these PostHog events where possible:

- `roar_viewed`
- `roar_match_selected`
- `roar_cheer_submitted`
- `roar_score_saved`
- `roar_signin_prompt_viewed`
- `roar_calendar_return_clicked`
- `roar_world_cup_feed_clicked`
- `roar_other_games_clicked`

Use properties:

```ts
{
  match_id,
  match_title,
  team_selected,
  signed_in,
  source,
  score,
  rank_label
}
```

## Implementation Notes

- Use GamerClock `matchId` exactly as provided.
- Do not create a separate match ID scheme.
- Use `deviceId` for guest-only session/cheer.
- Save score only after sign-in via `/api/roar/score`.
- Keep UI mobile-first.
- Avoid official tournament logos, official trophy marks, or protected mascots.

## QA

Verify:

- `/roar`
- `/roar?matchId=<world-cup-event-id>&source=event_detail`
- guest session start
- guest cheer
- signed-in score save
- leaderboard read
- return-to-calendar CTA
- world cup feed CTA

Run:

```bash
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
```
