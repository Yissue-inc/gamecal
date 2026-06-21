# ROAR × GamerClock — 세션 작업 싱크 (빌더용)

기준: 2026-06-20. CD/리뷰 세션 누적. 빌더가 이 문서로 전체 맥락을 동기화할 수 있게 정리.

## 브랜드/규제
- 사용자 노출명 = **"Summer Cup 2026"** (FIFA/"World Cup" 상표 회피). 내부 slug/API는 `world-cup` 호환 유지.
- 예측 = **무료 코인**(현금 베팅 아님). betting/odds/casino 표현 금지 → prediction.

## 레포 / 배포
- ROAR 게임 + GamerClock = **`/Users/ck/gamecal`** (Vercel, main 배포). 원본 에셋/소스 = `planb-lab`.
- 배포 후 ~1~2분 전파. **항상 `curl -s -o /dev/null -w '%{http_code}' https://gamerclock.com/...` 200 확인.**
- 로컬 `next start`가 `webpack-runtime MODULE_NOT_FOUND`(예: `./4492.js`) 내면 **stale `.next`** → `rm -rf .next && build`로 해결. 프로덕션 영향 없음.

## 에셋 (planb-lab → gamecal/public/mini-cup/assets 동기됨)
- 관중 국가색(B·피부톤 보존): `crowd/recolor/scarf-wall-{rw,bw,gy,ry,gr,kg}.webp` + `giant-flag-{...}`. nation→scheme = `CROWD_SCHEME_BY_CODE`/`nearestCrowdScheme`.
- 티포 27개국 `crowd/tifo/tifo-{code}.webp`. WC 뱃지 `badges/badge-wc|sc-01~09.png`. 마스코트 `mascot/mascot-*.png`(Roari).
- 프로모 `promo/keyvisual-16x9.webp`·`og-1200x630.png`·`hero-9x16-mobile.webp`. BGM `music/stadium-hype.wav`. SFX `sfx/*`.
- 공유 국기 이모지: `src/lib/flags.ts` (`flagFor()`).

## ROAR 게임 (gamecal/src/components/roar/RoarArena.tsx) — 완료/라이브
- 국가색(B 에셋 스왑), 게스트 우선 + 로그인 가치게이트(Save rank/Prediction/Settle/Claim).
- auth 퍼널: `roar_auth_gate_hit→roar_signin_prompt_viewed→auth_submitted→auth_success→roar_score_saved` + `roar_match_selected`/`roar_prediction_pick`, `auth_intent` 컨텍스트.
- 모바일: 탭/흔들기 하단 독, 전광판 중앙, 데드스페이스 압축, 상대 응원 띠.
- hydration 수정(onboarded/soundMuted useState 기본값+effect), 스테이지 러너 단계당 전진(`campaignStageProgress`).
- 최근(e8d753b): 90초 스코어 재동기화, 라이벌 스트립 실스코어 칩, 딥링크 팀복원 버그 수정, touch-action manipulation, combo/tifo/confetti 오버레이 cleanup, 단체보드 완성 트로피 풀스크린, AI 점수 0시작+엎치락뒤치락, 모바일 Bets 게이트 내부 스크롤.

## GamerClock /summer-cup — 완료/라이브 (CD 직접)
국기 전면, ROAR 국기 vs 카드, Play ROAR 글로우+Roari, 그룹 진출권 하이라이트, Loudest 막대, 골 칩, 헤더 스타디움 히어로 밴드, "On track to advance" 진출 티저, 라이브 경기 밴드, 홈 네비 바.

## 데이터
- `/api/roar/matches`, `/api/world-cup/matches` = openfootball 기반 `score.ft`/`goals1/goals2`. **최종 스코어 + 폴링**(진짜 실시간 아님). 인-매치 분/이벤트 라이브는 라이브 스코어 피드 업그레이드 필요(라이선스 확인).

## 메모리(크로스 세션)
`~/.claude/.../memory/roar-gamerclock-live.md` + `roar-live-game-fixes.md`(상세 변경 히스토리).
