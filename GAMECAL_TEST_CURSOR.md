# GAMECAL — 자동화 테스트 봇 + QA 완전 작업 지시서
### Playwright E2E · API · Visual Regression · 성능 테스트
### 2026-05-23 · Cursor SESSION T1~T3 + 내일 아침 수동 QA 체크리스트

---

## 전체 테스트 전략

```
레이어 구성:
┌───────────────────────────────────────────────────┐
│  Layer 1: Smoke Test (30초)                        │
│  → 배포 직후 핵심 3가지만 확인                     │
├───────────────────────────────────────────────────┤
│  Layer 2: E2E 자동화 (Playwright, ~8분)            │
│  → 사용자 여정 전체 시뮬레이션                     │
├───────────────────────────────────────────────────┤
│  Layer 3: API 테스트 (~2분)                        │
│  → 모든 엔드포인트 응답 코드 + 데이터 검증         │
├───────────────────────────────────────────────────┤
│  Layer 4: 시각 회귀 + 성능 (~3분)                  │
│  → 스크린샷 비교 + Core Web Vitals                 │
└───────────────────────────────────────────────────┘

총 자동화 실행 시간: 약 13분
실행 명령어 하나로 전체 수행: pnpm test:all
```

---

## 수동 QA 체크리스트 (내일 아침 배포 직후)

> 이 체크리스트는 자동화 테스트 전에 먼저 수동으로 확인합니다.
> 순서대로 진행하면 약 20~30분 소요.

### ✅ STEP 0 — 환경 확인

```
□ Vercel 배포 URL 정상 접근 (https://gamecal.vercel.app 또는 실제 도메인)
□ pnpm tsx scripts/seed.ts 실행 완료 (터미널에서 "✅ Seeded X events" 확인)
□ Supabase Dashboard → Table Editor → events 테이블에 데이터 있음
□ Google OAuth redirect URL이 Supabase Auth Settings에 등록됨
□ .env.local (로컬) 또는 Vercel Environment Variables 9개 전부 입력됨
```

### ✅ STEP 1 — 게스트 UX 검증

```
□ 홈페이지 로드 후 캘린더가 보임 (로그인 없이)
□ 오늘 날짜에 이벤트 바가 표시됨
□ 오늘 날짜 외 다른 날짜는 blur 처리됨 (흐릿하게 보임)
□ blur 위에 "Sign in to unlock the full calendar" + "Sign in free →" CTA 보임
□ 사이드바 헤더가 "🎮 GAMES" 스타일로 표시됨 (Game Select placeholder 없음)
□ 게임 항목 아래 플랫폼 칩 표시됨 (PC, PS5 등)
□ 이벤트 바에 타입 아이콘 prefix 표시됨 (🔄 🏆 🎁 등)
□ critical 이벤트(시즌 종료·토너먼트)에 빨간 glow + dot 강조
□ 오늘 날짜 셀에 인디고 glow 원 표시됨
□ 왼쪽 게임 리스트 5개 체크박스 보임 (Fortnite, WoW, Pokémon GO, Genshin, LoL)
□ 헤더에 "Sign In" 버튼 보임
```

### ✅ STEP 2 — Auth 플로우 검증

```
□ "Sign In" 버튼 클릭 → Auth 모달 열림
□ "Continue with Google" 버튼 클릭 → Google OAuth 페이지로 이동
□ 구글 계정으로 로그인 완료 → 캘린더로 리다이렉트
□ 로그인 후 blur 해제 → 5월 25일~7월 30일 이벤트 전체 표시됨
□ 헤더에 프로필 아이콘 또는 사용자 이름 표시됨
□ 로그아웃 → 다시 blur 상태로 돌아옴
□ 이메일/패스워드 가입 플로우도 정상 동작 확인
```

### ✅ STEP 3 — 캘린더 UI 검증

```
□ 현재 월(2026년 5월)에 이벤트 바가 게임 색상으로 표시됨
□ 멀티데이 이벤트가 날짜를 가로질러 연결 바로 표시됨
□ 단일 날짜 이벤트는 해당 셀에만 표시됨
□ 오늘 날짜에 파란 원 표시됨
□ [>] 버튼 클릭 → 6월로 이동, 6월 이벤트 표시됨
□ [<] 버튼 클릭 → 5월로 돌아옴
□ [Today] 버튼 클릭 → 현재 월로 돌아옴
□ 왼쪽 Fortnite 체크박스 해제 → 캘린더에서 Fortnite 이벤트 사라짐
□ 다시 체크 → 이벤트 복원됨
□ [All] 체크박스 해제 → 모든 이벤트 사라짐
□ 모바일 (375px로 창 줄이기) → 가로 스크롤 게임 칩 + 캘린더 표시
□ 출시일 셀에 게임 커버 art + D-day 표시됨
□ 출시 셀 클릭 → 릴리즈 상세 패널 슬라이드인
□ 이벤트 패널 Share 버튼 (Discord/Reddit/Copy) 동작
□ 이벤트 패널 게이머 카운트다운 (D-N / X days left / LIVE)
```

