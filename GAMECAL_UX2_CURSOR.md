# GAMECAL — UX Phase 2: "게이머가 탭을 닫지 않는 캘린더"
### Cursor SESSION U1~U4 · 2026-05-23
### 기준: 레퍼런스 IGN 카드 + The Verge 사이드 피드 + 게이머 감성

---

## 전체 레이아웃 변경 (현재 → 목표)

```
현재:
┌──────────┬───────────────────────────────────┬──────────────────┐
│ GameSide │         Calendar                  │ EventPanel(조건) │
└──────────┴───────────────────────────────────┴──────────────────┘

목표:
┌──────────┬───────────────────────────────────┬────────────────┐
│          │ 🔥 THIS WEEK — 히어로 카드 스트립  │                │
│ GameSide │ ─────────────────────────────────  │  NEXT UP ⚡    │
│  (좁아짐 │         Calendar                  │  upcoming feed │
│  220px)  │         (높이 조정)                │  240px 고정    │
└──────────┴───────────────────────────────────┴────────────────┘
            ↑ EventDetailPanel은 NEXT UP 위를 덮는 overlay로 변경
```

---

## SESSION U1 — "THIS WEEK" 히어로 카드 스트립

### 레퍼런스
첨부 이미지 1: IGN 스타일 — 풀블리드 이미지 + 하단 컬러 타이틀 바

### 위치
캘린더 상단, 달력 그리드 바로 위 (캘린더 main 영역 내부 상단)

### 컴포넌트: `WeeklyHighlights.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  🔥 THIS WEEK                                    [< scroll >] │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│ │[KEY ART]   │ │[KEY ART]   │ │[KEY ART]   │ │[KEY ART]   │  │
│ │            │ │            │ │            │ │            │  │
│ │            │ │            │ │            │ │            │  │
│ │████████████│ │████████████│ │████████████│ │████████████│  │
│ │🏆 CRITICAL │ │🚀 SEASON   │ │🎉 EVENT    │ │🔧 PATCH    │  │
│ │MSI Finals  │ │S4 Begins   │ │Summer Spl  │ │Patch 16.12 │  │
│ │Jun 20 · LoL│ │Jun 14 · FN │ │Jun 20→Jul  │ │Jun 10 · WoW│  │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**카드 스펙:**
- 너비: `240px` 고정 / 높이: `160px`
- 이미지: `new_releases.image_url` OR 게임 brand_color 그라디언트
- 하단 컬러 바: 이벤트 importance 기준
  - `critical` → `#ef4444` (빨강)
  - `high` → 게임 brand_color
  - `normal` → `#27272a`
- 스크롤: 가로 스크롤 (`overflow-x: auto`, no-scrollbar)
- 클릭: EventDetailPanel 열기 (기존 동일)

**데이터 소스:**
```ts
// 이번 주 (오늘~7일) critical/high 이벤트만
const weeklyHighlights = events
  .filter(e => isThisWeek(e.start_at) && ['critical','high'].includes(e.importance))
  .sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
  .slice(0, 8)
```

