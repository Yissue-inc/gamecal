# GAMECAL Sidebar 개선 — Cursor 작업 지시서

## 목표
게임 사이드바의 색상 점(dot) → **게임 대표 SVG 아이콘**으로 교체,
플랫폼 칩 → **이벤트 카테고리 요약**으로 교체

---

## 현재 문제
- 게임별 색상 dot만 있어 구별이 어려움
- platform 칩(PC/PS5/Xbox)은 사이드바에서 중요도가 낮음
- 캘린더에 어떤 이벤트가 몇 개 있는지 한눈에 보이지 않음

## 목표 UI (예시)
```
□ [⚡] Fortnite
        🔄×2  🔴×1  🏁×1

□ [🛡] Apex Legends
        🔄×1  🏆×1

□ [◈]  Valorant
        📦×1  ⭐×1

□ [⚔] League of Legends
        📦×1  ⭐×1  🏆×1
```
- SVG 아이콘: 16×16, game.brand_color로 채색
- 이벤트 요약: 종류별 아이콘 + 개수, 최대 4종, 한 줄
- 이벤트 0개인 게임은 요약 행 숨김

---

## SESSION S1 — GameIcon 컴포넌트 생성

### 파일: `src/components/calendar/GameIcon.tsx` (신규 생성)

```tsx
// src/components/calendar/GameIcon.tsx
interface GameIconProps {
  slug: string
  color: string
  size?: number
}

export function GameIcon({ slug, color, size = 16 }: GameIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
    style: { flexShrink: 0 } as React.CSSProperties,
  }

  switch (slug) {
    // ⚡ Fortnite — 번개 / 스톰
    case 'fortnite':
      return (
        <svg {...props}>
          <polygon points="9,1 5,9 8,9 7,15 11,7 8,7" fill={color} />
        </svg>
      )

    // 🛡 Apex Legends — 방패 + 다이아몬드
    case 'apex':
      return (
        <svg {...props}>
          <path d="M8 1L14 4V9C14 12 11 14.5 8 15C5 14.5 2 12 2 9V4L8 1Z" stroke={color} strokeWidth="1.5" />
          <polygon points="8,5 10,8 8,11 6,8" fill={color} />
        </svg>
      )

    // ◈ Valorant — 방사형 크로스
    case 'valorant':
      return (
        <svg {...props}>
          <rect x="6.5" y="1" width="3" height="14" rx="1" fill={color} />
          <rect x="1" y="6.5" width="14" height="3" rx="1" fill={color} />
          <rect x="3.5" y="3.5" width="3" height="3" rx="0.5" fill={color} opacity="0.6" transform="rotate(45 5 5)" />
        </svg>
      )

    // ⚔ League of Legends — 교차 검
    case 'lol':
      return (
        <svg {...props}>
          <line x1="3" y1="13" x2="13" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="3" x2="13" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="8" r="2" fill={color} />
        </svg>
      )

    // △ Destiny 2 — 트라이앵글 (Traveler)
    case 'destiny2':
      return (
        <svg {...props}>
          <polygon points="8,2 15,14 1,14" stroke={color} strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="10" r="2" fill={color} />
        </svg>
      )

    // 💀 Diablo IV — 헥사곤 + 크로스
    case 'diablo4':
      return (
        <svg {...props}>
          <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke={color} strokeWidth="1.5" fill="none" />
          <line x1="8" y1="4" x2="8" y2="12" stroke={color} strokeWidth="1.5" />
          <line x1="4" y1="8" x2="12" y2="8" stroke={color} strokeWidth="1.5" />
        </svg>
      )

    // 🦁 World of Warcraft — 사자 마스크 (심플)
    case 'wow':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" fill="none" />
          <circle cx="5.5" cy="7" r="1.2" fill={color} />
          <circle cx="10.5" cy="7" r="1.2" fill={color} />
          <path d="M5 11 Q8 13.5 11 11" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M2 5 Q4 2 6 4" stroke={color} strokeWidth="1.2" fill="none" />
          <path d="M14 5 Q12 2 10 4" stroke={color} strokeWidth="1.2" fill="none" />
        </svg>
      )

    // ⊙ Pokémon GO — 포켓볼
    case 'pokemon-go':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" fill="none" />
          <line x1="1.5" y1="8" x2="14.5" y2="8" stroke={color} strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2" fill={color} />
          <circle cx="8" cy="8" r="1" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
        </svg>
      )

    // 🌀 Genshin Impact — 아네모 소용돌이
    case 'genshin':
      return (
        <svg {...props}>
          <path d="M8 2 C4 2 2 5 2 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M2 8 C2 11 5 14 8 14" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M8 14 C12 14 14 11 14 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M14 8 C14 5 11 2 8 2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="8" cy="8" r="1.5" fill={color} />
        </svg>
      )

    // 기본 — 브랜드 컬러 다이아몬드
    default:
      return (
        <svg {...props}>
          <polygon points="8,2 14,8 8,14 2,8" fill={color} opacity="0.9" />
        </svg>
      )
  }
}
```