### ✅ STEP 4 — 이벤트 상세 패널 검증

```
□ 이벤트 바 클릭 → 오른쪽에서 패널이 슬라이드인 됨
□ 패널에 게임 이름 표시됨
□ 이벤트 제목 표시됨
□ 이벤트 타입 배지 표시됨 (예: LIMITED REWARD, WEEKLY RESET)
□ 날짜/시간 표시됨 (UTC 기준)
□ 카운트다운 표시됨 (예: "Ends in 3d 14h")
□ 설명 텍스트 표시됨
□ [Add to Calendar ▼] 버튼 클릭 → 드롭다운 열림
□ 드롭다운에 Google / Outlook / iCal / COPY 4개 옵션 보임
□ [✕] 버튼 클릭 → 패널 닫힘
□ 패널 외 영역 클릭 → 패널 닫힘
```

### ✅ STEP 5 — Add to Calendar 검증

```
□ Google 클릭 → 새 탭에서 Google Calendar 이벤트 생성 페이지 열림
  - URL에 이벤트 제목, 날짜, 설명이 파라미터로 포함됨
□ Outlook 클릭 → Outlook 웹 이벤트 생성 페이지 열림
□ iCal 클릭 → .ics 파일 다운로드됨
  - 파일 내용 확인: BEGIN:VCALENDAR, DTSTART, DTEND, SUMMARY 있음
□ COPY 클릭 → 클립보드에 Discord 포맷 복사됨
  - 토스트 메시지 "Copied for Discord! ✓" 표시됨
  - 붙여넣기 시 이모지 + 게임명 + 날짜 포맷팅된 텍스트 확인
□ Reddit / Plain Text 링크 클릭 → 각 포맷으로 복사됨
```

### ✅ STEP 6 — ICS 피드 API 검증

```
브라우저 주소창에 직접 입력:

□ /api/feed/fortnite → 200 OK, text/calendar Content-Type
□ /api/feed/wow → 200 OK
□ /api/feed/pokemon-go → 200 OK
□ /api/feed/genshin → 200 OK
□ /api/feed/lol → 200 OK
□ /api/feed/all → 200 OK (전체 게임 합친 피드)
□ /api/feed/invalid-game → 404 응답

Google Calendar 구독 테스트:
□ Google Calendar 열기 → + 버튼 → From URL
□ webcal://[your-domain]/api/feed/fortnite 입력
□ 이벤트들이 Google Calendar에 동기화됨 확인
```

### ✅ STEP 7 — Settings 페이지 검증

```
□ 헤더 ⚙ 아이콘 또는 /settings 직접 접근
□ 설정 페이지 5개 섹션 표시됨: General / Time Zone / Calendar View / Games / Account
□ Language 드롭다운 변경 가능
□ Time format 12h → 24h 변경 → 저장 → 캘린더 이벤트 시간 포맷 변경됨
□ Timezone 변경 (예: UTC → America/Los_Angeles) → 저장 → 이벤트 시간 변환됨
□ Week starts on: Monday 선택 → 캘린더 첫 열이 월요일로 바뀜
□ Show weekends 해제 → 주말 칸 숨겨짐
□ 설정 저장 후 새로고침 → 설정 유지됨 (DB에 저장됨)
□ Sign Out 버튼 → 로그아웃 + 홈으로 이동
```

### ✅ STEP 8 — New Releases 페이지 검증

```
□ /new-releases 접근 → 페이지 정상 표시
□ 상단 BIG 히어로 카드 (첫 Featured 릴리즈 풀 블리드)
□ 서브타이틀: "PC · Console · Mobile — upcoming titles"
□ 릴리즈 카드 상단 gradient 커버 플레이스홀더 표시됨
□ is_featured=true 게임이 상단에 강조 표시됨
□ 플랫폼 배지 표시됨 (PC, PS5, Mobile 등)
□ 출시일 표시됨
```

### ✅ STEP 9 — Admin 패널 검증

