# GAMECAL Web App — 완전한 Cursor 자동화 작업 지시서
### PPT 3페이지 기반 · 2026-05-22 · 밤 사이 자동 완성 목표

---

## PPT 분석 & UX 확정안

### Page 1 — MAIN (월간 캘린더)

```
레이아웃:
┌─────────────────────────────────────────────────────────────┐
│  [≡] GAMECAL                    [Search] [?] [⚙] [Month▼]  │
├─────────────────────────────────────────────────────────────┤
│                    │                                        │
│  << Game Select >> │     [Today] [<] [>]  May 2026         │
│                    │                                        │
│  ☑ All             │  SUN  MON  TUE  WED  THU  FRI  SAT   │
│  ☑ Fortnite        ├─────────────────────────────────────  │
│  ☑ World of Warcraft│  26   27   28   29   30  May 1   2   │
│  ☑ Pokémon GO      │                                        │
│  ☑ Genshin Impact  │   3    4    5    6    7    8    9     │
│  ☑ Leag. of Legends│       [══ Fortnite Weekly ══]         │
│  ☑ New Release     │                                        │
│                    │  10   11   12   13   14   15   16     │
│                    │  [WoW Reset]  [══ PoGO Event ══]       │
│  ─────────────────│                                        │
│  [+ Subscribe All] │  17   18   19   20   21   22   23     │
│                    │                    [TODAY circle]      │
└─────────────────────────────────────────────────────────────┘
```

**구현 확정:**
- 라이브러리: `@fullcalendar/react` (Google Calendar와 가장 유사한 오픈소스)
- 이벤트 바: 게임별 brand_color로 날짜 셀 위에 가로 바 형태
- 멀티데이 이벤트: 자동으로 가로로 연결 (FullCalendar 기본 지원)
- 게임 선택: 왼쪽 체크박스 → 즉시 필터 (페이지 리로드 없음)
- 오늘 날짜: 파란 원 강조 (FullCalendar 기본)

---

### Page 2 — 이벤트 클릭 UX 확정안

**클릭 시: 오른쪽 슬라이드 패널 (데스크탑) / 바텀 시트 (모바일)**

```
데스크탑 레이아웃 (클릭 후):
┌──────────────────┬──────────────────────────┐
│  캘린더 (축소)   │  ← 이벤트 상세 패널 380px│
│                  │                          │
│                  │  🎮 [게임 아이콘]         │
│                  │  Fortnite                │
│                  │                          │
│                  │  Iron Banner Weekend     │ ← 제목
│                  │  ─────────────────────  │
│                  │  🔴 LIMITED REWARD        │ ← 타입 배지
│                  │                          │
│                  │  📅 Jun 7 (Sat) – Jun 9  │
│                  │  ⏰ 5:00 PM – 8:00 PM UTC│
│                  │  ⏱ Ends in 2d 14h        │ ← 카운트다운
│                  │                          │
│                  │  Exclusive armor and     │
│                  │  weapons for limited     │
│                  │  time. Don't miss!       │
│                  │                          │
│                  │  ┌──────────────────┐    │
│                  │  │ 📅 Add to Calendar│    │ ← 드롭다운
│                  │  ├──────────────────┤    │
│                  │  │  G  Google       │    │
│                  │  │  📧 Outlook      │    │
│                  │  │  🍎 iCal         │    │
│                  │  │  📋 COPY         │    │
│                  │  └──────────────────┘    │
│                  │                          │
│                  │  [🔗 Official Source]     │
│                  │                    [✕]   │
└──────────────────┴──────────────────────────┘
```

---

### Page 2 — COPY 메시지 포맷 (3가지)

**버튼 클릭 시 자동으로 아래 텍스트가 클립보드에 복사됨**

**Discord용 (마크다운 지원):**
```
🎮 **[Fortnite] Iron Banner Weekend**
📅 Jun 7–9, 2026 · 5:00 PM → 8:00 PM UTC
🔴 Limited Reward | ⏱ Ends in 2 days

> Exclusive armor and weapons available for a limited time!

🔗 gamecal.io/fortnite
📋 Add to your calendar: https://gamecal.io/api/feed/fortnite
```

**Reddit용 (마크다운):**
```
**[Fortnite] Iron Banner Weekend** | Jun 7–9, 2026

📅 June 7 (Sat) to June 9 (Mon) · 5:00 PM – 8:00 PM UTC
⚡ Exclusive armor and weapons available for limited time!

Source: [Epic Games]({{source_url}}) | 📅 [Add to Calendar](https://gamecal.io/fortnite)

*Track all Fortnite events automatically → [GAMECAL](https://gamecal.io)*
```

**Plain text (iMessage/카카오/일반):**
```
🎮 Fortnite – Iron Banner Weekend
📅 Jun 7–9 · 5 PM UTC
⚡ Limited cosmetics — don't miss it!
👉 gamecal.io/fortnite
```

**구현:** COPY 버튼 클릭 시 Discord 포맷으로 기본 복사 + 토스트 "Copied for Discord! ✓"

---

### Page 3 — 세팅 메뉴 (MVP 최소 버전)