**카드 컴포넌트:**
```tsx
// src/components/calendar/WeeklyHighlights.tsx
function HighlightCard({ event, game }: { event: GameEvent; game: Game }) {
  const bgStyle = event.image_url
    ? { backgroundImage: `url(${event.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${game.brand_color}40 0%, #0f0f0f 100%)` }

  const barColor = event.importance === 'critical' ? '#ef4444' : game.brand_color

  return (
    <div className="relative h-40 w-60 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-800
                    hover:border-zinc-600 hover:scale-[1.02] transition-all duration-200 group">
      {/* Image / gradient bg */}
      <div className="absolute inset-0" style={bgStyle} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Game badge top-left */}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
           style={{ backgroundColor: `${game.brand_color}30`, color: game.brand_color, border: `1px solid ${game.brand_color}50` }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: game.brand_color }} />
        {game.name}
      </div>

      {/* D-day top-right */}
      {isUpcoming(event.start_at) && (
        <div className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
          {getDday(event.start_at)}
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
           style={{ borderTop: `2px solid ${barColor}`, background: `linear-gradient(0deg, #000 0%, transparent 100%)` }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
             style={{ color: barColor }}>
          {getEventTypeIcon(event.event_type)} {getEventTypeLabel(event.event_type)}
        </div>
        <div className="text-sm font-bold text-white leading-tight line-clamp-2">{event.title}</div>
        <div className="text-[10px] text-zinc-400 mt-0.5">{formatShortDate(event.start_at)}</div>
      </div>
    </div>
  )
}

export function WeeklyHighlights({ events, games }: { events: GameEvent[]; games: Game[] }) {
  const gameMap = Object.fromEntries(games.map(g => [g.id, g]))
  const highlights = events
    .filter(e => e.game && isThisWeek(e.start_at) && ['critical','high'].includes(e.importance))
    .sort((a,b) => (a.importance==='critical'?0:1)-(b.importance==='critical'?0:1))
    .slice(0, 8)

  if (!highlights.length) return null

  return (
    <div className="border-b border-zinc-800 px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-bold text-white">🔥 THIS WEEK</span>
        <span className="text-xs text-zinc-500">— {highlights.length} major events</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {highlights.map(e => (
          <HighlightCard key={e.id} event={e} game={e.game!} />
        ))}
      </div>
    </div>
  )
}
```

---

## SESSION U2 — "NEXT UP ⚡" 우측 사이드 피드

### 레퍼런스
첨부 이미지 2: The Verge 스타일 — "THE LATEST ⚡" 오른쪽 스크롤 피드

### 위치
캘린더 오른쪽 고정 패널 `240px` (EventDetailPanel이 열리면 이 위에 overlay)

### 컴포넌트: `UpcomingFeed.tsx`

```
┌──────────────────────────┐
│  NEXT UP ⚡              │
│  ──────────────────────  │
│  TODAY                   │
│  ● 🔴 LIVE NOW           │
│  ██ Fortnite             │
│  Double XP ends in 2h    │
│  ──────────────────────  │
│  TOMORROW                │
│  ● 🔄 Tue · 3:00 PM UTC │
│  ██ Destiny 2            │
│  Weekly Reset            │
│                          │
│  ● 🏆 Tue · 12:00 UTC   │
│  ██ League of Legends    │
│  MSI 2026 Finals         │
│  ──────────────────────  │
│  JUNE 14                 │
│  ● 🚀 Critical           │
│  ██ Fortnite             │
│  Chapter 6 Season 4      │
│  ──────────────────────  │
│  [View full calendar]    │
└──────────────────────────┘
```

**구현 스펙:**

```tsx
// src/components/calendar/UpcomingFeed.tsx
'use client'

export function UpcomingFeed({ events }: { events: GameEvent[] }) {
  // 앞으로 14일 이내 이벤트, 시간순
  const upcoming = events
    .filter(e => isUpcoming(e.start_at) && isWithinDays(e.start_at, 14))
    .sort((a,b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

  // 날짜별 그룹핑
  const groups = groupByDay(upcoming) // { 'TODAY': [...], 'TOMORROW': [...], 'Jun 14': [...] }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-zinc-800 bg-[#111111] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-black tracking-wider text-white">NEXT UP</span>
        <span className="text-yellow-400 text-sm">⚡</span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groups).map(([day, dayEvents]) => (
          <div key={day}>
            {/* Day label */}
            <div className="sticky top-0 bg-[#111111] px-4 py-1.5 text-[10px] font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-800/50">
              {day}
            </div>
            {/* Events */}
            {dayEvents.map(event => (
              <UpcomingItem key={event.id} event={event} />
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}

function UpcomingItem({ event }: { event: GameEvent }) {
  const isLive = isCurrentlyActive(event)
  const game = event.game!

  return (
    <button className="w-full text-left px-4 py-2.5 hover:bg-zinc-800/50 transition-colors group border-b border-zinc-800/30">
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: game.brand_color }} />
        <div className="flex-1 min-w-0">
          {/* Live badge OR time */}
          {isLive ? (
            <div className="flex items-center gap-1 mb-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-red-400">LIVE NOW</span>
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 mb-0.5">
              {getEventTypeIcon(event.event_type)} {formatShortTime(event.start_at)}
            </div>
          )}
          {/* Title */}
          <div className="text-xs font-semibold text-zinc-200 leading-tight group-hover:text-white line-clamp-2">
            {event.title}
          </div>
          {/* Game name */}
          <div className="text-[10px] mt-0.5 font-medium" style={{ color: game.brand_color }}>
            {game.name}
          </div>
        </div>
        {/* Importance dot */}
        {event.importance === 'critical' && (
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
        )}
      </div>
    </button>
  )
}
```

**EventDetailPanel 연동:**
- `UpcomingFeed`는 `w-60` 고정 패널
- `EventDetailPanel`이 열릴 때: `position: absolute` overlay로 UpcomingFeed 위를 덮음
- 닫히면 다시 UpcomingFeed 노출
- 모바일: UpcomingFeed 숨김 (바텀 시트만 사용)

---

## SESSION U3 — 레이아웃 재구성 + 3단 구조

### CalendarLayout.tsx 변경사항

```tsx
// 현재: 2단 (사이드바 + 캘린더+패널)
// 변경: 3단 (사이드바 + [위클리카드+캘린더] + 어패널)

return (
  <div className="flex h-screen flex-col bg-[#0f0f0f]">
    <CalendarHeader ... />
    {isGuest && <GuestBanner ... />}

    <div className="flex flex-1 overflow-hidden">
      {/* 좌: 게임 사이드바 (220px로 좁힘) */}
      <GameSidebar games={games} ... />

      {/* 중: 위클리 하이라이트 + 캘린더 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <WeeklyHighlights events={allEvents} games={games} />
        <div className="relative flex-1 overflow-hidden">
          <GameCalendar ... />
          {/* EventDetailPanel: absolute overlay (기존 방식 유지) */}
          <EventDetailPanel ... />
        </div>
      </div>

      {/* 우: NEXT UP 피드 (240px, md 이상에서만) */}
      <div className="hidden md:block">
        <UpcomingFeed events={upcomingEvents} />
      </div>
    </div>
  </div>
)
```

**사이드바 너비 조정:**
- 현재: `w-[260px]` → 변경: `w-[220px]`
- 이유: 우측 피드 추가로 가운데 캘린더 공간 확보

---

## SESSION U4 — "게이머가 탭을 닫지 않는" 추가 기능들

---

### U4-1. 🔴 LIVE NOW 배너 (탭을 못 닫게 만드는 1순위)

**개념**: 현재 진행 중인 이벤트가 있으면 페이지 상단에 실시간 배너

```tsx
// GuestBanner 아래, WeeklyHighlights 위에
{liveEvents.length > 0 && (
  <div className="flex items-center gap-3 bg-red-950/50 border-b border-red-900/50 px-4 py-2">
    <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      LIVE NOW
    </span>
    <div className="flex gap-3 overflow-x-auto no-scrollbar">
      {liveEvents.map(e => (
        <span key={e.id} className="text-xs text-zinc-300 whitespace-nowrap">
          <span style={{ color: e.game?.brand_color }}>● {e.game?.name}</span>
          {' '}— {e.title}
          {' '}<span className="text-zinc-500">ends {getTimeUntilEnd(e.end_at)}</span>
        </span>
      ))}
    </div>
  </div>
)}
```

---

### U4-2. ⏰ Set Reminder (브라우저 Push 알림)

**개념**: 이벤트 상세 패널에서 "Set Reminder" 버튼 → 브라우저 Push 알림 등록

```tsx
// EventDetailPanel 내부
<Button
  variant="outline"
  className="w-full border-zinc-700"
  onClick={() => requestNotificationPermission(event)}
>
  🔔 Set Reminder — 1 hour before
</Button>

// utils/notifications.ts
async function requestNotificationPermission(event: GameEvent) {
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    // ServiceWorker에 알림 예약
    const sw = await navigator.serviceWorker.ready
    const reminderTime = new Date(event.start_at).getTime() - 3600000 // 1시간 전
    sw.active?.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      title: `⏰ ${event.title} starts in 1 hour`,
      body: `${event.game?.name} · ${getEventTypeLabel(event.event_type)}`,
      timestamp: reminderTime,
      icon: '/icon-192.png',
    })
    toast.success('Reminder set! You\'ll get a notification 1 hour before.')
  }
}
```

**구현 파일:**
- `public/sw.js` — Service Worker
- `src/utils/notifications.ts`
- ServiceWorker: 예약된 알림 저장 → 시간 되면 발화

---

### U4-3. 📅 "Add to Google/Apple Calendar" 원클릭

**개념**: 이벤트 클릭 → 즉시 캘린더 앱에 추가 (로그인 불필요)

```ts
// 기존 AddToCalendar 컴포넌트 강화
function getGoogleCalUrl(event: GameEvent) {
  const start = event.start_at.replace(/[-:]/g,'').slice(0,15) + 'Z'
  const end = (event.end_at ?? event.start_at).replace(/[-:]/g,'').slice(0,15) + 'Z'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: `${event.description ?? ''}\n\nvia GAMECAL: gamecal.io/${event.game?.slug}`,
    location: 'gamecal.io',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
```

버튼 3종:
- `[Google Calendar]` `[Apple Calendar (.ics)]` `[Outlook]`

---

### U4-4. 🌍 타임존 자동 감지 + 전환

**개념**: 이벤트 시간이 UTC로만 표시되면 게이머가 헷갈림. 자동으로 로컬 타임 표시.

```tsx
// usePreferences에 추가
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone // "America/New_York"

// 이벤트 시간 표시
function formatLocalTime(utc: string, tz: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: tz, timeZoneName: 'short'
  }).format(new Date(utc))
}
// "3:00 PM EST" 로 표시
```

헤더 우상단: `🌍 EST · UTC-5` 표시 (클릭 시 타임존 변경)

---

### U4-5. 📊 "Tracking This" 카운터

**개념**: 이벤트 상세 패널에 "2,847 gamers tracking this" → 소셜 증거

```tsx
// Supabase event_views 테이블 (간단한 조회수 카운터)
// 이벤트 열 때마다 +1 카운트
// 이벤트 패널에 표시:
<div className="text-xs text-zinc-500">
  👁 {viewCount.toLocaleString()} gamers tracking this event
</div>
```

**구현:** `event_views (event_id, count)` Supabase 테이블 + RPC로 increment

---

### U4-6. 🔍 검색 (Cmd+K)

**개념**: 키보드 단축키로 이벤트/게임 빠른 검색

```tsx
// src/components/calendar/CommandSearch.tsx
// Headless UI Combobox OR 자체 구현

// 단축키:
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [])
```

검색 결과: 이벤트 이름 + 게임별 필터 + 날짜 점프

---

### U4-7. 📰 Weekly Digest (이메일 구독)

**개념**: "Get this week's gaming events in your inbox" → 이메일 주소만 받아서 주간 요약 발송

- 헤더 또는 사이드바 하단에 이메일 입력 폼
- Supabase `subscribers` 테이블에 저장
- 주간 cron (매주 월요일) → 이번 주 critical 이벤트 요약 이메일 발송
- 서비스: Resend.com (무료 100/일)

```tsx
// 사이드바 하단
<div className="border-t border-zinc-800 p-4">
  <p className="text-[11px] text-zinc-400 mb-2">📬 Weekly gaming digest</p>
  <form className="flex gap-1.5">
    <input type="email" placeholder="your@email.com" className="..." />
    <Button size="sm">Go</Button>
  </form>
</div>
```

---

### U4-8. 📱 "Add to Home Screen" 모바일 PWA 배너

**개념**: 모바일에서 첫 방문 시 하단 배너 → 홈 화면에 추가 → 앱처럼 사용

```tsx
// 모바일에서 standalone 모드가 아닐 때만 표시
const [showInstall, setShowInstall] = useState(false)
useEffect(() => {
  if (window.matchMedia('(display-mode: standalone)').matches) return
  if (isMobile()) setShowInstall(true)
}, [])

// 하단 고정 배너
{showInstall && (
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-700 p-3 flex items-center gap-3">
    <span className="text-2xl">🎮</span>
    <div className="flex-1">
      <p className="text-sm font-bold text-white">Add GAMECAL to Home Screen</p>
      <p className="text-xs text-zinc-400">Never miss a reset again</p>
    </div>
    <Button size="sm" onClick={triggerInstall}>Add</Button>
    <button onClick={() => setShowInstall(false)} className="text-zinc-500">✕</button>
  </div>
)}
```

---

## 최종 레이아웃 전체도

```
┌─────────────────────────────────────────────────────────────────────┐
│  [🎮GAMECAL]  [Today < >]  [June 2026]  [New Releases] [Sign In]   │ ← Header
├─────────────────────────────────────────────────────────────────────┤
│  🔴 LIVE NOW  ● Fortnite — Double XP ends in 2h  ● Dest2 Weekly   │ ← LIVE banner
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────┐  🔥 THIS WEEK ──────────────────────────────────────   │
│  │🎮 GAMES│  [MSI Finals][S4 Start][Summer Splash][Patch 11.2]...  │ ← Weekly highlights
│  │        │  ──────────────────────────────────────────────────     │
│  │☑Fnite  │                                                          │
│  │☑Apex   │  SUN   MON   TUE   WED   THU   FRI   SAT  │ NEXT UP ⚡ │
│  │☑Valo   │  ────  ────  ────  ────  ────  ────  ──── │ TODAY     │
│  │☑LoL    │  1     2     3     4     5     6     7    │ ●🔴 LIVE  │
│  │☑D2     │  [...] [...] [...] [...] [...] [...] [...] │ Fortnite  │
│  │☑D4     │                                            │ 2XP ends  │
│  │☑WoW    │  8     9     10    11    12    13    14    │ ─────────│
│  │☑PoGO   │  [...] [...] [...] [...] [...] [...] [...] │ TOMORROW  │
│  │☑Gensh  │                                            │ ●🔄 Tue  │
│  │        │  15    16    17    18    19    20    21    │ D2 Reset  │
│  │        │                             [★MSI Finals] │           │
│  │        │  22    23    24    25    26    27    28    │ ●🏆 Tue  │
│  ├────────┤                                            │ MSI Final│
│  │📬 Digest│                                           │ LoL       │
│  │email   │                                            │ ─────────│
│  │[input] │                                            │ JUN 14   │
│  └────────┘                                            │ ●🚀Crit  │
│                                                         │ S4 Start │
│                                                         └──────────┘
└─────────────────────────────────────────────────────────────────────┘
```

---

## 구현 파일 목록

| 신규 파일 | 내용 |
|-----------|------|
| `src/components/calendar/WeeklyHighlights.tsx` | 히어로 카드 스트립 |
| `src/components/calendar/UpcomingFeed.tsx` | NEXT UP 우측 피드 |
| `src/components/calendar/LiveBanner.tsx` | LIVE NOW 상단 배너 |
| `src/components/calendar/CommandSearch.tsx` | Cmd+K 검색 |
| `src/components/calendar/DigestSubscribe.tsx` | 이메일 구독 폼 |
| `src/utils/notifications.ts` | Push 알림 유틸 |
| `public/sw.js` | Service Worker (알림 예약) |

| 수정 파일 | 변경 내용 |
|-----------|-----------|
| `src/components/calendar/CalendarLayout.tsx` | 3단 레이아웃, 새 컴포넌트 통합 |
| `src/components/calendar/GameSidebar.tsx` | 너비 220px, 이메일 구독 추가 |
| `src/components/calendar/EventDetailPanel.tsx` | Set Reminder 버튼, 트래킹 카운터 |
| `src/components/calendar/AddToCalendar.tsx` | Google/Apple/Outlook 3종 |
| `src/app/layout.tsx` | PWA manifest, SW 등록 |

---

## 우선순위 구현 순서

```
Phase 1 (바로 보이는 것):
  U1 — WeeklyHighlights 카드 스트립
  U2 — UpcomingFeed 우측 피드
  U3 — 3단 레이아웃 재조합

Phase 2 (인게이지먼트):
  U4-1 — LIVE NOW 배너
  U4-3 — Add to Calendar 3종
  U4-4 — 타임존 자동감지
  U4-6 — Cmd+K 검색

Phase 3 (리텐션):
  U4-2 — Set Reminder (Push 알림)
  U4-5 — Tracking 카운터
  U4-7 — Weekly Digest 이메일
  U4-8 — PWA 홈 추가
```