```
□ /admin → 403 또는 리다이렉트 (보안)
□ /admin?secret=[ADMIN_SECRET] → 어드민 페이지 접근됨
□ /admin/console.html → Standalone Admin Console 로드 (Setup 화면)
□ Admin Console: Supabase URL + Service Role Key + Admin Secret + Site URL 입력 → Connect
□ Admin Console Events 탭: 이벤트 목록 + Add Event + 편집/삭제
□ Admin Console Crawlers 탭: 개별/전체 크롤러 실행 → 성공 토스트
□ POST /api/admin/crawl/fortnite (x-admin-secret) → 200 + events_added
□ POST /api/admin/crawl/fortnite (secret 없음) → 401
□ 이벤트 추가 → 캘린더에 표시됨
□ 이벤트 수정 → 반영됨
□ 이벤트 삭제 → 캘린더에서 사라짐
□ 크롤러 수동 실행 버튼 클릭 → "Crawl completed" 메시지
```

### ✅ STEP 9b — Admin Console (Standalone HTML)

```
□ /admin/console.html 접속 → Setup 화면 (data-testid="admin-setup-screen")
□ Supabase URL / Service Role Key / Admin Secret / Site URL 입력
□ [Connect & Enter Admin] 클릭 → Dashboard 탭 표시
□ Events 탭 → events-table에 이벤트 목록
□ Crawlers 탭 → run-crawler-fortnite 버튼으로 크롤 실행
□ Health 탭 → 데이터 품질 점수 표시
```

### ✅ STEP 10 — SEO + 성능 기본 확인

```
□ view-source:[URL] → <title>GAMECAL — Gaming Event Calendar...</title> 있음
□ og:image, og:description 메타태그 있음
□ Chrome DevTools → Network → 첫 로드 시간 3초 이내
□ /sitemap.xml → XML 파일 응답됨
□ /robots.txt → 내용 있음
```

---

## Cursor SESSION T1 — Playwright 설치 + Smoke Test

```
gamecal 프로젝트에 Playwright E2E 테스트를 설정해줘.

1. 설치:
  pnpm add -D @playwright/test
  pnpm playwright install

2. playwright.config.ts 생성:
  - baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  - timeout: 30000
  - retries: 2
  - reporter: ['html', 'list']
  - projects:
    * chromium (Desktop Chrome) — 1920×1080
    * firefox (Desktop Firefox)
    * Mobile Chrome — 375×812 (iPhone 14)
  - globalSetup: './tests/global-setup.ts'
  - outputDir: 'test-results/'
  - snapshotDir: 'tests/snapshots/'

3. tests/global-setup.ts:
  - 테스트 시작 전 환경변수 확인
  - PLAYWRIGHT_BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD 필요
  - 없으면 경고 출력 (실패시키지 않음)

4. tests/smoke.spec.ts — 30초 Smoke Test:
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/GAMECAL/)
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
  })
  
  test('today events visible to guest', async ({ page }) => {
    await page.goto('/')
    // 오늘 날짜 셀에 이벤트가 있어야 함 (seed 데이터 전제)
    const todayCell = page.locator('[data-testid="today-cell"]')
    await expect(todayCell).toBeVisible()
  })
  
  test('ICS feed returns calendar data', async ({ request }) => {
    const response = await request.get('/api/feed/fortnite')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('BEGIN:VCALENDAR')
  })

5. package.json에 스크립트 추가:
  "test:smoke": "playwright test tests/smoke.spec.ts --reporter=list",
  "test:e2e": "playwright test tests/e2e/ --reporter=html",
  "test:api": "playwright test tests/api/ --reporter=list",
  "test:visual": "playwright test tests/visual/ --reporter=html",
  "test:all": "playwright test --reporter=html",
  "test:report": "playwright show-report"

6. .env.test 파일 생성:
  PLAYWRIGHT_BASE_URL=https://gamecal.vercel.app
  TEST_USER_EMAIL=test@example.com
  TEST_USER_PASSWORD=Test123!
  ADMIN_SECRET=test-secret

7. tests/ 폴더 구조:
  tests/
  ├── smoke.spec.ts
  ├── global-setup.ts
  ├── helpers/
  │   ├── auth.ts         ← 로그인 helper
  │   └── seed-check.ts   ← DB 시드 확인
  ├── e2e/
  │   ├── guest.spec.ts
  │   ├── auth.spec.ts
  │   ├── calendar.spec.ts
  │   ├── event-panel.spec.ts
  │   ├── add-to-calendar.spec.ts
  │   └── settings.spec.ts
  ├── api/
  │   ├── feed.spec.ts
  │   └── events.spec.ts
  └── visual/
      └── screenshots.spec.ts

중요: 테스트는 실제 DB에 의존하므로, 테스트 실행 전
seed 데이터가 있다는 전제로 작성. 테스트 DB를 별도 생성하지 않음
(MVP 단계 — 프로덕션 DB에서 read-only 테스트).

data-testid 어트리뷰트를 다음 컴포넌트에 추가해줘:
- [data-testid="calendar-grid"]       → FullCalendar 외부 div
- [data-testid="today-cell"]          → 오늘 날짜 셀
- [data-testid="game-sidebar"]        → 왼쪽 게임 리스트
- [data-testid="event-panel"]         → 오른쪽 상세 패널
- [data-testid="signin-button"]       → 헤더 Sign In 버튼
- [data-testid="auth-modal"]          → Auth 모달
- [data-testid="add-to-calendar-btn"] → Add to Calendar 버튼
- [data-testid="copy-btn"]            → COPY 버튼
- [data-testid="settings-form"]       → 설정 폼
- [data-testid="blur-overlay"]        → 게스트 blur 레이어
```