```
Settings
├── General
│   ├── Language          [English (US) ▼]
│   ├── Date format       [MM/DD/YYYY ▼]   or  DD/MM/YYYY
│   └── Time format       [12-hour (1:00 PM) ▼]  or 24-hour
│
├── Time Zone
│   ├── Primary timezone  [(GMT-07:00) Pacific Time ▼] [Label: US]
│   ├── Secondary timezone [Optional ▼] [Label: ___]   — toggle on/off
│   └── ☑ Auto-detect timezone from browser
│
├── Calendar View
│   ├── Week starts on    [Sunday ▼]  or  Monday
│   └── ☑ Show weekends
│
├── Games
│   ├── Default games shown: [checkboxes — All selected by default]
│   └── [Manage Subscriptions →]  ← ICS 구독 관리 링크
│
└── Account
    ├── Email
    ├── [Change Password]  (email 로그인 유저만)
    └── [Sign Out]

⛔ MVP 제외 항목:
    Notifications (Phase 2), Dark/Light mode (항상 다크), Keyboard shortcuts,
    Google Workspace, Offline mode, Appointment schedules
```

---

## 로그인/비로그인 상태 차이

```
[비로그인 Guest]
- 오늘 날짜 이벤트만 온전히 보임
- 다른 날짜: 이벤트 바가 blur 처리 + "🔒 Sign up to see all events" CTA 오버레이
- 상단에 배너: "Sign up free to track events across all dates →"
- 게임 선택 사이드바: 보임 (필터는 작동, 오늘만 보임)

[로그인 User]
- 전체 날짜 모든 이벤트 보임
- 개인화 게임 선택 저장됨
- Settings 페이지 접근 가능
- ICS 구독 링크 관리 가능
```

---

## 기술 스택 (최종 확정)

```
Framework    : Next.js 14 (App Router, TypeScript)
Calendar UI  : @fullcalendar/react + @fullcalendar/daygrid + @fullcalendar/interaction
Styling      : Tailwind CSS + shadcn/ui (dark theme default)
Auth         : Supabase Auth (Google OAuth + Email/Password)
Database     : Supabase (PostgreSQL)
ICS          : ical-generator
Crawling     : axios + cheerio
Cron         : Vercel Cron Jobs
Deploy       : Vercel
Package Mgr  : pnpm
```

---

## 수동 세팅 필요 항목 (내일 사용자가 직접)

```
⚠️ 코드 완성 후 아래를 직접 설정해야 합니다:

1. Supabase 프로젝트 생성
   → supabase.com → New project
   → SQL Editor → schema.sql 실행
   → Authentication → Providers → Google OAuth 활성화
     (Google Cloud Console에서 OAuth 클라이언트 ID/Secret 발급 필요)

2. Google OAuth 설정
   → console.cloud.google.com
   → APIs & Services → Credentials → OAuth 2.0 Client ID
   → Authorized redirect URIs: https://[supabase-project].supabase.co/auth/v1/callback

3. Battle.net API 키 (WoW)
   → develop.battle.net/access/clients → 앱 생성

4. Riot API 키 (LoL)
   → developer.riotgames.com → 로그인 → API Key 복사

5. Vercel 배포
   → vercel.com → Import GitHub repo
   → 환경변수 9개 입력
   → Deploy

6. 어드민 패널에서 New Releases 3개 수동 큐레이션
   → /admin?secret=xxx → Releases → is_featured=true 3개 설정
```

---

## DATABASE SCHEMA (전체 — Supabase SQL Editor에서 실행)

