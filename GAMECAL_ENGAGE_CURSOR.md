# GAMECAL — Engagement Loop Design
### Cursor SESSION E1~E4 · 2026-05-23
### 목표: "게이머가 매일 돌아오는 달력" — 위시리스트 + 리마인더 + CAL캐릭터 + 출석체크/뱃지

---

## 시스템 개요 — The Engagement Trinity

```
   [CAL 캐릭터]  ←→  [출석 체크 + 뱃지]
        ↕
   [위시리스트]  ←→  [리마인더 (Push)]
```

핵심 루프:
1. 유저가 관심 이벤트 → **위시리스트** 저장
2. 이벤트 전 → **Push 리마인더** (CAL이 보내는 메시지 형태)
3. 매일 사이트 방문 → **출석 체크** 도장
4. 연속 방문 누적 → **뱃지 언락** + CAL 반응 대사

---

## SESSION E1 — CAL 캐릭터 설계

### 캐릭터 컨셉: "CAL" (칼)

| 속성 | 내용 |
|------|------|
| 풀네임 | CAL (Calendar Attendance Lead) |
| 포지션 | GAMECAL 기숙사 사감 (Dorm RA) |
| 성별 | 선택 없음 — 픽셀아트 실루엣으로 중성적 |
| 외모 | 두꺼운 안경, 후드티, 게임 일정이 적힌 클립보드, 에너지 드링크 캔 |
| 성격 | 엄하지만 결국 네 편 / 모든 게임 이벤트를 외우고 있음 / 실망도 빠르고 칭찬도 빠름 |
| 말투 | 짧고 직설적 / 게임 밈 섞임 / 절대 반말은 아니지만 딱딱하지 않음 |

---

### CAL 말투 가이드 (영어 기준)

**첫 방문 (Onboarding)**
```
"Oh, you're finally here.
I've been keeping track of 847 events this season alone.
Let's get you set up — pick your games."
```

**출석 체크 — 첫 방문 (당일 처음 접속)**
```
"Day {N} streak. Not bad. Don't blow it."
```

**출석 체크 — 연속 3일**
```
"Three days straight. You're not just a casual. Yet."
```

**출석 체크 — 연속 7일**
```
"Week one complete. Badge unlocked. 🏅
Most people quit by day 4. You didn't. Noted."
```

**출석 체크 — 연속 30일**
```
"30 days. I've seen guilds disband in less time.
Respect. The 'Hardcore Regular' badge is yours."
```

**출석 체크 — 스트릭 끊김 (다음날 복귀)**
```
"You missed yesterday.
Your {N}-day streak is gone. 
...I'll give you one more chance. Clock's ticking."
```

**위시리스트 첫 추가**
```
"Wishlist started. Smart move.
I'll make sure you don't sleep through it."
```

**리마인더 Push 알림 문구 (CAL 발신)**
```
🔔 CAL: "{Event Name}" starts in 1 hour.
Don't be the one who missed it.
→ [Open GAMECAL]
```

**뱃지 언락 팝업**
```
"ACHIEVEMENT UNLOCKED
{Badge Name}
{CAL 한마디}
[Share] [View All Badges]"
```

---

### CAL 픽셀아트 스프라이트 스펙

파일: `public/cal-sprite.png` (추후 일러스트레이터 의뢰용 스펙)

| 상태 | 설명 | 표정 |
|------|------|------|
| `idle` | 클립보드 들고 서 있음 | 무표정 |
| `happy` | 주먹 들어올림 (뱃지 수여) | 눈 반짝 |
| `disappointed` | 한숨 / 손으로 얼굴 가림 | 실망 |
| `alert` | 클립보드 탁! 치며 손가락질 | 진지함 |
| `celebration` | 에너지 드링크 들고 점프 | 최대 흥분 |

임시 구현: CSS로 그린 픽셀아트 (`<canvas>` 16×16 sprite, 2× scale = 32×32px)
또는 이모지 조합: `🤓📋⚡` 임시 대체

---

## SESSION E2 — 위시리스트 시스템

### E2-1: DB 스키마

```sql
-- 위시리스트
CREATE TABLE wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES game_events(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- 리마인더
CREATE TABLE reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES game_events(id) ON DELETE CASCADE,
  remind_at   TIMESTAMPTZ NOT NULL,  -- 실제 알림 발송 시각
  offset_min  INT NOT NULL,          -- 이벤트 시작 기준 몇 분 전 (60, 1440, 10080)
  is_sent     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id, offset_min)
);
```

