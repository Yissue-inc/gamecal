# GAMECAL — UI/UX 디자인 개선 작업 지시서
### Cursor SESSION D1~D3 · 2026-05-23
### 목표: "서구 게이머들이 즉시 신뢰하고 북마크하는 앱"

---

## 현재 상태 스크린샷 기준 진단

현재 URL: `https://gamecal-beryl.vercel.app`

| 구성요소 | 현재 문제 | 우선순위 |
|----------|-----------|----------|
| 사이드바 헤더 `<< Game Select >>` | 임시 placeholder 텍스트, 비전문적 | 🔴 즉시 |
| 이벤트 바 — 타입 구분 없음 | 모든 이벤트가 동일하게 보임 | 🔴 즉시 |
| critical 이벤트 강조 없음 | 시즌 종료·토너먼트가 일반 이벤트와 동일 | 🔴 즉시 |
| Guest blur 디자인 | 블러가 거슬리고 "오류처럼" 보임 | 🟡 중요 |
| New Releases 커버 이미지 없음 | 카드가 너무 텍스트만 있음 | 🟡 중요 |
| New Releases 서브타이틀 오류 | "Switch & Steam" → 잘못된 텍스트 | 🟢 소 |

---

## SESSION D1 — 사이드바 & 이벤트 바 개선 (최우선)

### D1-1: 사이드바 헤더 교체

**파일**: `src/components/calendar/GameSidebar.tsx`

현재:
```tsx
<h2 className="text-sm font-semibold text-zinc-400">&lt;&lt; Game Select &gt;&gt;</h2>
```

목표 디자인:
```
🎮 GAMES           ← 컨트롤러 이모지 + 섹션 라벨 (uppercase, letter-spacing)
```

변경:
```tsx
<div className="flex items-center gap-2">
  <span className="text-base">🎮</span>
  <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Games</h2>
</div>
```

---

### D1-2: 이벤트 바에 타입 아이콘 추가

**파일**: `src/lib/utils.ts`

`getEventTypeLabel()` 함수 옆에 `getEventTypeIcon()` 추가:

```ts
export function getEventTypeIcon(type: GameEvent['event_type']): string {
  const icons: Record<GameEvent['event_type'], string> = {
    weekly_reset:   '🔄',
    season_start:   '🚀',
    season_end:     '🏁',
    live_event:     '🎉',
    limited_reward: '🎁',
    patch_release:  '🔧',
    tournament:     '🏆',
    ranked_reset:   '📊',
    banner_end:     '⏳',
    double_xp:      '⚡',
    maintenance:    '🛠',
    new_content:    '✨',
    other:          '📌',
  }
  return icons[type] ?? '📌'
}
```

**파일**: `src/components/calendar/GameCalendar.tsx`

이벤트 타이틀에 아이콘 prefix 추가:
```tsx
// gameEventToCalendarEvent 호출 전 또는 유틸에서 처리
title: `${getEventTypeIcon(e.event_type)} ${e.title}`
```

결과: 달력에서 `🏆 MSI 2026 — Grand Finals`, `🔄 Weekly Reset`, `🚀 Season 4 Begins` 형태로 표시

---

### D1-3: Critical 이벤트 시각 강화

**파일**: `src/components/calendar/GameCalendar.tsx` (global style 섹션)

현재: `critical-event`는 왼쪽 빨간 border만 있음
목표: 미묘한 glow + 우측에 빨간 점 (라이브 인디케이터)

```css
.gamecal-calendar .critical-event {
  border-left-color: #ef4444 !important;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.35), inset 3px 0 0 #ef4444;
  font-weight: 600;
}

/* 라이브 dot 대신 critical badge */
.gamecal-calendar .critical-event::after {
  content: '●';
  color: #ef4444;
  font-size: 6px;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

---

## SESSION D2 — Guest Blur UX & New Releases 카드 개선

### D2-1: Guest Blur 디자인 교체

**현재 문제**: `filter: blur(3px)` → 화면 전체가 뭉개져 보임, 불안하게 느껴짐

**목표**: Frosted glass 느낌의 잠금 상태 (blur는 유지하되 더 세련되게)

**파일**: `src/components/calendar/GameCalendar.tsx` (global style)

```css
/* 기존 guest-blurred-event 교체 */
.gamecal-calendar .guest-blurred-event {
  filter: blur(4px);
  opacity: 0.35;
  border-left-color: #52525b !important;
  background: rgba(39, 39, 42, 0.6) !important;
  color: transparent !important;
  cursor: pointer;
  transition: filter 0.2s;
}

