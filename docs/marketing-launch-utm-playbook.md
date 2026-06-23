# GamerClock Launch UTM Playbook

Use one campaign name per launch wave so GA4, PostHog, and Vercel can be compared without manual cleanup.

## Campaign

- Campaign: `summer_cup_launch`
- Primary URL: `https://gamerclock.com/summer-cup`
- Game URL: `https://gamerclock.com/roar`
- Guide URL: `https://gamerclock.com/guides/summer-cup-match-tracker`

## Share URLs

### Reddit

```text
https://gamerclock.com/summer-cup?utm_source=reddit&utm_medium=community&utm_campaign=summer_cup_launch&utm_content=summer_cup_board
https://gamerclock.com/roar?utm_source=reddit&utm_medium=community&utm_campaign=summer_cup_launch&utm_content=play_roar
```

### Discord

```text
https://gamerclock.com/roar?utm_source=discord&utm_medium=community&utm_campaign=summer_cup_launch&utm_content=play_roar
https://gamerclock.com/summer-cup?utm_source=discord&utm_medium=community&utm_campaign=summer_cup_launch&utm_content=fixtures_standings
```

### X

```text
https://gamerclock.com/roar?utm_source=x&utm_medium=social&utm_campaign=summer_cup_launch&utm_content=play_roar
https://gamerclock.com/guides/summer-cup-match-tracker?utm_source=x&utm_medium=social&utm_campaign=summer_cup_launch&utm_content=match_tracker_guide
```

### Product Hunt / Startup Communities

```text
https://gamerclock.com/?utm_source=producthunt&utm_medium=launch&utm_campaign=summer_cup_launch&utm_content=gaming_calendar
https://gamerclock.com/guides/best-gaming-calendar-app?utm_source=indiehackers&utm_medium=community&utm_campaign=summer_cup_launch&utm_content=calendar_positioning
```

## Measurement Checks

- GA4 property: `360961201`
- GA4 measurement ID: `G-KPBE1ZDTNZ`
- Key events to review: `page_view`, `roar_viewed`, `roar_match_selected`, `roar_auth_gate_hit`, `auth_submitted`, `auth_success`, `roar_score_saved`, `newsletter_subscribed`
- Funnel: landing page view -> ROAR view -> auth gate -> auth success -> score saved
- Segment by `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content`.

## Copy Guardrails

- Use `Summer Cup 2026`, not official tournament branding.
- Do not use FIFA marks, logos, or protected emblems.
- Position ROAR as a free crowd battle tied to a gaming calendar, not betting.