---

## Cursor SESSION T2 — 전체 E2E 테스트 스위트

```
Playwright E2E 테스트 전체 시나리오를 구현해줘.

=== tests/helpers/auth.ts ===
// 로그인 helper (이메일/패스워드 방식)
export async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto('/')
  await page.click('[data-testid="signin-button"]')
  await page.waitForSelector('[data-testid="auth-modal"]')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
  await page.waitForSelector('[data-testid="calendar-grid"]')
}

// 로그아웃
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('text=Sign Out')
  await page.waitForSelector('[data-testid="signin-button"]')
}

=== tests/e2e/guest.spec.ts ===
// 게스트 UX 전체 테스트

test.describe('Guest experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('calendar grid is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
  })

  test('game sidebar shows 5 games', async ({ page }) => {
    const checkboxes = page.locator('[data-testid="game-sidebar"] input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(6) // All + 5 games
  })

  test('today cell is highlighted', async ({ page }) => {
    const todayCell = page.locator('.fc-day-today')
    await expect(todayCell).toBeVisible()
  })

  test('blur overlay visible on non-today dates', async ({ page }) => {
    await expect(page.locator('[data-testid="blur-overlay"]')).toBeVisible()
  })

  test('blur overlay has signup CTA', async ({ page }) => {
    await expect(page.locator('[data-testid="blur-overlay"]')).toContainText('Sign up')
  })

  test('sign in button visible in header', async ({ page }) => {
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible()
  })

  test('clicking blur overlay opens auth modal', async ({ page }) => {
    await page.click('[data-testid="blur-overlay"]')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })
})

=== tests/e2e/auth.spec.ts ===
// 인증 플로우 테스트

test.describe('Authentication', () => {
  test('auth modal opens on signin button click', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="signin-button"]')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })

  test('auth modal has Google and Email options', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="signin-button"]')
    await expect(page.locator('text=Continue with Google')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('email signup and login', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="signin-button"]')
    // 회원가입 탭으로 전환 (있다면)
    const signupTab = page.locator('text=Sign up')
    if (await signupTab.isVisible()) {
      await signupTab.click()
    }
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')
    // 로그인 성공 → 모달 닫힘
    await expect(page.locator('[data-testid="auth-modal"]')).not.toBeVisible({ timeout: 10000 })
  })

  test('logged in user sees all events (no blur)', async ({ page }) => {
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await expect(page.locator('[data-testid="blur-overlay"]')).not.toBeVisible()
  })

  test('logout works', async ({ page }) => {
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await logout(page)
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="blur-overlay"]')).toBeVisible()
  })
})

=== tests/e2e/calendar.spec.ts ===
// 캘린더 UI 테스트

test.describe('Calendar UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
  })

  test('month navigation forward', async ({ page }) => {
    const currentMonth = await page.locator('.fc-toolbar-title').textContent()
    await page.click('.fc-next-button')
    const nextMonth = await page.locator('.fc-toolbar-title').textContent()
    expect(nextMonth).not.toBe(currentMonth)
  })

  test('month navigation backward', async ({ page }) => {
    await page.click('.fc-next-button')
    const month = await page.locator('.fc-toolbar-title').textContent()
    await page.click('.fc-prev-button')
    const prevMonth = await page.locator('.fc-toolbar-title').textContent()
    expect(prevMonth).not.toBe(month)
  })

  test('Today button returns to current month', async ({ page }) => {
    await page.click('.fc-next-button')
    await page.click('.fc-next-button')
    await page.click('.fc-today-button')
    const todayCell = page.locator('.fc-day-today')
    await expect(todayCell).toBeVisible()
  })

  test('game filter - unchecking removes events', async ({ page }) => {
    // Fortnite 이벤트 먼저 확인
    const fortniteBefore = await page.locator('.fc-event[data-game="fortnite"]').count()
    
    // Fortnite 체크박스 해제
    await page.click('[data-testid="game-checkbox-fortnite"]')
    
    const fortniteAfter = await page.locator('.fc-event[data-game="fortnite"]').count()
    expect(fortniteAfter).toBeLessThan(fortniteBefore)
  })

  test('game filter - rechecking restores events', async ({ page }) => {
    await page.click('[data-testid="game-checkbox-fortnite"]') // 해제
    const count1 = await page.locator('.fc-event[data-game="fortnite"]').count()
    await page.click('[data-testid="game-checkbox-fortnite"]') // 재체크
    const count2 = await page.locator('.fc-event[data-game="fortnite"]').count()
    expect(count2).toBeGreaterThan(count1)
  })

  test('All checkbox unchecks all games', async ({ page }) => {
    await page.click('[data-testid="game-checkbox-all"]') // 전체 해제
    const events = await page.locator('.fc-event').count()
    expect(events).toBe(0)
  })

  test('mobile layout does not break (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
    // 스크롤 없이 헤더 보임
    await expect(page.locator('h1, [data-testid="header"]')).toBeVisible()
  })
})

=== tests/e2e/event-panel.spec.ts ===
// 이벤트 패널 + Add to Calendar 테스트

test.describe('Event Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    // 6월로 이동 (이벤트가 많은 달)
    await page.click('.fc-next-button')
  })

  test('clicking event opens detail panel', async ({ page }) => {
    const firstEvent = page.locator('.fc-event').first()
    await firstEvent.click()
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
  })

  test('panel shows event title', async ({ page }) => {
    await page.locator('.fc-event').first().click()
    const panel = page.locator('[data-testid="event-panel"]')
    await expect(panel.locator('h2, h3')).not.toBeEmpty()
  })

  test('panel shows date information', async ({ page }) => {
    await page.locator('.fc-event').first().click()
    const panel = page.locator('[data-testid="event-panel"]')
    // 날짜 정보가 있어야 함
    await expect(panel.locator('text=/2026/')).toBeVisible()
  })

  test('panel shows countdown timer', async ({ page }) => {
    await page.locator('.fc-event').first().click()
    const panel = page.locator('[data-testid="event-panel"]')
    await expect(panel.locator('text=/Ends in|Starts in|days|hours/')).toBeVisible()
  })

  test('close button dismisses panel', async ({ page }) => {
    await page.locator('.fc-event').first().click()
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
    await page.click('[data-testid="event-panel"] button[aria-label="Close"]')
    await expect(page.locator('[data-testid="event-panel"]')).not.toBeVisible()
  })

  test('Add to Calendar dropdown opens', async ({ page }) => {
    await page.locator('.fc-event').first().click()
    await page.click('[data-testid="add-to-calendar-btn"]')
    await expect(page.locator('text=Google')).toBeVisible()
    await expect(page.locator('text=Outlook')).toBeVisible()
    await expect(page.locator('text=iCal')).toBeVisible()
    await expect(page.locator('text=COPY')).toBeVisible()
  })

  test('Google Calendar link opens with correct params', async ({ page, context }) => {
    await page.locator('.fc-event').first().click()
    await page.click('[data-testid="add-to-calendar-btn"]')
    
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('text=Google')
    ])
    
    expect(newPage.url()).toContain('calendar.google.com')
  })

  test('iCal download works', async ({ page }) => {
    await page.locator('.fc-event').first().click()
    await page.click('[data-testid="add-to-calendar-btn"]')
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=iCal')
    ])
    
    expect(download.suggestedFilename()).toMatch(/\.ics$/)
  })

  test('COPY button copies Discord format to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.locator('.fc-event').first().click()
    await page.click('[data-testid="add-to-calendar-btn"]')
    await page.click('[data-testid="copy-btn"]')
    
    // Toast 메시지 확인
    await expect(page.locator('text=/Copied/')).toBeVisible()
    
    // 클립보드 내용 확인
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toContain('🎮')
    expect(clipboard).toContain('gamecal')
  })
})

=== tests/e2e/settings.spec.ts ===
// 설정 페이지 테스트

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await page.goto('/settings')
  })

  test('settings page loads with 5 sections', async ({ page }) => {
    await expect(page.locator('text=General')).toBeVisible()
    await expect(page.locator('text=Time Zone')).toBeVisible()
    await expect(page.locator('text=Calendar View')).toBeVisible()
    await expect(page.locator('text=Games')).toBeVisible()
    await expect(page.locator('text=Account')).toBeVisible()
  })

  test('timezone change is saved', async ({ page }) => {
    const tzSelect = page.locator('[name="timezone"]')
    await tzSelect.selectOption('America/Los_Angeles')
    await page.click('[data-testid="settings-save-btn"]')
    
    // 성공 토스트
    await expect(page.locator('text=/saved|updated/i')).toBeVisible()
    
    // 새로고침 후 설정 유지
    await page.reload()
    await expect(tzSelect).toHaveValue('America/Los_Angeles')
  })

  test('time format toggle works', async ({ page }) => {
    const formatToggle = page.locator('[name="time_format"]')
    await formatToggle.selectOption('24h')
    await page.click('[data-testid="settings-save-btn"]')
    await page.reload()
    await expect(formatToggle).toHaveValue('24h')
  })

  test('week starts on Monday changes calendar', async ({ page }) => {
    await page.locator('[name="week_starts_on"]').selectOption('1') // Monday
    await page.click('[data-testid="settings-save-btn"]')
    await page.goto('/')
    // 캘린더 첫 번째 컬럼 헤더가 Mon
    const firstDayHeader = page.locator('.fc-col-header-cell').first()
    await expect(firstDayHeader).toContainText(/Mon/i)
  })

  test('sign out works from settings', async ({ page }) => {
    await page.click('text=Sign Out')
    await page.waitForURL('/')
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible()
  })
})
```