```sql
-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  icon_url     TEXT,
  brand_color  TEXT DEFAULT '#6366f1',
  platform     TEXT[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_type   TEXT NOT NULL CHECK (event_type IN (
                 'weekly_reset','season_start','season_end','live_event',
                 'limited_reward','patch_release','tournament','ranked_reset',
                 'banner_end','double_xp','maintenance','new_content','other'
               )),
  importance   TEXT DEFAULT 'normal' CHECK (importance IN ('critical','high','normal','low')),
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  rrule        TEXT,
  source_url   TEXT,
  image_url    TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEW RELEASES (Switch + Steam)
-- ============================================================
CREATE TABLE new_releases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  developer     TEXT,
  platform      TEXT[] NOT NULL,
  release_date  DATE NOT NULL,
  description   TEXT,
  image_url     TEXT,
  steam_url     TEXT,
  nintendo_url  TEXT,
  is_featured   BOOLEAN DEFAULT false,
  is_published  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (Supabase Auth 연동)
-- ============================================================
CREATE TABLE user_preferences (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone          TEXT DEFAULT 'America/New_York',
  secondary_timezone TEXT,
  timezone_label    TEXT DEFAULT 'Home',
  language          TEXT DEFAULT 'en',
  date_format       TEXT DEFAULT 'MM/DD/YYYY',
  time_format       TEXT DEFAULT '12h',
  week_starts_on    INTEGER DEFAULT 0,
  show_weekends     BOOLEAN DEFAULT true,
  selected_games    TEXT[] DEFAULT ARRAY['fortnite','wow','pokemon-go','genshin','lol'],
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS (익명 ICS 구독 트래킹)
-- ============================================================
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID REFERENCES games(id),
  platform      TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_events_game_id  ON events(game_id);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_published ON events(is_published);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE games             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_releases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_games"    ON games         FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_events"   ON events        FOR SELECT USING (is_published = true);
CREATE POLICY "public_read_releases" ON new_releases  FOR SELECT USING (is_published = true);
CREATE POLICY "users_own_prefs"      ON user_preferences FOR ALL USING (auth.uid() = id);
CREATE POLICY "public_insert_subs"   ON subscriptions FOR INSERT WITH CHECK (true);

-- ============================================================
-- SEED: GAMES
-- ============================================================
INSERT INTO games (slug, name, brand_color, platform, sort_order) VALUES
('fortnite',   'Fortnite',          '#00d4ff', ARRAY['PC','PS5','Xbox','Mobile','Switch'], 1),
('wow',        'World of Warcraft', '#f59e0b', ARRAY['PC'], 2),
('pokemon-go', 'Pokémon GO',        '#ffcc00', ARRAY['Mobile'], 3),
('genshin',    'Genshin Impact',    '#4ade80', ARRAY['PC','PS5','Mobile'], 4),
('lol',        'League of Legends', '#c89b3c', ARRAY['PC'], 5);

-- ============================================================
-- SEED: EVENTS (May 25 – July 30, 2026)
-- ============================================================

-- === FORTNITE ===
INSERT INTO events (game_id, title, event_type, importance, start_at, end_at, source_url) VALUES
-- 주간 퀘스트 (매주 목요일)
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-05-28 09:00:00+00', '2026-06-04 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-04 09:00:00+00', '2026-06-11 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-11 09:00:00+00', '2026-06-18 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-18 09:00:00+00', '2026-06-25 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-25 09:00:00+00', '2026-07-02 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-02 09:00:00+00', '2026-07-09 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-09 09:00:00+00', '2026-07-16 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-16 09:00:00+00', '2026-07-23 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-23 09:00:00+00', '2026-07-30 08:59:00+00', 'https://fortnite.com'),
-- 시즌 이벤트
((SELECT id FROM games WHERE slug='fortnite'), 'Fortnite Season End', 'season_end', 'critical', '2026-06-13 02:00:00+00', '2026-06-13 02:00:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'New Season Begins', 'season_start', 'critical', '2026-06-14 09:00:00+00', NULL, 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Battle Pass Ends', 'season_end', 'critical', '2026-06-13 02:00:00+00', NULL, 'https://fortnite.com'),
-- 특별 이벤트
((SELECT id FROM games WHERE slug='fortnite'), 'Summer Splash Event', 'live_event', 'high', '2026-06-20 00:00:00+00', '2026-07-10 23:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Independence Day Event', 'live_event', 'high', '2026-07-01 00:00:00+00', '2026-07-07 23:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Item Shop Rotation', 'loot_rotation', 'normal', '2026-05-25 00:00:00+00', NULL, 'https://fortnite.com'),

-- === WORLD OF WARCRAFT ===
-- 주간 리셋 (매주 화요일 15:00 UTC)
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-05-26 15:00:00+00', '2026-06-02 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-02 15:00:00+00', '2026-06-09 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-09 15:00:00+00', '2026-06-16 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-16 15:00:00+00', '2026-06-23 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-23 15:00:00+00', '2026-06-30 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-30 15:00:00+00', '2026-07-07 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-07-07 15:00:00+00', '2026-07-14 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-07-14 15:00:00+00', '2026-07-21 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-07-21 15:00:00+00', '2026-07-28 14:59:00+00', 'https://worldofwarcraft.com'),
-- 시즌 이벤트
((SELECT id FROM games WHERE slug='wow'), 'Midsummer Fire Festival', 'live_event', 'high', '2026-06-21 10:00:00+00', '2026-07-05 23:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Mythic+ Season 4 End', 'season_end', 'critical', '2026-07-14 15:00:00+00', NULL, 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'PvP Season Reset', 'ranked_reset', 'high', '2026-06-16 15:00:00+00', NULL, 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'WoW Patch 11.2 Release', 'patch_release', 'critical', '2026-06-09 15:00:00+00', NULL, 'https://worldofwarcraft.com'),

-- === POKÉMON GO ===
((SELECT id FROM games WHERE slug='pokemon-go'), 'Community Day June', 'live_event', 'critical', '2026-06-21 14:00:00+00', '2026-06-21 17:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Community Day July', 'live_event', 'critical', '2026-07-19 14:00:00+00', '2026-07-19 17:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 1', 'tournament', 'high', '2026-06-03 18:00:00+00', '2026-06-03 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 2', 'tournament', 'high', '2026-06-10 18:00:00+00', '2026-06-10 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 3', 'tournament', 'high', '2026-06-17 18:00:00+00', '2026-06-17 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 4', 'tournament', 'high', '2026-06-24 18:00:00+00', '2026-06-24 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — July Week 1', 'tournament', 'high', '2026-07-01 18:00:00+00', '2026-07-01 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — July Week 2', 'tournament', 'high', '2026-07-08 18:00:00+00', '2026-07-08 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — July Week 3', 'tournament', 'high', '2026-07-15 18:00:00+00', '2026-07-15 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'GO Season: Timeless Travels End', 'season_end', 'critical', '2026-06-01 10:00:00+00', NULL, 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Spotlight Hour — June Week 1', 'limited_reward', 'normal', '2026-06-02 18:00:00+00', '2026-06-02 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Spotlight Hour — June Week 2', 'limited_reward', 'normal', '2026-06-09 18:00:00+00', '2026-06-09 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Spotlight Hour — June Week 3', 'limited_reward', 'normal', '2026-06-16 18:00:00+00', '2026-06-16 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'GO Fest 2026', 'live_event', 'critical', '2026-07-11 10:00:00+00', '2026-07-12 20:00:00+00', 'https://pokemongolive.com'),

-- === GENSHIN IMPACT ===
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.7 Update', 'new_content', 'critical', '2026-05-28 06:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.7 — Phase 2 Banner', 'banner_end', 'critical', '2026-06-10 18:00:00+00', '2026-06-10 18:00:00+00', 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.7 End / 5.8 Start', 'season_end', 'critical', '2026-07-08 06:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.8 Phase 1 Banner End', 'banner_end', 'critical', '2026-07-22 18:00:00+00', '2026-07-22 18:00:00+00', 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-06-01 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-06-16 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-07-01 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-07-16 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Summer Event 2026', 'live_event', 'high', '2026-06-15 00:00:00+00', '2026-07-07 23:59:00+00', 'https://genshin.hoyoverse.com'),

-- === LEAGUE OF LEGENDS ===
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.11 — Balance Update', 'patch_release', 'high', '2026-05-27 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.12 — Balance Update', 'patch_release', 'high', '2026-06-10 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.13 — Balance Update', 'patch_release', 'high', '2026-06-24 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.14 — Balance Update', 'patch_release', 'high', '2026-07-08 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.15 — Balance Update', 'patch_release', 'high', '2026-07-22 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Split 2 End — Ranked Reset', 'season_end', 'critical', '2026-07-14 00:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Split 3 Start', 'season_start', 'critical', '2026-07-15 00:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'MSI 2026 — Finals', 'tournament', 'critical', '2026-06-20 12:00:00+00', '2026-06-20 18:00:00+00', 'https://lolesports.com'),
((SELECT id FROM games WHERE slug='lol'), 'Night Market Opens', 'limited_reward', 'high', '2026-06-05 00:00:00+00', '2026-06-19 23:59:00+00', 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'LCS Summer Split — Week 1', 'tournament', 'normal', '2026-06-06 18:00:00+00', '2026-06-07 22:00:00+00', 'https://lolesports.com');
```

