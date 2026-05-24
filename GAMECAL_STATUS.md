# GAMECAL — 현재 상태 & 다음 작업 지시서
### 최종 업데이트: 2026-05-23

---

## ✅ 완료된 작업 (전체 이력)

### 인프라 & 배포
| 항목 | 상태 | 비고 |
|------|------|------|
| Vercel 배포 | ✅ Live | `gamecal-beryl.vercel.app` |
| GitHub CI E2E | ✅ 통과 | Actions #5 — a6d8ee4 기준 |
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

### Supabase Schema 최신화
- ✅ `new_releases.hero_color TEXT` 컬럼 추가
- ✅ 004_engagement.sql 적용 (RLS 활성화):
  - wishlists, reminders, attendance
  - badge_definitions, user_badges, user_stats
  - digest_subscribers

---

## 🔜 다음 작업 (우선순위 순)

### [P1] hero_color 시드 데이터 채우기 ← **첫 번째로 할 것**
> Supabase Dashboard SQL Editor에서 실행

```sql
UPDATE new_releases SET hero_color = '#1a1a2e' WHERE title ILIKE '%Hollow Knight%';
UPDATE new_releases SET hero_color = '#e4000f' WHERE title ILIKE '%Metroid%';
UPDATE new_releases SET hero_color = '#1b2838' WHERE title ILIKE '%Elden Ring%';
UPDATE new_releases SET hero_color = '#f59e0b' WHERE title ILIKE '%Borderlands%';
```

또는 `pnpm tsx scripts/seed-releases-colors.ts` (GAMECAL_PHASE2_CURSOR.md 참고)

---

### [P2] PostHog 분석 연동 ← **두 번째**
> MVP → PMF 판단을 위한 핵심 지표 수집

설치:
```bash
pnpm add posthog-js posthog-node
```

`src/lib/posthog.ts` 생성 후 트래킹 이벤트:
- `cinematic_seen` / `cinematic_skipped`
- `wishlist_added` / `reminder_set`
- `checkin_done` / `badge_unlocked`
- `onboarding_completed` (게임 선택, 플랫폼 선택)
- `share_discord` / `share_reddit`
- `signup_started` / `signup_completed`

PostHog 프로젝트 생성: https://app.posthog.com
무료 월 100만 이벤트, Next.js 연동 쉬움.

---

### [P3] Supabase Engagement API 연동 ← **세 번째**
> 현재 localStorage MVP → 실제 DB

- `src/app/api/wishlist/route.ts` — GET/POST/DELETE
- `src/app/api/checkin/route.ts` — POST + streak 계산 → `user_stats` upsert
- `badges` 시드 실행: `pnpm tsx scripts/seed-badges.ts`
- Supabase RLS 정책 추가 (각 테이블 `user_id = auth.uid()`)

자세한 코드: `GAMECAL_PHASE2_CURSOR.md` SESSION P2 참고

---

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

### [P5] 어드민 CMS (Admin Dashboard)
> 이벤트·릴리즈 CRUD, 수동 크롤러 트리거

- `src/app/admin/` 페이지 (ADMIN_SECRET 기반 인증)
- 이벤트 CRUD (발행/비발행, 날짜 범위 필터)
- New Releases 관리 (hero_color 색상 피커 포함)
- 크롤러 수동 트리거 버튼

자세한 스펙: `GAMECAL_DESIGN_CURSOR.md` Session A1–A4 참고

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
│   │   └── api/
│   │       ├── events/
│   │       ├── digest/subscribe/
│   │       ├── push/subscribe/
│   │       └── cron/reminders/
│   ├── components/
│   │   ├── calendar/
│   │   │   ├── CalendarLayout.tsx    ← 3-col 레이아웃
│   │   │   ├── WeeklyHighlights.tsx
│   │   │   ├── UpcomingFeed.tsx
│   │   │   ├── CommandSearch.tsx
│   │   │   └── DigestSubscribe.tsx
│   │   ├── cinematic/
│   │   │   ├── CinematicIntro.tsx    ← 드래곤 인트로
│   │   │   └── dragon-renderer.ts
│   │   ├── onboarding/
│   │   │   └── SignupOnboarding.tsx  ← 회원가입 온보딩
│   │   ├── engagement/
│   │   │   ├── DailyCheckIn.tsx
│   │   │   ├── BadgeGallery.tsx
│   │   │   └── PrestigeBar.tsx
│   │   └── wishlist/
│   │       ├── WishlistButton.tsx
│   │       └── ReminderPicker.tsx
│   └── lib/
│       ├── timezone.ts               ← 타임존 유틸
│       ├── engagement-store.ts       ← localStorage MVP
│       ├── calendar-dates.ts
│       └── push.ts
├── supabase/migrations/
│   └── 004_engagement.sql            ← Supabase 적용 완료
├── scripts/
│   ├── seed-badges.ts
│   └── seed-releases-colors.ts       ← 작성 필요 (P1)
├── tests/e2e/
│   ├── 10-gamer-design.spec.ts
│   └── 11-ux-engage.spec.ts
├── schema.sql
├── GAMECAL_STATUS.md                 ← 이 파일 (현재 상태)
├── GAMECAL_PHASE2_CURSOR.md          ← P2-P4 Cursor 지시서
├── GAMECAL_ENGAGE_CURSOR.md          ← E1-E4 원본 지시서
└── GAMECAL_UX2_CURSOR.md             ← U1-U4 원본 지시서
```

---

## ⚠️ 알려진 이슈 & 주의사항

1. **dragon-renderer.ts 수정본 미커밋**: `git status`에 M 표시 — 다음 커밋에 포함
2. **Engagement 데이터 localStorage**: Supabase RLS 정책 미설정 — P3 완료 후 전환
3. **Cron 비활성화**: Vercel Pro 전까지 자동 이벤트 수집 없음
4. **hero_color Supabase 컬럼**: 추가됨, 데이터 미입력 — P1 실행 필요

---

## 배포 확인 URL

| 항목 | URL |
|------|-----|
| 메인 | https://gamecal-beryl.vercel.app |
| 인트로 재시청 | https://gamecal-beryl.vercel.app/?replay=cinematic |
| Settings | https://gamecal-beryl.vercel.app/settings |
| My Schedule | https://gamecal-beryl.vercel.app/my-schedule |
| Profile | https://gamecal-beryl.vercel.app/profile |
| GitHub | https://github.com/Yissue-inc/gamecal |