---

## Cursor SESSION T3 — API 테스트 + 시각 회귀 + 성능

```
Playwright API 테스트, 시각 회귀 테스트, 성능 측정을 구현해줘.

=== tests/api/feed.spec.ts ===
// ICS 피드 API 테스트

import { test, expect } from '@playwright/test'

const GAMES = ['fortnite', 'wow', 'pokemon-go', 'genshin', 'lol', 'all']

for (const game of GAMES) {
  test(`GET /api/feed/${game} returns valid ICS`, async ({ request }) => {
    const response = await request.get(`/api/feed/${game}`)
    expect(response.status()).toBe(200)
    
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('text/calendar')
    
    const body = await response.text()
    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('VERSION:2.0')
    expect(body).toContain('BEGIN:VEVENT')
    expect(body).toContain('DTSTART')
    expect(body).toContain('END:VCALENDAR')
  })
}

test('invalid game slug returns 404', async ({ request }) => {
  const response = await request.get('/api/feed/invalid-game-xyz')
  expect(response.status()).toBe(404)
})

=== tests/api/events.spec.ts ===
// Events API 테스트

test('GET /api/events returns events array', async ({ request }) => {
  const response = await request.get('/api/events')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body.length).toBeGreaterThan(0)
})

test('GET /api/events?game=fortnite filters correctly', async ({ request }) => {
  const response = await request.get('/api/events?game=fortnite')
  const body = await response.json()
  for (const event of body) {
    expect(event.game_slug).toBe('fortnite')
  }
})

test('GET /api/events?start=2026-06-01&end=2026-06-30 returns June events', async ({ request }) => {
  const response = await request.get('/api/events?start=2026-06-01&end=2026-06-30')
  const body = await response.json()
  for (const event of body) {
    const start = new Date(event.start_at)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(5) // June (0-indexed)
  }
})

test('GET /api/games returns 5 games', async ({ request }) => {
  const response = await request.get('/api/games')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.length).toBeGreaterThanOrEqual(5)
})

test('Admin endpoint requires secret', async ({ request }) => {
  // secret 없이 접근
  const response = await request.get('/api/admin/events')
  expect([401, 403, 404]).toContain(response.status())
})

test('sitemap.xml is valid', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('<urlset')
  expect(body).toContain('<loc>')
})

test('robots.txt allows root', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('Allow: /')
  expect(body).toContain('Disallow: /admin')
})

=== tests/visual/screenshots.spec.ts ===
// 시각 회귀 테스트 (첫 실행 시 baseline 생성)

import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('homepage - guest view', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('homepage-guest.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,  // 5% 차이 허용
    })
  })

  test('event panel open', async ({ page }) => {
    // 로그인 후 이벤트 클릭
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await page.click('.fc-next-button') // 6월로
    await page.locator('.fc-event').first().click()
    await page.waitForSelector('[data-testid="event-panel"]')
    await expect(page).toHaveScreenshot('event-panel-open.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('settings page', async ({ page }) => {
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('settings-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('mobile - homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixelRatio: 0.05,
    })
  })
})

=== tests/performance.spec.ts ===
// Core Web Vitals 기본 성능 측정

test('homepage LCP under 3 seconds', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(3000)
})

test('no console errors on homepage', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // 알려진 무해한 에러 필터링
  const criticalErrors = errors.filter(e => 
    !e.includes('favicon') && 
    !e.includes('404') &&
    !e.includes('ServiceWorker')
  )
  expect(criticalErrors).toHaveLength(0)
})

test('calendar renders within 2 seconds after login', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="signin-button"]')
  const startTime = Date.now()
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL!)
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD!)
  await page.click('button[type="submit"]')
  await page.waitForSelector('[data-testid="calendar-grid"]')
  const renderTime = Date.now() - startTime
  expect(renderTime).toBeLessThan(2000)
})

=== tests/accessibility.spec.ts ===
// 기본 접근성 테스트

test('homepage has correct page title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/GAMECAL/)
})

test('images have alt text', async ({ page }) => {
  await page.goto('/')
  const images = page.locator('img:not([alt])')
  expect(await images.count()).toBe(0)
})

test('auth modal is keyboard accessible', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="signin-button"]')
  // Tab으로 이메일 필드 접근
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('name'))
  expect(['email', 'password']).toContain(focused)
})

=== 테스트 실행 방법 정리 ===

// README.md에 추가할 내용:
## Testing

### Setup
\`\`\`bash
cp .env.test .env.test.local
# TEST_USER_EMAIL, TEST_USER_PASSWORD 입력 (Supabase에 미리 가입된 계정)
\`\`\`

### Run Tests
\`\`\`bash
# Smoke (30초 - 배포 직후)
pnpm test:smoke

# 전체 E2E (8분)
pnpm test:e2e

# API only (2분)
pnpm test:api

# 전체 실행
pnpm test:all

# 리포트 보기 (브라우저 자동 오픈)
pnpm test:report
\`\`\`

### First Run (Visual Baseline 생성)
\`\`\`bash
pnpm playwright test tests/visual/ --update-snapshots
\`\`\`

### CI 환경
GitHub Actions .github/workflows/e2e.yml에 추가:
- push/PR 시 smoke test 자동 실행
- 매일 새벽 2시 전체 테스트 실행

중요: GitHub Actions 파일도 생성해줘:
.github/workflows/e2e.yml:
  name: E2E Tests
  on:
    push:
      branches: [main]
    pull_request:
    schedule:
      - cron: '0 17 * * *' # 매일 새벽 2시 KST
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
        - run: pnpm install
        - run: pnpm playwright install --with-deps chromium
        - run: pnpm test:all
          env:
            PLAYWRIGHT_BASE_URL: ${{ secrets.PLAYWRIGHT_BASE_URL }}
            TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
            TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
            NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
            NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: playwright-report
            path: playwright-report/
            retention-days: 7
```