---

## FILE STRUCTURE

```
gamecal/
├── .env.local
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── vercel.json
├── public/
│   ├── icons/
│   │   ├── fortnite.png
│   │   ├── wow.png
│   │   ├── pokemon-go.png
│   │   ├── genshin.png
│   │   └── lol.png
│   └── og-image.png
└── src/
    ├── app/
    │   ├── layout.tsx              ← Root (다크 테마, Supabase Provider)
    │   ├── page.tsx                ← 메인 캘린더 페이지
    │   ├── auth/
    │   │   ├── login/page.tsx      ← 로그인 페이지
    │   │   └── callback/route.ts   ← OAuth 콜백
    │   ├── settings/page.tsx       ← 세팅 페이지
    │   ├── new-releases/page.tsx   ← 신규 출시 (/newtitle 리다이렉트)
    │   ├── admin/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── events/page.tsx
    │   │   └── releases/page.tsx
    │   └── api/
    │       ├── feed/[game]/route.ts
    │       ├── events/route.ts
    │       ├── events/[id]/route.ts
    │       ├── games/route.ts
    │       ├── new-releases/route.ts
    │       └── cron/
    │           ├── fortnite/route.ts
    │           ├── wow/route.ts
    │           ├── pokemon-go/route.ts
    │           ├── genshin/route.ts
    │           └── lol/route.ts
    ├── components/
    │   ├── ui/                     ← shadcn/ui
    │   ├── calendar/
    │   │   ├── GameCalendar.tsx    ← FullCalendar 래퍼 (메인)
    │   │   ├── GameSidebar.tsx     ← 왼쪽 게임 선택 사이드바
    │   │   ├── EventDetailPanel.tsx ← 오른쪽 슬라이드 패널
    │   │   ├── AddToCalendar.tsx   ← Google/Outlook/iCal/COPY 드롭다운
    │   │   ├── CalendarHeader.tsx  ← 상단 네비게이션
    │   │   └── GuestBlur.tsx       ← 비로그인 블러 오버레이
    │   ├── auth/
    │   │   ├── AuthModal.tsx       ← 로그인 모달
    │   │   ├── GoogleSignIn.tsx
    │   │   └── EmailSignIn.tsx
    │   └── settings/
    │       └── SettingsForm.tsx
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   └── server.ts
    │   ├── ical.ts
    │   ├── copy-format.ts          ← COPY 메시지 포맷터
    │   ├── crawlers/
    │   │   ├── fortnite.ts
    │   │   ├── wow.ts
    │   │   ├── pokemon-go.ts
    │   │   ├── genshin.ts
    │   │   └── lol.ts
    │   └── utils.ts
    ├── hooks/
    │   ├── useAuth.ts              ← 인증 상태
    │   ├── useEvents.ts            ← 이벤트 데이터 페칭
    │   └── usePreferences.ts       ← 유저 설정
    └── types/index.ts
```

---

## ENV VARIABLES

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=
RIOT_API_KEY=
ADMIN_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://gamecal.io
```

---

# CURSOR SESSION 스크립트 (순서대로 실행)

---

## SESSION 1 — 프로젝트 초기화

```
GAMECAL 웹앱을 만들어줘. 구글 캘린더와 동일한 레이아웃의 게이밍 이벤트 캘린더야.

1. Next.js 14 프로젝트 생성:
pnpm create next-app@latest gamecal --typescript --tailwind --app --src-dir --import-alias "@/*"

2. 패키지 설치:
pnpm add @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/interaction
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add ical-generator axios cheerio date-fns
pnpm add -D @types/node

3. shadcn/ui 초기화 (dark mode, slate):
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button badge card dialog tabs toast separator dropdown-menu avatar sheet switch select label input textarea checkbox

4. tailwind.config.ts:
- darkMode: 'class'
- 배경: #0f0f0f