.gamecal-calendar .guest-blurred-event:hover {
  filter: blur(2px);
  opacity: 0.5;
}
```

**파일**: `src/components/calendar/GuestBlur.tsx`

GuestBanner 텍스트 개선:
```tsx
// 현재: "Sign up free to track events across all dates → Create free account"
// 변경:
<div className="flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-b border-indigo-900 px-4 py-2 text-sm">
  <span className="text-yellow-400">🔒</span>
  <span className="text-zinc-300">
    <span className="text-white font-semibold">{lockedCount} events hidden.</span>
    {' '}Sign in to unlock the full calendar.
  </span>
  <button onClick={onSignUp} className="ml-2 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
    Sign in free →
  </button>
</div>
```

---

### D2-2: New Releases — 커버 이미지 플레이스홀더 & 서브타이틀 수정

**파일**: `src/app/new-releases/page.tsx`

서브타이틀 수정:
```tsx
// 현재: "Upcoming Switch & Steam titles"
// 변경:
<p className="text-zinc-400 text-sm mt-1">PC · Console · Mobile — upcoming titles</p>
```

커버 이미지: `image_url` 컬럼이 있지만 데이터 없음.
게임 타이틀에서 gradient placeholder 생성:

```tsx
// ReleaseCard 컴포넌트에 hero 영역 추가
<div
  className="h-36 w-full rounded-t-lg flex items-end p-4"
  style={{
    background: `linear-gradient(135deg, ${platformColor} 0%, #1a1a2e 100%)`,
  }}
>
  <span className="text-3xl font-black text-white/20 leading-none truncate">{release.title}</span>
</div>
```

`platformColor` 로직:
- PS5 → `#003087`
- Xbox → `#107c10`
- Switch → `#e4000f`
- PC → `#1b2838` (Steam 색)
- 복수 플랫폼 → 첫 번째 기준

---

## SESSION D3 — 폰트 & 전체 컬러 시스템 강화

### D3-1: 게이밍 폰트 적용

**파일**: `src/app/layout.tsx`

```tsx
import { Inter, Rajdhani } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-rajdhani'
})
```

`GAMECAL` 로고 + 월 타이틀 + 섹션 헤더에만 `font-rajdhani` 적용.
본문은 Inter 유지 (가독성 우선).

### D3-2: 오늘 날짜 강조 개선

현재: 파란 원. 목표: 인디고 glow + 더 밝은 원

```css
.gamecal-calendar .fc-day-today {
  background: rgba(99, 102, 241, 0.08) !important;
}
.gamecal-calendar .fc-day-today .fc-daygrid-day-number {
  background: #6366f1;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin: 4px;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.6);
  font-weight: 700;
}
```

### D3-3: 사이드바 게임 항목 — 플랫폼 표시 추가

**파일**: `src/components/calendar/GameSidebar.tsx`

각 게임 항목 아래에 플랫폼 칩 추가:

```tsx
{games.map((game) => (
  <div key={game.slug} className="py-1.5">
    <div className="flex items-center gap-2">
      <Checkbox ... />
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: game.brand_color }} />
      <Label className="cursor-pointer text-sm font-medium">{game.name}</Label>
    </div>
    <div className="ml-8 mt-0.5 flex gap-1 flex-wrap">
      {game.platform.map((p) => (
        <span key={p} className="text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">{p}</span>
      ))}
    </div>
  </div>
))}
```

---

## 레퍼런스 — 서구 게이머 감성 벤치마크

| 사이트 | 배울 점 |
|--------|---------|
| **Wowhead** | 이벤트 타입별 아이콘 + 컬러 코딩, 정보 밀도 높지만 읽기 쉬움 |
| **PoE Trade** | 다크 모노크롬 + 강조색 1개 (전략적 사용), 신뢰감 |
| **GGRecon** | 헤더에 게임별 브랜드 컬러, 에너지 있는 타이포 |
| **Riot Games (LoL)** | 섹션 구분이 명확, 여백과 밀도의 균형 |

**핵심 인사이트**: 서구 게이머는 "정보가 많아도 쉽게 읽히는가"를 본다.
화려한 것보다 **신뢰 + 밀도 + 명확성** 우선.

---

## 파일 수정 목록 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/calendar/GameSidebar.tsx` | 헤더 교체, 플랫폼 칩 추가 |
| `src/components/calendar/GameCalendar.tsx` | CSS 강화, 이벤트 아이콘 prefix |
| `src/components/calendar/GuestBlur.tsx` | Banner 텍스트 + 스타일 개선 |
| `src/lib/utils.ts` | `getEventTypeIcon()` 추가 |
| `src/app/new-releases/page.tsx` | 서브타이틀 수정, 커버 플레이스홀더 |
| `src/app/layout.tsx` | Rajdhani 폰트 추가 |