---

## 내일 아침 테스트 실행 순서

```
배포 완료 후 → 아래 순서대로:

① 수동 QA (위 STEP 0~10, 약 20분)
   → 치명적 버그가 있으면 Cursor로 수정 먼저

② Supabase에 테스트 계정 생성
   → Supabase Auth → Users → "Invite user"
   → test@example.com / Test123! 으로 생성

③ .env.test.local 파일 작성:
   PLAYWRIGHT_BASE_URL=https://gamecal.vercel.app
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=Test123!

④ Smoke Test 실행 (30초):
   pnpm test:smoke
   → 3개 통과하면 기본 동작 OK

⑤ 시각 Baseline 생성 (최초 1회):
   pnpm playwright test tests/visual/ --update-snapshots
   → tests/snapshots/ 폴더에 기준 스크린샷 저장됨

⑥ 전체 테스트 실행 (~13분):
   pnpm test:all

⑦ 리포트 확인:
   pnpm test:report
   → 브라우저에서 통과/실패 시각화

⑧ 실패한 테스트 → 스크린샷/비디오로 원인 파악
   → test-results/ 폴더에 자동 저장됨
```

---

## 빠른 참조 — 테스트 커버리지 현황

| 영역 | 테스트 수 | 자동화 | 우선순위 |
|------|-----------|--------|---------|
| 게스트 UX | 6 | ✅ Playwright | HIGH |
| Auth 플로우 | 5 | ✅ Playwright | HIGH |
| 캘린더 UI | 8 | ✅ Playwright | HIGH |
| 이벤트 패널 | 7 | ✅ Playwright | HIGH |
| Add to Calendar | 4 | ✅ Playwright | HIGH |
| Settings | 5 | ✅ Playwright | MEDIUM |
| ICS 피드 API | 8 | ✅ Playwright API | HIGH |
| Events API | 6 | ✅ Playwright API | HIGH |
| 시각 회귀 | 4 | ✅ Screenshot | MEDIUM |
| 성능 | 3 | ✅ Playwright | MEDIUM |
| 접근성 | 3 | ✅ Playwright | LOW |
| Admin Console | 6 | ✅ Playwright | HIGH |
| Admin Crawl API | 4 | ✅ Shell + Playwright | HIGH |
| **총계** | **69** | **100%** | — |