5. src/app/layout.tsx:
- <html lang="en" className="dark">
- 배경 bg-[#0f0f0f] text-white
- Inter 폰트

6. FILE STRUCTURE의 모든 폴더와 빈 파일 생성

7. .env.example 생성 (ENV VARIABLES 내용)

8. vercel.json (Cron 5개):
{
  "crons": [
    {"path":"/api/cron/fortnite","schedule":"0 */6 * * *"},
    {"path":"/api/cron/wow","schedule":"0 */6 * * *"},
    {"path":"/api/cron/pokemon-go","schedule":"0 */8 * * *"},
    {"path":"/api/cron/genshin","schedule":"0 */12 * * *"},
    {"path":"/api/cron/lol","schedule":"0 */12 * * *"}
  ]
}

9. next.config.ts:
- redirects: /newtitle → /new-releases

완료 후 pnpm dev 실행, localhost:3000 접속 확인.
```

---

## SESSION 2 — 타입 정의 + Supabase 클라이언트 + 유틸

```
타입, Supabase 클라이언트, 유틸리티를 구현해줘.

1. src/types/index.ts:

export type EventType = 'weekly_reset' | 'season_start' | 'season_end' | 'live_event' |
  'limited_reward' | 'patch_release' | 'tournament' | 'ranked_reset' |
  'banner_end' | 'double_xp' | 'maintenance' | 'new_content' | 'other'

export type Importance = 'critical' | 'high' | 'normal' | 'low'

export interface Game {
  id: string; slug: string; name: string; icon_url?: string
  brand_color: string; platform: string[]; sort_order: number
}

export interface GameEvent {
  id: string; game_id: string; game?: Game; title: string; description?: string
  event_type: EventType; importance: Importance
  start_at: string; end_at?: string
  is_recurring: boolean; rrule?: string
  source_url?: string; image_url?: string; is_published: boolean; created_at: string
}

export interface NewRelease {
  id: string; title: string; developer?: string; platform: string[]
  release_date: string; description?: string; image_url?: string
  steam_url?: string; nintendo_url?: string; is_featured: boolean
}

export interface UserPreferences {
  id: string; timezone: string; secondary_timezone?: string
  timezone_label: string; language: string; date_format: string
  time_format: '12h' | '24h'; week_starts_on: 0 | 1; show_weekends: boolean
  selected_games: string[]
}

export interface CalendarEvent {
  id: string; title: string; start: string; end?: string
  backgroundColor: string; borderColor: string; textColor: string
  extendedProps: { gameEvent: GameEvent; game: Game }
}

2. src/lib/supabase/client.ts:
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

3. src/lib/supabase/server.ts:
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createClient = () => { /* cookies 기반 서버 클라이언트 */ }

4. src/lib/utils.ts:
- getEventTypeLabel(type: EventType): string
- getEventTypeEmoji(type: EventType): string
- getImportanceColor(importance: Importance): string (hex)
- getImportanceEmoji(importance: Importance): string (🚨/🔴/🟡/🟢)
- formatEventDate(iso: string, tz?: string): string → "Jun 8, 5:00 PM UTC"
- formatDateRange(start: string, end?: string): string → "Jun 7–9"
- isEndingSoon(date: string, hours?: number): boolean
- getCountdown(date: string): string → "2d 14h 23m" / "Ended"
- gameEventToCalendarEvent(event: GameEvent, game: Game): CalendarEvent
  → FullCalendar 형식으로 변환, game.brand_color 적용

5. src/lib/copy-format.ts:
export function formatForDiscord(event: GameEvent, game: Game): string {
  return `🎮 **[${game.name}] ${event.title}**
📅 ${formatDateRange(event.start_at, event.end_at)} · ${formatTime(event.start_at)} UTC
${getImportanceEmoji(event.importance)} ${event.description || ''}

🔗 gamecal.io/${game.slug}
📋 Subscribe: ${process.env.NEXT_PUBLIC_APP_URL}/api/feed/${game.slug}`
}

export function formatForReddit(event: GameEvent, game: Game): string { /* Reddit 마크다운 포맷 */ }
export function formatForPlainText(event: GameEvent, game: Game): string { /* plain text */ }
```

---

## SESSION 3 — Auth 시스템 (Supabase + Google OAuth)

```
Supabase Auth 기반 로그인 시스템을 구현해줘.

지원: Google OAuth + Email/Password (Apple은 나중에)

1. src/hooks/useAuth.ts (클라이언트 훅):
- 현재 유저 상태 (user, session, loading)
- signInWithGoogle()
- signInWithEmail(email, password)
- signUpWithEmail(email, password)
- signOut()
- isGuest: user === null

2. src/app/auth/callback/route.ts:
OAuth 콜백 처리 → 홈으로 리다이렉트

3. src/app/auth/login/page.tsx:
- 다크 테마 로그인 페이지
- "GAMECAL" 로고
- [G Google로 계속] 버튼
- --- or ---
- Email / Password 입력 폼
- [로그인] [회원가입 전환] 버튼
- 하단: 로그인하면 모든 이벤트 캘린더를 볼 수 있어요.

4. src/components/auth/AuthModal.tsx:
Dialog 컴포넌트로 모달 버전 (캘린더에서 blur 클릭 시 사용)
- 동일한 Google + Email 로그인 UI
- 닫기 버튼

5. 로그인 후 user_preferences 자동 생성:
- auth.users 트리거 또는 onAuthStateChange에서
  user_preferences INSERT (기본값으로)

6. src/hooks/usePreferences.ts:
- 유저 설정 읽기/저장
- 비로그인: localStorage 기반 임시 설정
- 로그인: Supabase user_preferences 테이블

비로그인 guest 판단:
  const { user } = useAuth()
  const isGuest = !user
```

---

## SESSION 4 — 메인 캘린더 UI (Google Calendar 레이아웃)

```
핵심 캘린더 화면을 구현해줘. Google Calendar와 동일한 레이아웃이야.

1. src/app/page.tsx (서버 컴포넌트):
- 게임 목록 조회 (Supabase)
- <CalendarLayout> 렌더링

전체 레이아웃:
┌─────────────────────────────────────────────────┐
│ CalendarHeader (상단 고정)                       │
├───────────────┬─────────────────────────────────┤
│ GameSidebar   │ GameCalendar                    │
│ (260px 고정)  │ (나머지 전체)                   │
└───────────────┴─────────────────────────────────┘

2. src/components/calendar/CalendarHeader.tsx:
- 왼쪽: [≡] GAMECAL 로고
- 중앙: [Today] [<] [>] "May 2026"
- 오른쪽: [Month ▼] [로그인 아바타 또는 Sign In]
- 배경: #0f0f0f, border-b border-zinc-800

3. src/components/calendar/GameSidebar.tsx:
props: games: Game[], selectedGames: string[], onToggle: (slug) => void

UI:
- 상단: "<< Game Select >>" 제목
- [☑ All] 체크박스 → 전체 선택/해제
- 각 게임: [☑] [●colored dot] 게임명
  ● 점의 색상 = game.brand_color
- 하단 구분선 후: [+ Subscribe All Calendars]
- 배경: #1a1a1a, border-r border-zinc-800

4. src/components/calendar/GameCalendar.tsx (클라이언트 컴포넌트):
props: selectedGames: string[], isGuest: boolean, onEventClick: (event) => void

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

구현:
- FullCalendar monthView
- headerToolbar: false (CalendarHeader에서 직접 제어)
- 이벤트: Supabase에서 현재 월 이벤트 조회
  (selectedGames 필터 적용)
- 이벤트 바 클릭 → onEventClick(gameEvent) 호출
- 빈 날짜 클릭 → 무시 (유저가 만드는 이벤트 없음)
- locale: usePreferences의 설정 적용 (week starts on)
- FullCalendar 스타일 오버라이드 (다크 테마):
  --fc-border-color: #27272a
  --fc-today-bg-color: rgba(99,102,241,0.1)
  --fc-neutral-bg-color: #1a1a1a
  이벤트 바: rounded-sm, text-xs, truncate

5. 이벤트 색상:
각 이벤트의 backgroundColor = game.brand_color + 투명도
borderColor = game.brand_color
importance=critical → 이벤트 바 왼쪽에 강조 표시

6. GuestBlur.tsx:
비로그인 시 오늘 제외 날짜에 적용:
.fc-daygrid-day:not(.fc-day-today) → 이벤트에 CSS blur(3px) + opacity 0.4
+ 오버레이: "🔒 Sign up to see all events" 클릭 시 AuthModal 열기

실제 구현:
- isGuest=true이면 오늘 이외 날짜 이벤트는 title을 "🔒 Hidden Event"로 변경
- 클릭 시 AuthModal 오픈 (실제 이벤트 보여주지 않음)
- 캘린더 상단 배너: "Create a free account to unlock all event dates →"

7. 상태 관리 (page.tsx 또는 layout에서):
- selectedGames: useState (기본: 전체 선택)
- selectedEvent: useState<GameEvent | null> (클릭한 이벤트)
- isDetailOpen: useState (패널 열림 여부)
```

---

## SESSION 5 — 이벤트 상세 패널 + Add to Calendar

```
이벤트 클릭 시 오른쪽에서 슬라이드되는 상세 패널을 구현해줘.

1. src/components/calendar/EventDetailPanel.tsx:
props: event: GameEvent | null, game: Game | null, isOpen: boolean, onClose: () => void

UI (오른쪽에서 슬라이드):
- 너비: 380px (데스크탑), 풀 화면 (모바일 바텀 시트)
- transition: translate-x-full → translate-x-0 (CSS transition)
- z-index: 50, 배경: #1a1a1a, border-l border-zinc-800

패널 내부:
┌──────────────────────────────────┐
│ [✕] (닫기)                       │
│                                  │
│ [게임 아이콘 32px] Fortnite       │  ← brand_color 아이콘 배경
│                                  │
│ Iron Banner Weekend              │  ← title (text-2xl bold)
│ ─────────────────────────────── │
│ 🔴 LIMITED REWARD    ⏱ 2d 14h   │  ← 타입 배지 + 카운트다운
│                                  │
│ 📅 Jun 7–9, 2026                 │
│ ⏰ 5:00 PM – 8:00 PM UTC         │
│                                  │
│ Exclusive armor and weapons...   │  ← description
│                                  │
│ ┌────────────────────────────┐   │
│ │ 📅 Add to Calendar    [▼] │   │  ← 드롭다운 버튼
│ └────────────────────────────┘   │
│   ├─ G  Google Calendar          │  ← 드롭다운 열리면
│   ├─ 📧 Outlook                  │
│   ├─ 🍎 iCal                     │
│   └─ 📋 COPY                     │
│                                  │
│ [🔗 Official Source →]           │
└──────────────────────────────────┘

2. src/components/calendar/AddToCalendar.tsx:
props: event: GameEvent, game: Game

Google Calendar URL:
  https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={title}&dates={start}/{end}&details={description}&location=gamecal.io

Outlook URL:
  https://outlook.live.com/calendar/0/deeplink/compose?subject={title}&startdt={start}&enddt={end}&body={description}

iCal:
  /api/events/{id}/ics 다운로드 (단일 이벤트 ICS 생성)
  또는 webcal:// URL

COPY 버튼:
  1. 클릭 → formatForDiscord(event, game) 클립보드 복사
  2. 토스트: "Copied for Discord! ✓"
  
  버튼 아래 작게: [Reddit] [Plain Text] 링크로 포맷 변경 가능

3. src/app/api/events/[id]/ics/route.ts:
단일 이벤트 ICS 파일 생성 (ical-generator)
Content-Type: text/calendar

4. 모바일 바텀 시트:
  - md 이하에서 shadcn Sheet 사용 (side="bottom")
  - 동일한 내용을 바텀 시트로 표시
```

---

## SESSION 6 — Settings 페이지

```
세팅 페이지를 구현해줘. Google Calendar 세팅과 유사한 구조.

src/app/settings/page.tsx:
- 로그인 필요 (비로그인 시 /auth/login 리다이렉트)
- Google Calendar Settings와 동일한 2컬럼 레이아웃
  왼쪽: 섹션 네비게이션 (sticky)
  오른쪽: 설정 폼

섹션 1 — General (Language & Region):
  - Language: Select ["English (US)", "한국어", "日本語"]
  - Date format: Select ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]
  - Time format: Radio ["12-hour (1:00 PM)", "24-hour (13:00)"]

