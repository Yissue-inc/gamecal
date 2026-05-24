# GAMECAL — 현재 상태 & 다음 작업 지시서
### 최종 업데이트: 2026-05-24

---

## ✅ 완료된 작업 (전체 이력)

### 인프라 & 배포
| 항목 | 상태 | 비고 |
|------|------|------|
| Vercel 배포 | ✅ Live | `gamecal-beryl.vercel.app` |
| GitHub CI E2E | ✅ 통과 | Actions — d39c31c 기준 |
| Supabase DB | ✅ 연결 완료 | `yaniatixajpbmdwdisbj` |
| Vercel Env Vars | ✅ 전부 설정 | 6개 변수 production 등록 |
| Cron 제거 | ✅ | Hobby Plan 제한 — Pro 업그레이드 후 복원 |

### Phase 1 — 기본 캘린더 MVP
- ✅ FullCalendar + Supabase + Next.js 15 앱 구조
- ✅ 시드 데이터: 9게임, 13이벤트, 4릴리즈
- ✅ 게임 필터 사이드바 (브랜드 컬러)
- ✅ 이벤트 상세 패널 (오른쪽 슬라이드 / 모바일 바텀시트)
- ✅ 게스트 blur UX + CTA 배너
- ✅ Discord / Reddit / Copy 공유 버튼

### Phase 2 — Gamer Design System (D1–D3)
- ✅ New Releases 히어로 카드 (BIG 풀블리드, hero_color 적용)
- ✅ 게임 브랜드 컬러 이벤트 패널 hero 배너
- ✅ importance 계층 (critical glow, high/normal/low)
- ✅ getGamerCountdown: D-N / Starts in 6h 30m / 🔴 LIVE
- ✅ 모바일 가로 스크롤 게임 칩 (md:hidden)
- ✅ E2E: tests/e2e/10-gamer-design.spec.ts — 10 tests

### Phase 2 — UX Phase 2 (U1–U4) + Engagement (E1–E4)
- ✅ 3-column 레이아웃: 사이드바(220px) + THIS WEEK + 캘린더 + NEXT UP 피드
- ✅ LiveBanner, WeeklyHighlights, UpcomingFeed
- ✅ CommandSearch (Cmd+K), DigestSubscribe, PWA 설치 배너
- ✅ DailyCheckIn (7일 스트릭 바)
- ✅ WishlistButton + ReminderPicker (이벤트 패널)
- ✅ BadgeGallery, BadgeUnlockModal, PrestigeBar
- ✅ /my-schedule, /profile 페이지
- ✅ localStorage engagement-store (위시리스트·리마인더·출석·뱃지·GP)
- ✅ E2E: tests/e2e/11-ux-engage.spec.ts — 8 passed

### Phase 2 — 타임존 + 온보딩 + 드래곤 시네마틱 (commit dbdbb00)
- ✅ **타임존 자동 인식**: 브라우저 타임존 감지 → 캘린더·패널·NEXT UP 로컬 시간 표시
- ✅ **헤더 🌍 PDT · GMT-7** 표시 + Settings에서 수동 변경
- ✅ **SignupOnboarding 모달**: 로그인 직후 게임/플랫폼/시간표시 preference 수집
- ✅ **드래곤 시네마틱 인트로**: 첫 방문 1회 자동 재생, `?replay=cinematic`으로 재시청
  - 비늘 plate, 척추 스파이크, 3개 뿔, 양쪽 눈 glow
  - 5개 wing finger bone, 2겹 날개, 3겹 fire breath, 꼬리 fin
  - 이번 주 critical/high 이벤트 게임 컬러·제목으로 CTA 표시

### Phase 2 — Analytics + Engagement API + Admin CMS + Sidebar (commit d39c31c)
- ✅ **[P1] hero_color 시드 완료**
  - `scripts/seed-releases-colors.ts` 생성 및 실행
  - Hollow Knight `#1a1a2e`, Metroid `#e4000f`, Elden Ring `#1b2838` 적용
  - Borderlands 4 — DB 미등록으로 스킵
