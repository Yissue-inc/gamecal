# GamerClock — Gaming Event Calendar

Track Fortnite, WoW, Pokémon GO, Genshin Impact, and League of Legends events. Auto-sync to Google Calendar via ICS feeds.

## Quick Start

### 1. Install

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase configured, the app runs with mock data for local development.

### 2. Supabase

- Create a project at [supabase.com](https://supabase.com)
- Run `schema.sql` in SQL Editor
- Authentication → Providers → Enable Google OAuth
- Settings → API → copy URL and keys to `.env.local`

### 3. Google OAuth

- [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 Client ID
- Authorized redirect: `https://[project].supabase.co/auth/v1/callback`
- Copy Client ID + Secret → Supabase Auth settings

Apple OAuth is intentionally deferred until the mobile app release phase.

### 4. Game APIs

- **WoW**: [develop.battle.net](https://develop.battle.net) → Create Client
- **LoL**: [developer.riotgames.com](https://developer.riotgames.com) → Copy API Key

### 5. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=
RIOT_API_KEY=
ADMIN_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://gamecal-beryl.vercel.app
```

### 6. Vercel Deploy

- Connect GitHub repo at [vercel.com](https://vercel.com)
- Add all environment variables
- Deploy (cron jobs configured in `vercel.json`)

### 7. Seed Data

```bash
pnpm seed
```

Or add events manually via `/admin?secret=YOUR_ADMIN_SECRET`

### 8. Test ICS

- Visit `/api/feed/fortnite`
- Subscribe in Google Calendar
- Admin panel: `/admin?secret=YOUR_ADMIN_SECRET`

## Features

- **Monthly calendar** with FullCalendar (Google Calendar-style layout)
- **Game filter sidebar** with brand colors
- **Guest mode**: today's events only; other dates blurred
- **Event detail panel** with Add to Calendar (Google, Outlook, iCal, COPY)
- **Settings** page for timezone, date format, game preferences
- **ICS feeds** per game and combined
- **Cron crawlers** for 5 games
- **New Releases** page with featured titles
- **Admin panel** for events and releases management

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- FullCalendar, Tailwind CSS, shadcn/ui
- Supabase Auth + PostgreSQL
- ical-generator, axios, cheerio
- Vercel Cron Jobs