### E2-2: 위시리스트 UI 컴포넌트

**파일**: `src/components/wishlist/WishlistButton.tsx`

```tsx
'use client'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useWishlist } from '@/hooks/useWishlist'

interface Props {
  eventId: string
  size?: 'sm' | 'md'
}

export function WishlistButton({ eventId, size = 'md' }: Props) {
  const { isWishlisted, toggle, loading } = useWishlist(eventId)

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`
        group flex items-center gap-1.5 rounded-md transition-all
        ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
        ${isWishlisted
          ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:border-rose-800 hover:text-rose-400'
        }
      `}
    >
      <Heart
        className={`transition-all ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} ${isWishlisted ? 'fill-rose-400' : 'group-hover:fill-rose-400/30'}`}
      />
      {isWishlisted ? 'Wishlisted' : 'Wishlist'}
    </button>
  )
}
```

**파일**: `src/hooks/useWishlist.ts`

```ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

export function useWishlist(eventId: string) {
  const { user } = useUser()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single()
      .then(({ data }) => setIsWishlisted(!!data))
  }, [user, eventId])

  const toggle = async () => {
    if (!user) {
      // CAL 멘트로 로그인 유도
      window.dispatchEvent(new CustomEvent('cal:prompt-login', {
        detail: { reason: 'wishlist' }
      }))
      return
    }
    setLoading(true)
    if (isWishlisted) {
      await supabase.from('wishlists').delete()
        .eq('user_id', user.id).eq('event_id', eventId)
      setIsWishlisted(false)
    } else {
      await supabase.from('wishlists').insert({ user_id: user.id, event_id: eventId })
      setIsWishlisted(true)
      // 위시리스트 첫 추가 시 CAL 등장
      window.dispatchEvent(new CustomEvent('cal:wishlist-added', { detail: { eventId } }))
    }
    setLoading(false)
  }

  return { isWishlisted, toggle, loading }
}
```

### E2-3: "My Schedule" 탭

**파일**: `src/app/my-schedule/page.tsx`

```tsx
// 위시리스트 이벤트만 필터된 달력 뷰
// + 다가오는 wishlisted 이벤트 타임라인 (7일 내)

// 레이아웃:
// [CAL 헤더 인사말]
// [이번 주 위시리스트 이벤트 카운트다운 카드들]
// [전체 위시리스트 달력 뷰 (게임 캘린더 동일, 필터 적용)]
```

---

## SESSION E3 — 리마인더 시스템

### E3-1: 리마인더 UI (EventDetailPanel 내)

**파일**: `src/components/wishlist/ReminderPicker.tsx`

```tsx
'use client'
import { Bell, BellOff } from 'lucide-react'
import { useReminder } from '@/hooks/useReminder'

const OFFSETS = [
  { label: '10 min before', value: 10 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
  { label: '1 week before', value: 10080 },
]

export function ReminderPicker({ eventId, eventStartAt }: { eventId: string; eventStartAt: string }) {
  const { activeOffsets, toggleOffset } = useReminder(eventId, eventStartAt)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
        <Bell className="h-3.5 w-3.5" />
        <span>Remind me</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {OFFSETS.map((o) => {
          const active = activeOffsets.includes(o.value)
          return (
            <button
              key={o.value}
              onClick={() => toggleOffset(o.value)}
              className={`
                rounded-md border px-3 py-1 text-xs font-medium transition-all
                ${active
                  ? 'border-indigo-600 bg-indigo-950/60 text-indigo-300'
                  : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500'
                }
              `}
            >
              {active ? '✓ ' : ''}{o.label}
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-zinc-600">
        CAL will push a notification to your browser
      </p>
    </div>
  )
}
```

### E3-2: Push Notification 서비스워커

**파일**: `public/sw.js`

```js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title, body, url } = data
  event.waitUntil(
    self.registration.showNotification(title ?? 'GAMECAL', {
      body: body ?? "CAL: Don't miss this.",
      icon: '/cal-icon-192.png',
      badge: '/cal-badge-72.png',
      data: { url: url ?? 'https://gamecal.io' },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

**파일**: `src/lib/push.ts`

```ts
export async function subscribePush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const registration = await navigator.serviceWorker.register('/sw.js')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })

  // 서버에 구독 정보 저장
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ userId, subscription: sub }),
    headers: { 'Content-Type': 'application/json' },
  })

  return sub
}
```

### E3-3: 리마인더 전송 Cron Job

**파일**: `src/app/api/cron/reminders/route.ts`

```ts
// Vercel Cron: 매 5분마다 실행
// SELECT * FROM reminders WHERE remind_at <= now() AND is_sent = false
// → web-push 발송 후 is_sent = true 업데이트
```

**vercel.json 추가**:
```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "*/5 * * * *" }
  ]
}
```

---

## SESSION E4 — 출석 체크 + 뱃지 시스템

### E4-1: DB 스키마

```sql
-- 출석 기록
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, checked_at)
);

