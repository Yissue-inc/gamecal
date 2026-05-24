# GAMECAL — 게이머 감성 완전 정복 디자인 기획서
### "게이머가 탭을 닫지 않는 캘린더"
### 2026-05-23 · Cursor 구현 전 확정 스펙

---

## 0. 핵심 철학: 우리가 만드는 건 "캘린더 앱"이 아니다

> **"GAMECAL은 게이머의 두 번째 타임라인이다."**

게이머는 두 개의 시간을 동시에 산다.  
현실 시간 + 게임 시간(시즌, 리셋, 이벤트).  
GAMECAL은 이 두 시간을 하나의 인터페이스에서 보여주는 유일한 앱이다.

**경쟁 앱과 비교:**
| | Google Calendar | Wowhead | GAMECAL |
|--|--|--|--|
| 게임 이벤트 | ❌ | 한 게임만 | 9개+ |
| 멀티게임 | ❌ | ❌ | ✅ |
| 캘린더 뷰 | ✅ | ❌ | ✅ |
| 공유/바이럴 | 제한적 | ❌ | Discord/Reddit 포맷 |
| 감성 | 비즈니스 | 정보형 | **게이머 네이티브** |

---

## 1. 카피/톤 가이드 — "게이머 언어"로 말하기

서구 게이머(18~34, Discord 상주, Reddit r/gaming 활동)가 자연스럽게 읽는 언어.

### ❌ BAD vs ✅ GOOD 비교

| 상황 | ❌ 일반 캘린더 톤 | ✅ GAMECAL 톤 |
|------|-------------------|---------------|
| 시즌 종료 | "Season ends June 13" | "Season 3 vaults in **3 days**. Don't get caught sleeping." |
| 위클리 리셋 | "Weekly Reset - Tuesday" | "Reset hits in 6h. Finish your weeklies." |
| 새 시즌 | "Season 4 starts June 14" | "Season 4 drops tomorrow. New BP, new meta, touch grass first." |
| 토너먼트 | "MSI 2026 Finals" | "MSI Finals live — skip work, we won't tell." |
| 패치 | "Patch 16.12 released" | "16.12 is live. Kestrel just broke ranked. RIP climb." |
| 게스트 blur | "Sign up to see events" | "**47 events hidden.** Sign in — it's free, takes 10 seconds." |
| 빈 날 | (아무것도 없음) | "Quiet day. Farm materials. Touch grass. 🌿" |

### 카운트다운 언어 규칙
```
> 7일 남음  → "D-14" 스타일 (게이머 친숙)
1~7일 남음 → "3 days left" (체감 긴박감)
24시간 이내 → "Starts in 6h 30m" (시:분 실시간)
진행 중     → "🔴 LIVE" (빨간 점 + 텍스트)
종료됨      → "Ended · June 13" (회색 처리)
```

---

## 2. 캘린더 밀도 & 시각 계층 시스템

### 2-1. 이벤트 바 계층 (위에서 아래 순서)
```
[🏆 CRITICAL]  MSI 2026 — Grand Finals          ← 빨간 glow, 굵은 폰트
[🚀 HIGH    ]  Season 4 Begins                  ← 밝은 게임 색상
[🎉 NORMAL  ]  Summer Splash Event ──────────── ← 게임 색상, 가로 바
[🔄 LOW     ]  Weekly Reset                     ← 회색톤, 작은 글씨
```

### 2-2. 달력 셀 콘텐츠 우선순위
```
1순위: CRITICAL 이벤트 (항상 최상단)
2순위: 신규 게임 출시 이미지 (빈 셀 채움)
3순위: HIGH 이벤트 바
4순위: NORMAL 이벤트 바
5순위: LOW 이벤트 (접힘 처리, +N more)
```

### 2-3. 신규 출시 게임 이미지 — 달력 셀 인수
**핵심 아이디어**: 이벤트 없는 날 셀에 게임 출시 이미지가 채워진다.

```
┌─────────────────────┐
│ 30          D-7     │  ← 날짜 + D-day 뱃지
│ ┌─────────────────┐ │
│ │  [GAME KEY ART] │ │  ← 게임 커버 이미지 (object-fit: cover)
│ │                 │ │
│ │  Elden Ring:    │ │  ← 흰 텍스트 오버레이 (gradient bottom)
│ │  Nightreign     │ │
│ └─────────────────┘ │
└─────────────────────┘
```

**구현 스펙:**
- 출시일 셀에 `new_releases.image_url` 배경 이미지
- 이미지 없으면 `platform` 기반 그라디언트 플레이스홀더
- 타이틀 + 개발사 + D-day 카운트다운 오버레이
- 클릭 시 New Releases 상세 패널 (오른쪽 슬라이드)
- 달력 셀 내 이벤트 바들과 함께 표시 (이미지는 배경, 이벤트 바는 앞)