- ✅ **[P2] PostHog 분석 연동**
  - `posthog-js` 설치, `PostHogProvider`, `src/lib/posthog.ts`
  - 트래킹: `cinematic_seen/skipped`, `wishlist_added`, `checkin_done`, `onboarding_completed`
  - ⚠️ **Vercel 환경변수 추가 필요**: `NEXT_PUBLIC_POSTHOG_KEY` (없으면 analytics no-op)
- ✅ **[P3] Supabase Engagement API 연동**
  - `GET/POST/DELETE /api/wishlist` — Supabase wishlists 테이블
  - `GET/POST /api/checkin` — attendance + user_stats streak 계산
  - `scripts/seed-badges.ts` — 25개 badge_definitions 시드 완료
  - WishlistButton, DailyCheckIn → API 우선, 실패 시 localStorage 폴백
- ✅ **[P5] 어드민 CMS**
  - `/admin` — 대시보드 + 크롤러 수동 트리거 (Fortnite/WoW/LoL/Genshin/Pokémon GO)
  - `/admin/events` — 검색·날짜 필터·발행/비발행 토글
  - `/admin/releases` — hero_color 색상 피커, featured/published 토글
  - `PUT /api/new-releases/[id]` API 추가
- ✅ **[Sidebar S1–S4] 사이드바 게임 아이콘 + 이벤트 요약**
  - `src/components/calendar/GameIcon.tsx` — 9개 게임 SVG 아이콘 (fortnite/apex/valorant/lol/destiny2/diablo4/wow/pokemon-go/genshin)
  - `src/lib/event-summary.ts` — `getEventSummary()` 타입별 집계, 우선순위 정렬, 최대 4개
  - `GameSidebar.tsx` — 색상 dot → SVG 아이콘, 플랫폼 칩 → 이벤트 카테고리 요약
  - `CalendarLayout.tsx` — `events` prop 전달

### Supabase Schema 최신화
- ✅ `new_releases.hero_color TEXT` 컬럼 추가
- ✅ 004_engagement.sql 적용 (RLS 활성화):
  - wishlists, reminders, attendance
  - badge_definitions, user_badges, user_stats
  - digest_subscribers

---

## 🔜 다음 작업 (우선순위 순)

### [P4] CommandSearch 실제 검색 연동
> 현재 Cmd+K 패널이 있지만 이벤트 DB 검색 미연동

```typescript
const { data } = await supabase
  .from('events')
  .select('*, game:games(*)')
  .ilike('title', `%${query}%`)
  .limit(10)
```

---

### [PostHog] Vercel 환경변수 활성화 ← **즉시 할 것**
> PostHog 코드는 배포됐으나 KEY가 없어 analytics가 no-op 상태

1. https://app.posthog.com 에서 프로젝트 생성 → API Key 복사
2. Vercel → Settings → Environment Variables → `NEXT_PUBLIC_POSTHOG_KEY` 추가
3. Vercel 재배포 (또는 자동 트리거)

무료 월 100만 이벤트.

---

### [P6] ICS 구독 (캘린더 앱 연동)
- `/api/ics/[game]` — 게임별 ICS 피드
- `/api/ics/all` — 전체 구독
- Google Calendar / Apple Calendar 추가 버튼

---

### [P7] Cron 크롤러 복원 (Vercel Pro 업그레이드 후)
- `vercel.json`에 cron 재추가: `"0 0 * * *"`
- `scripts/crawl/` 각 게임 공식 사이트 파서

---

## 📁 주요 파일 구조 (최신)