-- 뱃지 정의
CREATE TABLE badge_definitions (
  id          TEXT PRIMARY KEY,   -- 'streak_7', 'game_fortnite_100', etc.
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,      -- 이모지 or SVG path
  rarity      TEXT NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  condition   JSONB NOT NULL      -- { type: 'streak', days: 7 } etc.
);

-- 유저 뱃지 보유
CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    TEXT REFERENCES badge_definitions(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- 유저 스탯 (캐시)
CREATE TABLE user_stats (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak  INT DEFAULT 0,
  longest_streak  INT DEFAULT 0,
  total_days      INT DEFAULT 0,
  last_check_in   DATE,
  prestige_level  TEXT DEFAULT 'bronze'  -- bronze, silver, gold, platinum, diamond
);
```

### E4-2: 뱃지 전체 목록

#### 🔥 스트릭 뱃지 (Streak Badges)
| Badge ID | 이름 | 조건 | 희귀도 | CAL 한마디 |
|----------|------|------|--------|-----------|
| `streak_3` | First Timer | 3일 연속 | Common | "Three days. You actually came back." |
| `streak_7` | Week Warrior | 7일 연속 | Common | "A week straight. Your guild would be proud." |
| `streak_30` | Hardcore Regular | 30일 연속 | Rare | "30 days. I've seen devs patch bugs faster than this streak." |
| `streak_100` | Centurion | 100일 연속 | Epic | "Triple digits. I've added you to the honor roll." |
| `streak_365` | Legend | 365일 연속 | Legendary | "A full year. You don't play games — you live them." |

#### 🎮 게임별 뱃지 (Game Scout Badges)
| Badge ID | 이름 | 조건 | 희귀도 |
|----------|------|------|--------|
| `game_fortnite_scout` | Fortnite Scout | Fortnite 이벤트 10개 위시리스트 | Common |
| `game_wow_lorekeeper` | Lorekeeper | WoW 이벤트 10개 위시리스트 | Common |
| `game_lol_summoner` | Summoner on Watch | LoL 이벤트 10개 위시리스트 | Common |
| `game_all_rounder` | All-Rounder | 5개 이상 다른 게임 위시리스트 | Rare |
| `game_completionist` | Completionist | 모든 9개 게임 위시리스트 등록 | Epic |

#### ⚡ 이벤트 타입 뱃지
| Badge ID | 이름 | 조건 | 희귀도 |
|----------|------|------|--------|
| `type_no_miss_reset` | Never Miss a Reset | Weekly Reset 알림 10회 설정 | Common |
| `type_tournament_fan` | Tournament Fanatic | Tournament 이벤트 5개 위시리스트 | Rare |
| `type_season_hunter` | Season Hunter | Season Start/End 이벤트 모두 위시리스트 | Rare |
| `type_early_bird` | Early Bird | 이벤트 7일+ 전에 위시리스트 추가 20회 | Epic |

#### 🏅 특별 뱃지 (Special)
| Badge ID | 이름 | 조건 | 희귀도 |
|----------|------|------|--------|
| `special_early_adopter` | Early Adopter | 베타 기간 (2026-05~06) 가입 | Legendary |
| `special_cal_whisperer` | CAL's Favorite | CAL 반응 이벤트 10회 발생 | Rare |
| `special_sharer` | Town Crier | 이벤트 10회 공유 | Common |
| `special_mobile_gamer` | On the Go | 모바일로 30일 방문 | Rare |

---

### E4-3: 프레스티지 시스템 (Prestige Level)

출석일 + 위시리스트 수 + 공유 수 = **게이머 포인트 (GP)**

| 레벨 | 이름 | GP 기준 | 혜택 |
|------|------|---------|------|
| 🥉 Bronze | Casual | 0–199 GP | 기본 |
| 🥈 Silver | Regular | 200–499 GP | CAL 특별 멘트 언락 |
| 🥇 Gold | Dedicated | 500–999 GP | 프로필 테두리 골드 + CAL 골드 코스튬 |
| 💎 Platinum | Hardcore | 1000–2499 GP | 미리 보기 기능 (이벤트 예정 알림 +1주 선행) |
| 💠 Diamond | Legend | 2500+ GP | CAL 다이아몬드 코스튬 + 전용 배지 프레임 |

**GP 획득 방법**:
- 하루 출석: +2 GP
- 이벤트 위시리스트 추가: +1 GP
- 이벤트 공유: +1 GP
- 뱃지 언락: +5~20 GP (희귀도 따라)
- 7일 스트릭 달성 시 보너스: +10 GP

---

### E4-4: 출석 체크 UI 컴포넌트

**파일**: `src/components/engagement/DailyCheckIn.tsx`

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { useAttendance } from '@/hooks/useAttendance'
import { CalCharacter } from './CalCharacter'

export function DailyCheckIn() {
  const { user } = useUser()
  const { streak, todayChecked, checkIn, loading } = useAttendance()
  const [justChecked, setJustChecked] = useState(false)

  const handleCheckIn = async () => {
    await checkIn()
    setJustChecked(true)
  }

  if (!user) return null

  return (
    <div className={`
      flex items-center gap-3 rounded-xl border px-4 py-3 transition-all
      ${todayChecked
        ? 'border-indigo-800 bg-indigo-950/30'
        : 'border-zinc-700 bg-zinc-900/50 hover:border-indigo-800 cursor-pointer'
      }
    `}
    onClick={!todayChecked ? handleCheckIn : undefined}
    >
      {/* CAL 캐릭터 미니 아이콘 */}
      <div className="text-2xl select-none">
        {justChecked ? '🤓✨' : todayChecked ? '🤓' : '📋'}
      </div>

      <div className="flex-1 min-w-0">
        {justChecked ? (
          <p className="text-sm font-semibold text-indigo-300">
            {getCalMessage(streak)}
          </p>
        ) : todayChecked ? (
          <p className="text-sm text-zinc-400">
            <span className="text-white font-semibold">Day {streak}</span> streak · Checked in ✓
          </p>
        ) : (
          <p className="text-sm text-zinc-300">
            <span className="font-semibold text-white">Check in</span> · {streak > 0 ? `${streak}-day streak active` : 'Start your streak'}
          </p>
        )}
        {/* 스트릭 바 */}
        <div className="mt-1.5 flex gap-0.5">
          {[1,2,3,4,5,6,7].map((d) => (
            <div
              key={d}
              className={`h-1 flex-1 rounded-full ${d <= (streak % 7 || (todayChecked ? 7 : 0)) ? 'bg-indigo-500' : 'bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs font-bold text-indigo-400">🔥 {streak}d</div>
        {!todayChecked && <div className="text-[10px] text-zinc-500">tap to check in</div>}
      </div>
    </div>
  )
}

