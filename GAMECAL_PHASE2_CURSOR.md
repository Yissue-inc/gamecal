# GAMECAL Phase 2 — Cursor 작업 지시서

## 현재 상태 (2026-05-23 기준)

### ✅ 완료된 작업
- UX Phase 2 (U1–U4): 3-col 레이아웃, LiveBanner, WeeklyHighlights, UpcomingFeed, CommandSearch
- Engagement (E1–E4): DailyCheckIn, WishlistButton, ReminderPicker, BadgeGallery, PrestigeBar
- Supabase Schema: `hero_color` 컬럼 추가 완료 (new_releases 테이블)
- Supabase Schema: 004_engagement.sql 적용 완료 (wishlists, reminders, attendance, badge_definitions, user_badges, user_stats, digest_subscribers) — RLS 활성화 포함
- 현재 Engagement 데이터는 **localStorage MVP** 상태 (Supabase 연동 대기 중)
- 배포: `gamecal-beryl.vercel.app` 라이브, GitHub CI E2E ✅

---

## SESSION P1 — hero_color 데이터 시딩

### 목표
`new_releases` 테이블의 기존 rows에 `hero_color` 값 업데이트

### 작업
Supabase Dashboard SQL Editor 또는 아래 코드로 실행:

```sql
-- 기존 new_releases에 hero_color 업데이트 (타이틀 기반 매핑)
UPDATE new_releases SET hero_color = '#1a1a2e' WHERE title ILIKE '%Hollow Knight%';
UPDATE new_releases SET hero_color = '#e4000f' WHERE title ILIKE '%Metroid%';
UPDATE new_releases SET hero_color = '#1b2838' WHERE title ILIKE '%Elden Ring%';
UPDATE new_releases SET hero_color = '#f59e0b' WHERE title ILIKE '%Borderlands%';
```

또는 `scripts/seed-releases-colors.ts` 파일 생성:

```typescript
// scripts/seed-releases-colors.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const heroColors: Record<string, string> = {
  'Hollow Knight: Silksong': '#1a1a2e',
  'Metroid Prime 4': '#e4000f',
  'Elden Ring: Nightreign': '#1b2838',
  'Borderlands 4': '#f59e0b',
}

async function seed() {
  for (const [title, hero_color] of Object.entries(heroColors)) {
    const { error } = await supabase
      .from('new_releases')
      .update({ hero_color })
      .ilike('title', `%${title.split(':')[0]}%`)
    if (error) console.error(title, error)
    else console.log(`✅ ${title} → ${hero_color}`)
  }
}

seed()
```

실행: `npx tsx scripts/seed-releases-colors.ts`

---

## SESSION P2 — Supabase Engagement API 연동

### 목표
현재 localStorage 기반 engagement-store를 Supabase 실제 DB로 마이그레이션

### 파일 위치
- `src/lib/engagement-store.ts` — localStorage 구현
- `src/components/wishlist/WishlistButton.tsx`
- `src/components/engagement/DailyCheckIn.tsx`
- `src/components/wishlist/ReminderPicker.tsx`

### 작업 순서

#### P2-A: Wishlist API 연동
`src/app/api/wishlist/route.ts` 생성:

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/wishlist?userId=xxx → 위시리스트 조회
// POST /api/wishlist { userId, eventId } → 추가
// DELETE /api/wishlist { userId, eventId } → 제거
```

#### P2-B: DailyCheckIn Supabase 연동
`attendance` 테이블에 INSERT 후 `user_stats` streak 업데이트:

```typescript
// 체크인 로직
const { data: existing } = await supabase
  .from('attendance')
  .select('id')
  .eq('user_id', userId)
  .eq('checked_at', today)
  .single()

if (!existing) {
  await supabase.from('attendance').insert({ user_id: userId, checked_at: today })
  // streak 계산 후 user_stats 업데이트
  await supabase.from('user_stats').upsert({
    user_id: userId,
    current_streak: newStreak,
    last_check_in: today,
    // ...
  })
}
```

#### P2-C: Badge 시드 데이터 삽입
`scripts/seed-badges.ts` 이미 존재. 실행:
```bash
npx tsx scripts/seed-badges.ts
```

badge_definitions 테이블에 25개 뱃지 정의 삽입.

---

## SESSION P3 — CommandSearch 기능 완성

### 목표
`CommandSearch.tsx` (Cmd+K 팔레트)에서 실제 이벤트 검색 연동

### 현재 상태
- 컴포넌트는 있으나 이벤트 데이터 연동이 mock 수준일 수 있음

### 작업
```typescript
// CommandSearch.tsx 내부
const [results, setResults] = useState<GameEvent[]>([])

const search = async (query: string) => {
  const { data } = await supabase
    .from('events')
    .select('*, game:games(*)')
    .ilike('title', `%${query}%`)
    .limit(10)
  setResults(data ?? [])
}
```

---

## SESSION P4 — New Releases 히어로 카드 UI 완성

### 목표
`src/components/calendar/NewReleasesHero.tsx` (또는 관련 컴포넌트)에서
Supabase new_releases 테이블의 `hero_color` 값 활용

### 현재 상태
- Mock 데이터: `src/lib/mock-data.ts`에 `hero_color` 있음
- Supabase: `hero_color` 컬럼 추가됨 + 데이터 시딩 필요 (P1)

### 작업
1. P1 완료 후 Supabase에서 `hero_color` 포함 조회 확인
2. `NewReleasesHero` 컴포넌트의 gradient 배경에 `hero_color` 적용

```typescript
<div
  style={{
    background: `linear-gradient(135deg, ${release.hero_color ?? '#1b2838'} 0%, rgba(0,0,0,0.8) 100%)`
  }}
>
```

---

## QA 체크리스트 (각 SESSION 완료 후)

```bash
pnpm tsc --noEmit        # TypeScript 타입 체크
pnpm build               # Next.js 빌드
pnpm test:e2e            # E2E 테스트
```

### 테스트 파일
- `tests/e2e/11-ux-engage.spec.ts` — 8 passed 유지 확인
- Supabase 연동 후: `tests/e2e/12-supabase-engage.spec.ts` 추가 고려

---

## 배포 플로우
```bash
git add -A
git commit -m "feat: [SESSION명] ..."
git push origin main
# → Vercel 자동 배포: gamecal-beryl.vercel.app
# → GitHub Actions E2E CI 자동 실행
```

---

## 참고: 현재 Supabase 프로젝트
- URL: `https://yaniatixajpbmdwdisbj.supabase.co`
- 테이블: games, events, new_releases(+hero_color), user_preferences, subscriptions
- Engagement 테이블: wishlists, reminders, attendance, badge_definitions, user_badges, user_stats, digest_subscribers