---

## SESSION S2 — 이벤트 타입 요약 헬퍼

### 파일: `src/lib/event-summary.ts` (신규 생성)

```typescript
// src/lib/event-summary.ts
import type { EventType, GameEvent } from '@/types'

export interface EventTypeSummary {
  type: EventType
  icon: string
  label: string
  count: number
}

// 이벤트 타입별 아이콘 + 짧은 레이블
const EVENT_TYPE_META: Record<EventType, { icon: string; label: string; priority: number }> = {
  live_event:     { icon: '🔴', label: 'Live',    priority: 1 },
  tournament:     { icon: '🏆', label: 'Cup',     priority: 2 },
  season_end:     { icon: '🏁', label: 'Season',  priority: 3 },
  season_start:   { icon: '🏁', label: 'Season',  priority: 3 },
  limited_reward: { icon: '⭐', label: 'Limited', priority: 4 },
  patch_release:  { icon: '📦', label: 'Patch',   priority: 5 },
  new_content:    { icon: '✨', label: 'New',     priority: 5 },
  weekly_reset:   { icon: '🔄', label: 'Reset',   priority: 6 },
  ranked_reset:   { icon: '📊', label: 'Ranked',  priority: 6 },
  double_xp:      { icon: '⚡', label: '2XP',     priority: 7 },
  banner_end:     { icon: '📢', label: 'Banner',  priority: 7 },
  maintenance:    { icon: '🔧', label: 'Maint',   priority: 8 },
  other:          { icon: '•',  label: 'Other',   priority: 9 },
}

/**
 * 특정 게임의 이벤트를 타입별로 집계, 최대 MAX_SHOW 종류 반환
 */
export function getEventSummary(
  events: GameEvent[],
  gameId: string,
  maxShow = 4
): EventTypeSummary[] {
  const counts: Partial<Record<EventType, number>> = {}

  for (const e of events) {
    if (e.game_id !== gameId) continue
    counts[e.event_type] = (counts[e.event_type] ?? 0) + 1
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type: type as EventType,
      icon: EVENT_TYPE_META[type as EventType]?.icon ?? '•',
      label: EVENT_TYPE_META[type as EventType]?.label ?? type,
      count: count!,
    }))
    .sort(
      (a, b) =>
        (EVENT_TYPE_META[a.type]?.priority ?? 99) -
        (EVENT_TYPE_META[b.type]?.priority ?? 99)
    )
    .slice(0, maxShow)
}
```

---

## SESSION S3 — GameSidebar 수정

### 파일: `src/components/calendar/GameSidebar.tsx` (수정)

**변경 사항:**
1. `events: GameEvent[]` prop 추가
2. 색상 dot → `<GameIcon>` 교체
3. platform 칩 → 이벤트 요약 교체