섹션 2 — Time Zone:
  - Primary timezone: 검색 가능한 Select (전세계 타임존)
    기본값: Intl.DateTimeFormat().resolvedOptions().timeZone (브라우저 자동 감지)
  - Secondary timezone: Toggle on/off + Select (optional)
    Label input: 최대 5자 (예: "KR", "US")
  - ☑ "Auto-detect timezone from browser" 체크박스

섹션 3 — Calendar View:
  - Week starts on: Select ["Sunday", "Monday"]
  - ☑ Show weekends

섹션 4 — My Games:
  - 게임별 체크박스 (어떤 게임을 기본으로 표시할지)
  - [Subscribe All Calendars] 버튼 → ICS 구독 안내 모달

섹션 5 — Account:
  - 이메일 표시 (수정 불가, 정보용)
  - [Change Password] (email 로그인만)
  - [Sign Out] 버튼 → 확인 다이얼로그

저장: 각 섹션 하단 [Save] 버튼
  → PATCH /api/preferences 호출
  → user_preferences 업데이트
  → 토스트: "Settings saved ✓"

src/hooks/usePreferences.ts:
- Supabase user_preferences 읽기/쓰기
- 변경 즉시 Calendar에 반영 (Context로 전달)
```

---

## SESSION 7 — API Routes + ICS 피드

```
백엔드 API routes를 구현해줘.