function getCalMessage(streak: number): string {
  if (streak >= 365) return "365 days. You ARE the calendar."
  if (streak >= 100) return "Triple digits. You're on the honor roll."
  if (streak >= 30)  return "30 days straight. I'm actually impressed."
  if (streak >= 7)   return "Week complete. Your streak is secured. Don't waste it."
  if (streak >= 3)   return "Three days. You actually came back."
  return "Day one. Let's see if you stick around."
}
```

---

### E4-5: 뱃지 갤러리 컴포넌트

**파일**: `src/components/engagement/BadgeGallery.tsx`

```tsx
// 뱃지 그리드 (4열)
// 잠긴 뱃지: 흑백 + blur + 조건 힌트
// 언락된 뱃지: 컬러 + 언락 날짜 + 공유 버튼

// 희귀도별 테두리:
// Common:   border-zinc-600
// Rare:     border-blue-600, blue glow
// Epic:     border-purple-600, purple glow
// Legendary: border-amber-500, gold pulse animation
```

**파일**: `src/components/engagement/BadgeUnlockModal.tsx`

```tsx
// 뱃지 언락 시 전체화면 모달 (2초 자동 닫힘)
// 애니메이션: 위에서 아래로 드롭 → 바운스 → glow pulse
// CAL 캐릭터 happy 상태 + 한마디
// [Share on Discord] [View All Badges] [Close]
```

---

### E4-6: CAL 상황별 등장 위치

| 트리거 | 위치 | CAL 상태 | 액션 |
|--------|------|----------|------|
| 첫 방문 | 중앙 오버레이 | `idle` | 온보딩 설명 |
| 매일 첫 접속 | 헤더 하단 배너 | `alert` | 출석 체크 유도 |
| 뱃지 언락 | 전체 모달 | `celebration` | 뱃지 공유 유도 |
| 스트릭 끊김 | 헤더 배너 | `disappointed` | 재방문 유도 |
| 위시리스트 첫 추가 | 우하단 Toast | `happy` | 리마인더 설정 유도 |
| 리마인더 1시간 전 | Push 알림 | — | 이벤트 페이지 링크 |
| 게스트 → 위시리스트 시도 | 로그인 모달 | `alert` | "위시리스트 쓰려면 로그인" |

---

## 파일 수정 목록 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/engagement/DailyCheckIn.tsx` | 출석 체크 UI (스트릭 바, CAL 멘트) |
| `src/components/engagement/BadgeGallery.tsx` | 뱃지 그리드 (잠금/언락 상태) |
| `src/components/engagement/BadgeUnlockModal.tsx` | 뱃지 언락 전체 모달 |
| `src/components/engagement/CalCharacter.tsx` | CAL 픽셀아트 컴포넌트 (CSS pixel art) |
| `src/components/engagement/PrestigeBar.tsx` | GP 게이지 + 레벨 표시 |
| `src/components/wishlist/WishlistButton.tsx` | 하트 버튼 (이벤트 카드/패널) |
| `src/components/wishlist/ReminderPicker.tsx` | 알림 시간 선택 UI |
| `src/hooks/useWishlist.ts` | 위시리스트 토글 훅 |
| `src/hooks/useAttendance.ts` | 출석 체크 + 스트릭 계산 훅 |
| `src/hooks/useReminder.ts` | 리마인더 토글 훅 |
| `src/hooks/useBadges.ts` | 뱃지 상태 + 언락 체크 훅 |
| `src/app/my-schedule/page.tsx` | 위시리스트 달력 탭 |
| `src/app/profile/page.tsx` | 뱃지 갤러리 + 스탯 + 프레스티지 |
| `src/app/api/push/subscribe/route.ts` | Push 구독 저장 API |
| `src/app/api/cron/reminders/route.ts` | 리마인더 발송 Cron |
| `public/sw.js` | Service Worker (Push 수신) |
| `supabase/migrations/004_engagement.sql` | wishlists, reminders, attendance, badges 스키마 |
| `scripts/seed-badges.ts` | 뱃지 정의 데이터 초기 삽입 |

