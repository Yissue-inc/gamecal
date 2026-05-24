# GAMECAL — 현재 상태 & 다음 작업 지시서
### 최종 업데이트: 2026-05-23

---

## ✅ 완료된 작업 (지금까지)

### 인프라
| 항목 | 상태 | 비고 |
|------|------|------|
| Vercel 배포 | ✅ Live | `gamecal-beryl.vercel.app` |
| Supabase DB | ✅ 연결 완료 | Project ref: `byaujvjvzdnoaqhvjlwc` |
| Vercel Env Vars | ✅ 전부 설정 | 6개 변수 production 등록 |
| 시드 데이터 | ✅ 완료 | 5게임 + 14이벤트 + 3릴리즈 |
| 스모크 테스트 | ✅ 통과 | `GAMECAL_Smoke_Test.sh` |

### Vercel 환경변수 (현재 등록된 값)
```
NEXT_PUBLIC_SUPABASE_URL      = https://byaujvjvzdnoaqhvjlwc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = (anon key)
SUPABASE_SERVICE_ROLE_KEY     = (service role key)
NEXT_PUBLIC_APP_URL           = https://gamecal-beryl.vercel.app
ADMIN_SECRET                  = (랜덤 hex 32)
CRON_SECRET                   = (랜덤 hex 32)
```

### DB 시드 데이터 현황
- **games**: Fortnite, WoW, Pokémon GO, Genshin Impact, LoL (5종)
- **events**: 14개 (weekly_reset, live_event, season_end, patch_release, tournament 등)
- **new_releases**: Hollow Knight: Silksong, Metroid Prime 4, Elden Ring: Nightreign (3종)

### Cron 제거 (중요 결정)
- `vercel.json`에서 cron 전부 제거 → `{}` 로 변경
- **이유**: Vercel Hobby Plan은 1일 1회 초과 cron 불가 (`0 */6 * * *` 차단)
- **복원 시점**: Vercel Pro 업그레이드 후 `vercel.json`에 cron 재추가

---

## 🔜 다음 작업 (Cursor 지시 순서)

### SESSION G1 — 어드민 CMS UI (우선순위 1)
> 파일: `gamecal-admin.html` 현재 기본 틀 존재
> 연동: Vercel API routes (`/api/admin/*`)

- [ ] 어드민 대시보드 로그인 (ADMIN_SECRET 기반 JWT)
- [ ] 이벤트 CRUD (게임별 필터, 날짜 범위, 발행/비발행)
- [ ] 새 릴리즈 관리
- [ ] 크롤러 수동 트리거 버튼

### SESSION G2 — 캘린더 UI 고도화
> 현재 상태: FullCalendar 기본 렌더링 작동
> 목표: PPT 3페이지 UX 100% 구현

- [ ] 이벤트 클릭 → 오른쪽 슬라이드 패널 (380px, 데스크탑)
- [ ] 이벤트 클릭 → 바텀 시트 (모바일)
- [ ] 게스트 blur UX: 당일 이외 이벤트 흐릿 + CTA
- [ ] Discord/Reddit/Plain text 3종 COPY 버튼
- [ ] 게임별 체크박스 필터 (brand_color 연동)

### SESSION G3 — Auth & 구독
- [ ] Google OAuth (Supabase Auth)
- [ ] 로그인 후 blur 해제, 전체 이벤트 공개
- [ ] ICS 구독 URL 생성 (`/api/ics/[game]`)
- [ ] 게임별 + 전체 구독 옵션

### SESSION G4 — 크롤러 / 데이터 자동화 (Pro 업그레이드 후)
- [ ] `vercel.json` cron 복원: `0 0 * * *` (1일 1회)
- [ ] 각 게임 공식 사이트 이벤트 파싱 스크립트 (`scripts/crawl/`)
- [ ] Supabase `events` upsert (slug 기준 중복 방지)

---

## 📁 주요 파일 구조
```
gamecal/
├── src/
│   ├── app/
│   │   ├── page.tsx          — 메인 캘린더 페이지
│   │   ├── api/
│   │   │   ├── events/       — 이벤트 조회 API
│   │   │   ├── admin/        — 어드민 CRUD API
│   │   │   └── ics/          — ICS 구독 피드
│   │   └── admin/            — 어드민 대시보드 페이지
│   └── components/
│       └── Calendar/         — FullCalendar 래퍼
├── scripts/
│   └── seed.ts               — DB 시드 스크립트
├── schema.sql                — Supabase 스키마
├── vercel.json               — 현재 {} (cron 제거됨)
├── GAMECAL_WEBAPP_CURSOR.md  — 전체 UX 스펙 (PRIMARY)
└── GAMECAL_TEST_CURSOR.md    — 테스트 지시서
```

---

## ⚠️ 알려진 이슈 & 주의사항

1. **Cron 비활성화**: Vercel Pro 전까지 자동 이벤트 수집 없음 → 수동 시드만 가능
2. **시드 재실행**: `pnpm tsx scripts/seed.ts` — 중복 방지 로직 있음 (slug unique)
3. **Node.js 20 WebSocket**: seed.ts에 `realtime: { transport: require('ws') }` 필수 (이미 적용됨)
4. **GitHub webhook 미연결**: GitHub push → 자동 배포 안됨. 배포는 `npx vercel --prod` CLI 직접 실행

```bash
# 배포 명령어
cd /Users/ck/gamecal
npx vercel --prod --yes --scope artscal-web-s-projects

# 시드 재실행
export $(grep -v '^#' .env.local | xargs) && pnpm tsx scripts/seed.ts
```