```
gamecal/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── settings/
│   │   ├── my-schedule/
│   │   ├── profile/
│   │   ├── admin/
│   │   │   ├── page.tsx              ← 어드민 대시보드 + 크롤러
│   │   │   ├── layout.tsx
│   │   │   ├── events/page.tsx       ← 이벤트 CRUD
│   │   │   └── releases/page.tsx     ← 릴리즈 + hero_color 피커
│   │   └── api/
│   │       ├── events/
│   │       ├── wishlist/route.ts     ← Supabase wishlists
│   │       ├── checkin/route.ts      ← Supabase attendance + streak
│   │       ├── new-releases/[id]/route.ts ← PUT (hero_color 등)
│   │       ├── digest/subscribe/
│   │       ├── push/subscribe/
│   │       └── cron/reminders/
│   ├── components/
│   │   ├── calendar/
│   │   │   ├── CalendarLayout.tsx    ← 3-col 레이아웃 (events prop 전달)
│   │   │   ├── GameIcon.tsx          ← 9-game SVG 아이콘 ✨NEW
│   │   │   ├── GameSidebar.tsx       ← 아이콘 + 이벤트 요약 ✨NEW
│   │   │   ├── WeeklyHighlights.tsx
│   │   │   ├── UpcomingFeed.tsx
│   │   │   ├── CommandSearch.tsx
│   │   │   └── DigestSubscribe.tsx
│   │   ├── PostHogProvider.tsx       ← PostHog 래퍼 ✨NEW
│   │   ├── cinematic/
│   │   │   ├── CinematicIntro.tsx
│   │   │   └── dragon-renderer.ts
│   │   ├── onboarding/
│   │   │   └── SignupOnboarding.tsx
│   │   ├── engagement/
│   │   │   ├── DailyCheckIn.tsx      ← Supabase API 연동
│   │   │   ├── BadgeGallery.tsx
│   │   │   └── PrestigeBar.tsx
│   │   └── wishlist/
│   │       ├── WishlistButton.tsx    ← Supabase API 연동
│   │       └── ReminderPicker.tsx
│   ├── hooks/
│   │   └── useAuth.tsx
│   └── lib/
│       ├── posthog.ts                ← PostHog 유틸 ✨NEW
│       ├── event-summary.ts          ← 이벤트 카테고리 집계 ✨NEW
│       ├── admin-fetch.ts            ← 어드민 fetch 유틸 ✨NEW
│       ├── timezone.ts
│       ├── engagement-store.ts       ← localStorage 폴백
│       ├── calendar-dates.ts
│       └── push.ts
├── supabase/migrations/
│   └── 004_engagement.sql
├── scripts/
│   ├── seed-badges.ts                ← 25개 뱃지 시드 완료
│   └── seed-releases-colors.ts       ← hero_color 시드 완료
├── tests/e2e/
│   ├── 09-design-ui.spec.ts          ← 사이드바 assertion 업데이트
│   ├── 10-gamer-design.spec.ts
│   └── 11-ux-engage.spec.ts
├── GAMECAL_STATUS.md                 ← 이 파일
├── GAMECAL_PHASE2_CURSOR.md
├── GAMECAL_SIDEBAR_CURSOR.md
├── GAMECAL_ENGAGE_CURSOR.md
└── GAMECAL_UX2_CURSOR.md
```

---

## ⚠️ 알려진 이슈 & 주의사항

1. **PostHog KEY 미설정**: `NEXT_PUBLIC_POSTHOG_KEY` Vercel 환경변수 추가 필요 — 없으면 analytics 비활성화
2. **Borderlands 4 hero_color 미설정**: DB에 해당 타이틀 없어 스킵됨 — 릴리즈 추가 후 어드민에서 색상 설정
3. **Cron 비활성화**: Vercel Pro 전까지 자동 이벤트 수집 없음
4. **Supabase RLS 정책**: engagement 테이블 RLS 활성화됨, 인증된 유저만 write 가능 (게스트는 read-only)

---

## 배포 확인 URL

| 항목 | URL |
|------|-----|
| 메인 | https://gamecal-beryl.vercel.app |
| 인트로 재시청 | https://gamecal-beryl.vercel.app/?replay=cinematic |
| Settings | https://gamecal-beryl.vercel.app/settings |
| My Schedule | https://gamecal-beryl.vercel.app/my-schedule |
| Profile | https://gamecal-beryl.vercel.app/profile |
| 어드민 | https://gamecal-beryl.vercel.app/admin?secret=YOUR_SECRET |
| GitHub | https://github.com/Yissue-inc/gamecal |