---

## 데이터 검증 쿼리 (Supabase SQL Editor에서 실행)

```sql
-- 시드 데이터 확인
SELECT 
  g.name as game,
  COUNT(e.id) as event_count,
  MIN(e.start_at::date) as earliest,
  MAX(e.start_at::date) as latest
FROM games g
LEFT JOIN events e ON g.id = e.game_id
GROUP BY g.name
ORDER BY g.name;

-- 기대값:
-- Fortnite:       18~22개 이벤트
-- Genshin Impact: 10~15개 이벤트
-- League of Legends: 8~12개 이벤트
-- Pokémon GO:     12~18개 이벤트
-- World of Warcraft: 15~20개 이벤트

-- 날짜 범위 확인 (모두 5월 25일 ~ 7월 30일 사이여야 함)
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN start_at >= '2026-05-25' AND start_at <= '2026-07-30' THEN 1 END) as in_range,
  COUNT(CASE WHEN start_at < '2026-05-25' OR start_at > '2026-07-30' THEN 1 END) as out_of_range
FROM events;

-- 이벤트 타입 분포 확인
SELECT event_type, COUNT(*) 
FROM events 
GROUP BY event_type 
ORDER BY COUNT(*) DESC;

-- 오늘 날짜(2026-05-23) 이벤트 확인 (게스트에게 보여야 할 것들)
SELECT g.name, e.title, e.event_type, e.start_at, e.end_at
FROM events e
JOIN games g ON e.game_id = g.id
WHERE e.start_at::date <= CURRENT_DATE 
  AND (e.end_at::date >= CURRENT_DATE OR e.start_at::date = CURRENT_DATE)
  AND e.is_published = true
ORDER BY g.name, e.start_at;
```