---

## 3. 게임별 컬러 시스템 (확정)

| 게임 | 브랜드 컬러 | 이벤트 바 bg | 텍스트 | 활용처 |
|------|-------------|-------------|--------|--------|
| Fortnite | `#00d4ff` | `#00d4ff20` | `#00d4ff` | 사이드바 도트, 이벤트 바 |
| Apex Legends | `#e33c3c` | `#e33c3c20` | `#ef8080` | — |
| Valorant | `#ff4655` | `#ff465520` | `#ff8090` | — |
| League of Legends | `#c89b3c` | `#c89b3c20` | `#e6bb6a` | — |
| Destiny 2 | `#4f91cd` | `#4f91cd20` | `#7db3e0` | — |
| Diablo IV | `#b45309` | `#b4530920` | `#d97706` | — |
| World of Warcraft | `#f59e0b` | `#f59e0b20` | `#fbbf24` | — |
| Pokémon GO | `#eab308` | `#eab30820` | `#fcd34d` | — |
| Genshin Impact | `#4ade80` | `#4ade8020` | `#86efac` | — |

**컬러 원칙:**
- 이벤트 바 배경: 브랜드 컬러 + `20` (12.5% 투명도)
- 이벤트 바 왼쪽 border: 브랜드 컬러 100%
- 텍스트: 브랜드 컬러 lightened (가독성)
- Critical: 레드 glow 오버라이드

---

## 4. 모바일 ↔ 데스크탑 전환 경험

### 4-1. 브레이크포인트별 레이아웃
```
데스크탑 (≥1024px):
┌──────────────┬─────────────────────┬──────────────┐
│  사이드바    │     캘린더          │  상세 패널   │
│  260px 고정  │     flex-1          │  380px (열릴때) │
└──────────────┴─────────────────────┴──────────────┘

태블릿 (768~1023px):
┌──────┬───────────────────────────────────────────┐
│사이드│           캘린더 (전체 너비)               │
│바 접힘│                                          │
└──────┴───────────────────────────────────────────┘

모바일 (<768px):
┌─────────────────────────────────────────────────┐
│        캘린더 (전체 너비)                        │
│  게임 필터: 가로 스크롤 칩 (상단 고정)           │
└─────────────────────────────────────────────────┘
           ↓ 이벤트 클릭
┌─────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓ 바텀 시트 (85vh) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│  [게임 아이콘] Fortnite                          │
│  🏆 MSI 2026 — Grand Finals                     │
│  ────────────────────────                        │
│  📅 June 20 · 12:00 PM UTC                      │
│  ⏳ Starts in 3h 20m                            │
│  [Watch Live] [Add to Cal] [Share]               │
└─────────────────────────────────────────────────┘
```

### 4-2. 모바일 전용: 가로 스크롤 게임 칩
```tsx
// 사이드바 대신 상단에 가로 스크롤 칩
<div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
  {games.map(game => (
    <button
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition-all
        ${selected ? 'text-white border-transparent' : 'text-zinc-400 border-zinc-700'}`}
      style={selected ? { backgroundColor: game.brand_color } : {}}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: game.brand_color }} />
      {game.name}
    </button>
  ))}
</div>
```

---

## 5. 공유 UX — Discord/Reddit 포맷

### 5-1. 이벤트 상세 패널 공유 버튼
```
[📋 Copy]  [Discord]  [Reddit]  [𝕏]
```

### 5-2. Discord 포맷 (코드 블록 스타일)
```
🔴 **MSI 2026 — Grand Finals**
> 🎮 League of Legends · Tournament
> 📅 June 20, 2026 · 12:00 PM UTC
> ⏳ Starts in 3 days
> 🔗 https://gamecal.io/lol/events/msi-2026-finals

Track all LoL events → gamecal.io/lol
```

### 5-3. Reddit 포맷 (마크다운 테이블)
```markdown
**MSI 2026 Grand Finals — Add to your calendar!**