1. src/app/api/games/route.ts:
GET: 활성 게임 목록 (sort_order 오름차순)
응답: { games: Game[] }

2. src/app/api/events/route.ts:
GET params: game (slug or 'all'), start, end, types (comma-separated)
  - start/end: ISO 날짜 (캘린더 현재 표시 기간)
  - FullCalendar가 요청하는 기간에 맞춰 조회
  - 응답: GameEvent[] (game 정보 JOIN 포함)

POST (Admin only, Authorization 헤더):
  - 이벤트 생성

3. src/app/api/events/[id]/route.ts:
GET: 단일 이벤트
PUT (Admin): 수정
DELETE (Admin): 삭제

4. src/app/api/events/[id]/ics/route.ts:
GET: 단일 이벤트 ICS 파일
Content-Type: text/calendar

5. src/app/api/feed/[game]/route.ts:
GET: 게임 전체 ICS 피드
game: 'fortnite' | 'wow' | 'pokemon-go' | 'genshin' | 'lol' | 'all'
Cache-Control: public, s-maxage=3600
응답: .ics 파일

6. src/app/api/preferences/route.ts:
GET (auth required): 현재 유저 preferences
PATCH (auth required): preferences 업데이트

7. src/lib/ical.ts:
generateICS(events: GameEvent[], calName: string): string
  - ical-generator 사용
  - 각 이벤트: SUMMARY, DTSTART, DTEND, DESCRIPTION, URL
  - VALARM: 24시간 전 알림
  - importance=critical → VALARM 2개 (24h, 1h 전)

generateSingleEventICS(event: GameEvent, game: Game): string
  - 단일 이벤트용
```

---

## SESSION 8 — 크롤러 + Cron Jobs

```
5개 게임 크롤러와 Cron API를 구현해줘.

공통 함수 (각 크롤러에서 import):
async function upsertEvents(events: Partial<GameEvent>[], gameSlug: string)
  - game_id를 slug로 조회
  - title + DATE(start_at) 조합으로 중복 체크
  - 신규: INSERT, 기존: UPDATE
  - 결과: { inserted, updated }

1. src/lib/crawlers/fortnite.ts:
  소스: https://fortnite-api.com/v2/news?language=en
  + 주간 퀘스트 RRULE (목요일 09:00 UTC): DB에 없으면 INSERT

2. src/lib/crawlers/wow.ts:
  OAuth: POST https://oauth.battle.net/token (client_credentials)
  소스: Blizzard API + wowhead.com/news RSS 백업
  + 주간 리셋 RRULE (화요일 15:00 UTC): DB에 없으면 INSERT

3. src/lib/crawlers/pokemon-go.ts:
  소스: https://leekduck.com/events/ (cheerio 파싱)
  이벤트 타입 자동 분류 (Community Day → live_event, Raid Hour → tournament 등)

4. src/lib/crawlers/genshin.ts:
  소스: https://genshin.hoyoverse.com/en/news (cheerio)
  + Spiral Abyss RRULE (1일, 16일): DB에 없으면 INSERT

5. src/lib/crawlers/lol.ts:
  소스: https://www.leagueoflegends.com/en-us/news/rss/ (RSS)
  + Riot API: https://na1.api.riotgames.com/lol/status/v4/platform-data

각 Cron Route (예: src/app/api/cron/fortnite/route.ts):
  GET:
  - Authorization: Bearer {CRON_SECRET} 검증
  - 해당 크롤러 실행
  - 결과 JSON 반환: { success, inserted, updated, timestamp }