---

---

## 🔄 새 기능 추가 시 테스트 업데이트 방법 (필수 규칙)

> **"코드 추가 = 테스트 추가"** — 기능 개발 후 반드시 함께 실행.
> Cursor 세션 끝에 `TEST_UPDATE_TEMPLATE.md` 블록을 붙여넣으면 자동 처리됩니다.

### A. 새 컴포넌트 추가 시

```
1. 모든 인터랙티브 요소에 data-testid 추가
   예: <button data-testid="subscribe-game">구독</button>

2. tests/e2e/ 해당 spec 파일에 테스트 추가 (최소 2개)
   - Happy path + Error/Edge case

3. 수동 QA 체크리스트 (STEP 1~6)에 항목 추가
   □ [새 기능]: {확인 방법 1줄}
```

### B. 새 API 엔드포인트 추가 시

```bash
# GAMECAL_Smoke_Test.sh (또는 Layer 3 API 테스트)에 추가:
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/{새경로}")
check "{설명}" "{예상코드}" "$STATUS"
```

### C. Cursor 세션에서 자동 처리

```
TEST_UPDATE_TEMPLATE.md 의 프롬프트 블록을
해당 Cursor 세션 끝에 붙여넣으세요.
Cursor가 data-testid + spec 파일 + 스모크 테스트 업데이트를 자동 수행합니다.
```

---

*GAMECAL 자동화 테스트 작업 지시서 · 2026-05-23*
*Cursor SESSION T1 → T2 → T3 순서로 진행 후 위 QA 체크리스트 실행*
*새 기능 추가 시: TEST_UPDATE_TEMPLATE.md 참고*