```tsx
'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DigestSubscribe } from '@/components/calendar/DigestSubscribe'
import { GameIcon } from '@/components/calendar/GameIcon'
import { getEventSummary } from '@/lib/event-summary'
import type { Game, GameEvent } from '@/types'

interface GameSidebarProps {
  games: Game[]
  selectedGames: string[]
  onToggle: (slug: string) => void
  onToggleAll: (all: boolean) => void
  events?: GameEvent[]   // ← 추가
}

export function GameSidebar({
  games,
  selectedGames,
  onToggle,
  onToggleAll,
  events = [],
}: GameSidebarProps) {
  const allSelected = games.every((g) => selectedGames.includes(g.slug))

  return (
    <aside data-testid="game-sidebar" className="hidden w-[220px] shrink-0 flex-col border-r border-zinc-800 bg-[#1a1a1a] md:flex">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🎮</span>
          <h2
            data-testid="games-section-header"
            className="font-rajdhani text-xs font-bold uppercase tracking-widest text-zinc-400"
          >
            Games
          </h2>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-4">
        {/* All 체크박스 */}
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="all-games"
            data-testid="game-checkbox-all"
            checked={allSelected}
            onCheckedChange={(checked) => onToggleAll(!!checked)}
          />
          <Label htmlFor="all-games" className="cursor-pointer font-medium">
            All
          </Label>
        </div>

        {/* 게임 목록 */}
        {games.map((game) => {
          const summary = getEventSummary(events, game.id)
          const isSelected = selectedGames.includes(game.slug)

          return (
            <div key={game.slug} className="py-1.5">
              {/* 게임 행: 체크박스 + 아이콘 + 이름 */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id={game.slug}
                  data-testid={`game-checkbox-${game.slug}`}
                  checked={isSelected}
                  onCheckedChange={() => onToggle(game.slug)}
                />
                <GameIcon
                  slug={game.slug}
                  color={isSelected ? game.brand_color : '#52525b'}
                  size={15}
                />
                <Label
                  htmlFor={game.slug}
                  className="cursor-pointer text-sm font-medium leading-none"
                  style={{ color: isSelected ? '#e4e4e7' : '#71717a' }}
                >
                  {game.name}
                </Label>
              </div>

              {/* 이벤트 요약 */}
              {summary.length > 0 && (
                <div
                  data-testid={`game-event-summary-${game.slug}`}
                  className="ml-[26px] mt-1 flex flex-wrap gap-x-2 gap-y-0.5"
                >
                  {summary.map((s) => (
                    <span
                      key={s.type}
                      title={s.label}
                      className="flex items-center gap-0.5 text-[10px] text-zinc-500"
                    >
                      <span>{s.icon}</span>
                      <span className="font-mono">×{s.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Separator />
      <div className="space-y-2 p-4">
        <Button variant="outline" className="w-full border-zinc-700 text-sm" asChild>
          <a href="/api/feed/all" data-testid="subscribe-all-link" target="_blank" rel="noopener noreferrer">
            + Subscribe All Calendars
          </a>
        </Button>
        <Button variant="ghost" className="w-full text-sm text-zinc-400" asChild>
          <Link href="/my-schedule" data-testid="my-schedule-link">My Schedule</Link>
        </Button>
        <Button variant="ghost" className="w-full text-sm text-zinc-400" asChild>
          <Link href="/profile" data-testid="profile-link">Profile & Badges</Link>
        </Button>
      </div>
      <DigestSubscribe />
    </aside>
  )
}
```

---

## SESSION S4 — CalendarLayout에서 events 전달

### 파일: `src/components/calendar/CalendarLayout.tsx` (수정)

`GameSidebar`에 `events={events}` prop을 전달합니다.

```tsx
// CalendarLayout.tsx 내부 GameSidebar 호출 부분 찾아서 수정
<GameSidebar
  games={games}
  selectedGames={selectedGames}
  onToggle={handleToggle}
  onToggleAll={handleToggleAll}
  events={events}          // ← 이 줄 추가
/>
```

`events`가 이미 CalendarLayout에 있는지 확인:
- 있으면: 그대로 전달
- 없으면: `useLayoutEvents` 훅 또는 상위에서 내려받는 방식으로 추가

---

## 체크리스트

```
□ src/components/calendar/GameIcon.tsx 생성 (9개 게임 SVG)
□ src/lib/event-summary.ts 생성 (getEventSummary 함수)
□ src/components/calendar/GameSidebar.tsx 수정 (dot→아이콘, platform→이벤트요약)
□ src/components/calendar/CalendarLayout.tsx 수정 (events prop 전달)
□ pnpm tsc --noEmit ✅
□ pnpm build ✅
□ 로컬에서 사이드바 확인:
    - 각 게임 아이콘 렌더링 (brand_color 반영)
    - 선택/해제 시 아이콘 색상 변화 (선택=brand_color, 해제=zinc-600)
    - 이벤트 요약 행 올바른 카운트
    - 이벤트 없는 게임은 요약 행 숨김
□ git add -A && git commit -m "feat: game SVG icons + event type summary in sidebar"
□ git push origin main
```

---

## 참고 파일
| 파일 | 역할 |
|------|------|
| `src/types/index.ts` | EventType, Game, GameEvent 타입 |
| `src/lib/mock-data.ts` | MOCK_EVENTS (로컬 테스트용) |
| `src/components/calendar/GameSidebar.tsx` | 수정 대상 |
| `src/components/calendar/CalendarLayout.tsx` | events prop 전달 |