6. src/app/admin/page.tsx (어드민 대시보드):
  - 게임별 이벤트 수
  - 총 구독 수
  - 각 게임 크롤러 수동 실행 버튼
  - 최근 이벤트 10개
```

---

## SESSION 9 — New Releases 페이지 + 어드민 완성

```
신규 출시 페이지와 어드민 패널을 완성해줘.

1. src/app/new-releases/page.tsx:
  - Featured 3개 (is_featured=true): 큰 카드
  - 전체 출시 예정 목록: 날짜순
  - 각 카드:
    [이미지] [Switch/Steam 배지]
    제목 + 개발사
    출시일 + D-Day 카운트다운
    [Add to Calendar] → 단일 ICS 다운로드
    [View on Steam/Nintendo] 링크

2. src/app/admin/layout.tsx:
  ?secret=ADMIN_SECRET 검증

3. src/app/admin/events/page.tsx:
  - DataTable: 게임 | 타입 | 제목 | 날짜 | 중요도 | 공개 | 편집/삭제
  - 이벤트 추가 폼 (Dialog):
    게임 Select / 제목 / 이벤트 타입 / 중요도 / 시작일시 / 종료일시 / 설명 / URL / 공개

4. src/app/admin/releases/page.tsx:
  - 출시 타이틀 목록 + Featured 토글
  - Featured는 최대 3개 (강제)
  - 추가 폼: 제목 / 개발사 / 플랫폼 / 출시일 / 설명 / URL들

5. src/app/api/new-releases/route.ts:
  GET: featured 필터 가능
  POST (Admin): 타이틀 추가 + is_featured 3개 초과 체크
```

---

## SESSION 10 — Seed 데이터 + SEO + 배포 준비

```
Seed 데이터 삽입 스크립트, SEO, 배포 설정을 완성해줘.

1. scripts/seed.ts (pnpm tsx scripts/seed.ts로 실행):
  - GAMECAL_WEBAPP_CURSOR.md의 SEED SQL을 TypeScript로 구현
  - Supabase service_role 클라이언트 사용
  - Games 5개 + Events 60개+ 삽입
  - 실행: DATABASE_SCHEMA의 SEED 데이터 전체

2. SEO:
  - src/app/layout.tsx: 기본 메타 (title, description, og:image)
  - title: "GAMECAL — Gaming Event Calendar | Never Miss a Reset"
  - description: "Track Fortnite, WoW, Pokémon GO, Genshin, LoL events. Auto-sync to Google Calendar."
  
  - src/app/sitemap.ts:
    /, /new-releases, /settings, /auth/login

  - public/robots.txt:
    Allow: /
    Disallow: /admin

3. src/app/not-found.tsx:
  다크 테마 404: "Event not found" + [Go to Calendar] 버튼

4. src/app/error.tsx:
  에러 바운더리

5. README.md — 배포 가이드:
  
  ## Quick Start
  
  ### 1. Supabase
  - New project at supabase.com
  - Run: SQL Editor → paste full schema SQL
  - Authentication → Providers → Enable Google
  - Settings → API → copy URL and keys
  
  ### 2. Google OAuth
  - console.cloud.google.com
  - Create OAuth 2.0 Client ID
  - Authorized redirect: https://[project].supabase.co/auth/v1/callback
  - Copy Client ID + Secret → Supabase Auth settings
  
  ### 3. Game APIs
  - WoW: develop.battle.net → Create Client
  - LoL: developer.riotgames.com → Copy API Key
  
  ### 4. Vercel Deploy
  - Connect GitHub repo
  - Add environment variables (9개)
  - Deploy
  
  ### 5. Seed Data
  - After deploy: pnpm tsx scripts/seed.ts
  - Or: Admin panel → manually add events
  
  ### 6. Test ICS
  - Visit: /api/feed/fortnite
  - Subscribe in Google Calendar
  - Visit: /admin?secret=ADMIN_SECRET

6. package.json scripts 추가:
  "seed": "tsx scripts/seed.ts",
  "db:reset": "supabase db reset"
```

---

## 밤 사이 자동 실행 순서 요약

```
Cursor가 SESSION 1→10 순서로 진행:

SESSION 1: 프로젝트 구조 생성        (15분) → pnpm dev 동작 확인
SESSION 2: 타입 + 유틸 + COPY 포맷  (20분)
SESSION 3: Auth (Google + Email)    (25분) → 로그인 화면 동작
SESSION 4: 메인 캘린더 UI           (35분) → 캘린더 화면 보임
SESSION 5: 이벤트 패널 + AddToCal   (30분) → 클릭 → 패널 슬라이드
SESSION 6: Settings 페이지          (25분) → 세팅 저장/적용
SESSION 7: API Routes + ICS         (25분) → ICS 다운로드 가능
SESSION 8: 크롤러 5개 + Cron        (40분) → 어드민에서 실행 가능
SESSION 9: New Releases + Admin     (30분) → 어드민 완성
SESSION 10: Seed + SEO + 배포 가이드 (20분) → 배포 준비 완료

총 코딩 시간: 약 5~6시간
밤 사이 처리 가능 (세션당 30분 내외)

✅ 코드 완성 후 내일 아침 수동 세팅:
  - Supabase 프로젝트 생성 + SQL 실행
  - Google OAuth 설정
  - Vercel 배포 + 환경변수
  - pnpm tsx scripts/seed.ts 실행 → 이벤트 데이터 DB에 삽입
  - /admin?secret=xxx → New Releases 3개 큐레이션
```

---

*GAMECAL Web App Cursor 작업 지시서 · 2026-05-22*
*Based on: Game Calendar.pdf (3 pages) + All prior GAMECAL planning documents*