| | |
|---|---|
| 🎮 Game | League of Legends |
| 📅 Date | June 20, 2026 |
| 🕐 Time | 12:00 PM UTC |
| 📍 Source | [Riot Official](https://...) |

*via [GAMECAL](https://gamecal.io) — the gaming event calendar*
```

### 5-4. Plain Text (DM/iMessage용)
```
MSI 2026 Finals — June 20 @ 12 PM UTC
LoL tournament | gamecal.io/lol
```

### 5-5. 구현 — CopyShare 컴포넌트
```tsx
// src/components/calendar/ShareEvent.tsx
export function ShareEvent({ event, game }: { event: GameEvent; game: Game }) {
  const [copied, setCopied] = useState<string | null>(null)

  const formats = {
    discord: `🔴 **${event.title}**\n> 🎮 ${game.name} · ${getEventTypeLabel(event.event_type)}\n> 📅 ${formatDateRange(event.start_at, event.end_at)}\n> 🔗 ${event.source_url}\n\nTrack all ${game.name} events → gamecal.io/${game.slug}`,
    reddit: `**${event.title}**\n\n| | |\n|---|---|\n| 🎮 Game | ${game.name} |\n| 📅 Date | ${formatDateRange(event.start_at, event.end_at)} |\n| 📍 Type | ${getEventTypeLabel(event.event_type)} |\n\n*via [GAMECAL](https://gamecal.io)*`,
    plain: `${event.title} — ${formatDateRange(event.start_at, event.end_at)}\n${game.name} | gamecal.io/${game.slug}`,
  }

  const copy = (type: keyof typeof formats) => {
    navigator.clipboard.writeText(formats[type])
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex gap-2">
      {(['discord','reddit','plain'] as const).map(type => (
        <button key={type} onClick={() => copy(type)}
          className="flex-1 rounded-md border border-zinc-700 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-white transition-all">
          {copied === type ? '✓ Copied!' : type === 'discord' ? '💬 Discord' : type === 'reddit' ? '🤖 Reddit' : '📋 Copy'}
        </button>
      ))}
    </div>
  )
}
```

---

## 6. 광고 지면 티어 시스템 (Ad Inventory)

### 개요 — GAMECAL 광고 철학
> 게이머는 배너 광고를 차단한다. 우리는 **광고가 콘텐츠가 되는** 구조를 만든다.

게임사 입장: "우리 출시일이 캘린더에서 이렇게 보이다니!"  
게이머 입장: "어, 이 게임 출시일이 달력에 있네. 클릭해봐야지."

---

### 📊 광고 티어 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│  💎 DIAMOND TIER — Homepage Cinematic Takeover          │  $15,000~30,000 / campaign
├─────────────────────────────────────────────────────────┤
│  🥇 PLATINUM TIER — Pinned Game Slot                    │  $5,000~8,000 / month
├─────────────────────────────────────────────────────────┤
│  🥈 GOLD TIER — Calendar Cell Release Art               │  $2,000~4,000 / month
├─────────────────────────────────────────────────────────┤
│  🥉 SILVER TIER — Event Panel Sponsor                   │  $800~1,500 / month
├─────────────────────────────────────────────────────────┤
│  🟤 BRONZE TIER — Featured New Release Slot             │  $300~500 / month
└─────────────────────────────────────────────────────────┘
```

---

### 🥉 BRONZE — Featured New Release Slot
**위치**: `/new-releases` 페이지 Featured 섹션 상단  
**형태**: "Sponsored" 뱃지 + 우선 노출 순서  
**가격**: $300~500 / month  

```
[SPONSORED]
┌──────────────────────────────────┐
│  [GAME KEY ART — full color]     │
│  Grand Theft Auto VI             │
│  Rockstar Games                  │
│  Sept 17 · PS5 · Xbox    D-117  │
└──────────────────────────────────┘
```
- 일반 Featured 카드 동일한 형태, 순서만 최상단 고정
- 작은 "Sponsored" 라벨 (투명하게)
- 게이머에게 거부감 최소

---

### 🥈 SILVER — Event Panel Sponsor
**위치**: 이벤트 클릭 → 우측 상세 패널 하단 영역  
**형태**: 관련 게임 광고 카드 (게임 출시 / DLC / 굿즈 등)  
**가격**: $800~1,500 / month  

```
이벤트 패널 하단:
┌─────────────────────────────────┐
│ ─────── Sponsored ──────────── │
│ [이미지]  Season Pass — 20% off │
│           Claim on Epic Games   │
│           [Get Deal →]          │
└─────────────────────────────────┘
```
- 게임 이벤트와 동일 게임의 광고만 매칭 (Fortnite 이벤트 → Fortnite V-Bucks 광고)
- 관련성 높아 클릭률 높음
- CPC + CPM 혼합 과금

---

### 🥇 GOLD — Calendar Cell Release Art
**위치**: 달력 빈 날짜 셀 (이벤트 없는 날)  
**형태**: 게임 커버 아트가 달력 셀 자체를 채움  
**가격**: $2,000~4,000 / month (출시일 기준 D-30 ~ D+7)  

```
┌──────────────────────┐
│  26          D-7     │
│ ╔════════════════╗   │
│ ║  [KEY ART]     ║   │
│ ║                ║   │
│ ║  Elden Ring:   ║   │
│ ║  Nightreign    ║   │
│ ║  [Pre-order →] ║   │
│ ╚════════════════╝   │
└──────────────────────┘
```
- 출시 전 D-30부터 노출 시작
- 출시일(D-0) 셀에 특별 하이라이트 애니메이션
- 클릭 시 Pre-order / Steam 페이지 외부 링크
- **이것이 핵심 광고 상품** — 게이머가 자연스럽게 인지

---

### 🥇 PLATINUM — Pinned Game Slot (사이드바)
**위치**: 사이드바 게임 목록 최상단 "FEATURED" 섹션  
**형태**: 게임 로고 + 브랜드 컬러 배경 카드 형태  
**가격**: $5,000~8,000 / month  

```
사이드바:
┌────────────────────────────────┐
│ ★ FEATURED                     │
│ ┌──────────────────────────┐  │
│ │ [게임 로고]               │  │
│ │  Grand Theft Auto VI      │  │
│ │  Coming Sep 17 · PS5/Xbox │  │
│ │  [View Events →]          │  │
│ └──────────────────────────┘  │
│ ─────────────────────────      │
│ GAMES                          │
│ ☑ ● Fortnite                   │
│ ☑ ● Apex Legends               │
│ ...                             │
└────────────────────────────────┘
```
- 클릭 시 해당 게임 이벤트만 필터링된 캘린더 뷰
- 게임사 브랜드 컬러로 카드 스타일링
- 반짝이는 border animation 옵션

---

### 💎 DIAMOND — Homepage Cinematic Takeover
**위치**: 홈페이지 진입 시 전체 화면 (3~5초, Skip 가능)  
**형태**: 게임 세계관 기반 풀스크린 시네마틱 애니메이션  
**가격**: $15,000~30,000 / campaign (1~2주 노출)  

**WoW 예시 (별첨 HTML 데모 참조)**:
- 검은 화면에서 시작 → 시네마틱 바 등장
- 용이 화면을 대각선으로 가로지름 (파티클 + 불꽃)
- "World of Warcraft — Patch 11.2 Available Now"
- "Add to GAMECAL" CTA 버튼
- 5초 후 자동 닫힘 or Skip 버튼

**다른 게임 예시:**
| 게임 | 시네마틱 컨셉 |
|------|---------------|
| Fortnite | 하늘에서 배틀버스가 지나가며 캐릭터들이 낙하 |
| Apex Legends | 우주선이 킹스캐년 위를 스치며 전투 소리 |
| Valorant | 네온 라인이 화면을 가로지르며 에이전트 실루엣 등장 |
| Diablo IV | 불꽃이 아래서 위로 타오르며 악마 눈이 나타남 |
| LoL | 소환사 균열이 갈라지며 챔피언 스킬 이펙트 |

**노출 규칙:**
- 동일 기기 24시간 1회 (쿠키 기반)
- Skip 버튼: 우상단 "Skip →" (0.5초 후 활성화)
- 모바일: 간소화 버전 (전체화면 이미지 + 텍스트)
- 접근성: `prefers-reduced-motion` 시 정적 이미지 표시

---

## 7. 광고 수익 모델 추정

| 티어 | 월 가격 | 월 최대 슬롯 | 월 최대 수익 |
|------|---------|--------------|-------------|
| Bronze | $400 avg | 6개 | $2,400 |
| Silver | $1,000 avg | 4개 | $4,000 |
| Gold | $3,000 avg | 8개 (게임 출시일) | $24,000 |
| Platinum | $6,000 avg | 2개 (사이드바 공간) | $12,000 |
| Diamond | $20,000 avg | 2 campaigns | $40,000 |
| **합계** | | | **~$82,000/월** |

*MAU 50,000 도달 시 현실적 목표치*

---

## 8. 즉시 구현할 것들 (MVP 광고 없이도)

Phase 1에서 **무료로** 해야 할 "광고처럼 보이게 만들기":

1. **출시 게임 이미지 = 달력 셀 배경** (Gold Tier의 오가닉 버전)
   - `new_releases` 테이블에 `image_url`, `hero_color` 컬럼 추가
   - Supabase Storage에 커버 이미지 업로드
   - 달력 셀에 배경 이미지로 렌더링

2. **New Releases 페이지 히어로 이미지** 
   - 상단 BIG 카드 (첫 번째 featured release)
   - 게임 아트 풀 블리드 이미지

3. **이벤트 패널 게임 이미지**
   - 상세 패널 상단에 게임 스크린샷/아트

이 세 가지만 해도 "광고 지면"의 실제 가치를 게임사에 보여줄 수 있음.

---

## 참고: `/ad-deck` 페이지 추후 구현

게임사 영업용 광고 소개 페이지:
- 각 티어별 미리보기 (실제 GAMECAL UI 위에 광고 오버레이)
- 예상 노출수 & CTR 추정
- "Book a Slot" → Calendly/이메일 연결