---

## UX 플로우 — 신규 유저 첫 5분

```
1. 랜딩 (/ 또는 /calendar)
   └→ CAL 첫 등장: "Oh, you're finally here. Pick your games."
   
2. 게임 선택 (사이드바)
   └→ 선택할 때마다 달력에 해당 게임 이벤트 즉시 표시

3. 이벤트 클릭 → 패널 열림
   └→ [Wishlist ♥] [Remind me ↓] 버튼 노출
   └→ 클릭 시: "Sign in free to save this" (CAL alert 토스트)

4. 회원가입 → 복귀
   └→ CAL: "Day 1 streak started. Don't ruin it."
   └→ 출석 체크 배너 등장

5. 이벤트 위시리스트 추가
   └→ CAL 우하단 토스트: "Wishlist started. Smart move."
   └→ Remind me 버튼 강조 (pulse)

6. 리마인더 설정 → Push 권한 요청
   └→ 브라우저 알림 허용 → "CAL will handle it from here."
```

---

## 모바일 UX 조정

- `DailyCheckIn` → 하단 고정 탭바 오른쪽에 🔥N 배지로 표시
- `WishlistButton` → 이벤트 카드에 우상단 하트 아이콘 오버레이 (absolute)
- `BadgeGallery` → 2열 그리드 (모바일 기준)
- CAL 캐릭터 → 모바일에서는 전체 오버레이 대신 하단 Sheet로 등장

---

## 경쟁 분석 — 게임화 벤치마크

| 서비스 | 학습 포인트 |
|--------|------------|
| **Duolingo** | Streak 심리학 — 끊기기 직전이 가장 강력한 유도 시점 |
| **Steam** | 뱃지를 "수집" 대상으로 — 희귀도 + 진열 기능 |
| **Discord** | 캐릭터 감성 — 봇이지만 성격 있음 (Clyde) |
| **Twitch** | 채널 포인트 — 작은 보상도 누적되면 강력한 리텐션 |
| **GitHub** | 잔디 그래프 — 출석 시각화 자체가 동기 부여 |

**핵심 인사이트**: 게이머는 **숫자가 올라가는 것**과 **남들에게 보여줄 수 있는 것**에 반응한다.
CAL이 그 두 가지를 연결하는 캐릭터가 되어야 한다.
