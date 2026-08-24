# 낚시 미니도전 이식 인수인계서

대상: Wave Village Fishing Log의 **낚시 중 미니도전과 마지막 슬라이더 판정**만 다른 게임에 재사용할 때의 기술·기획 기준이다. 항구 이동, 수족관, 상점, 보상 UI는 범위에서 제외한다.

현재 구현체: [`public/mini-games/wave-village-fishing/game.js`](../public/mini-games/wave-village-fishing/game.js)

## 1. 한 판의 상태 흐름

```text
waiting ──(입질 발생)──> bite ──(한 번 입력)──> reel
   │                         │                      │
   │                         └─ 3초 초과 ─> failure │
   │                                                │
   │                                 릴 목표 달성 ─┴──> skill (확률)
   │                                                       │
   │                                           성공 ──────┘
   │                                                       v
   └──────────────────────────────────────────────> aim (슬라이더)
                                                            │
                                              성공 ─> catch/reward
                                              실패 ─> failure
```

실제 상태 이름은 `mode`이며, 한 판에 필요한 값은 `fishing` 객체에 넣는다. 다른 게임으로 옮길 때도 전역 UI 상태와 미니게임 상태를 분리하고, 각 단계 진입 시 필요한 값만 초기화하는 구조를 권장한다.

| 상태 | 진입 조건 | 플레이어 행동 | 제한 시간 | 다음 상태 |
| --- | --- | --- | --- | --- |
| `waiting` | 캐스팅 완료 | 대기 | 일반 1.8~4.2초 뒤 입질 | `bite` |
| `bite` | 입질 발생 | 버튼/Space 한 번 | 3초 | `reel` 또는 `failure` |
| `reel` | 훅 성공 | 연타 | 일반 6.8초 | `skill` 또는 `aim` |
| `skill` | 고난도 물고기 또는 확률 | 유형별 선택 | 일반 9~10초 | `aim` 또는 `failure` |
| `aim` | 릴 또는 미니도전 성공 | 노란 범위에서 한 번 멈춤 | 일반 최대 20초 | 보상 또는 `failure` |
| `failure` | 시간 초과/오답/범위 이탈 | 결과를 읽고 복귀 | 자동 전환 없음 | 허브 또는 재시도 |

### 반드시 지킬 전환 규칙

1. 단계마다 `runId`(또는 `encounterId`)를 증가시킨다.
2. 비동기 콜백은 실행 시점에 `runId`가 현재 판과 같은지 검사한다.
3. 이전 단계의 `setTimeout`은 다음 판으로 넘어갈 때 취소한다.
4. 연타 단계에서 마지막 판정으로 바뀔 때는 입력 잠금 시간을 둔다. 그렇지 않으면 마지막 연타가 슬라이더 정지 입력으로 누적된다.
5. 실패를 1~2초 뒤 자동으로 닫지 않는다. 특히 모바일에서는 사용자가 결과를 읽기 전에 다음 화면이 열려 “버그처럼 사라진다”고 느낀다.

현재 게임은 위 원칙을 `castLine()`의 `runId`, `failureReturnTimer` 취소, 최종 `fail()`의 수동 복귀로 적용한다. 이식 시에는 동일 이름보다 이 원칙을 유지하는 것이 중요하다.

## 2. 공통 난이도 입력값

물고기 또는 보상 대상마다 아래 데이터를 둔다. 일반 아이템 보상에는 기본값을 사용한다.

```ts
type CatchDifficulty = {
  score: number;      // 희귀도/보상 가치. 릴과 미니도전 확률의 기준
  grade: 'C' | 'B' | 'A' | 'S' | 'SS' | 'LEGEND' | 'MYTHIC';
  need: number;       // 기본 릴 연타 수
  aimWidth: number;   // 슬라이더 성공 구간 비율 (0~1)
  aimSpeed: number;   // 슬라이더 왕복 속도
  aimTime: number;    // 슬라이더 제한 시간(ms)
};
```

현재 일반 물고기는 대략 `need 8~12`, `aimWidth 0.44~0.50`, `aimSpeed 0.0017~0.0022`다. 전설은 `need 30+`, `aimWidth 0.16~0.19`, `aimSpeed 0.005~0.006`대로 잡는다.

### 릴 목표 수 공식

```js
tension = clamp((fish.score - 100) / 1950, 0, 1)
need = clamp(
  ceil(fish.need + tension * 6 - rod.power * 1.2 - timeAttackBonus),
  normalMin,
  normalMax
)
```

- 일반 모드: `normalMin=9`, `normalMax=28`, 제한 6.8초.
- 타임어택: `normalMin=5`, `normalMax=20`, `timeAttackBonus=6`, 제한 4.7초.
- 낚싯대 보정은 난이도를 완전히 무너뜨리지 않도록 연타 수 2~3회 정도로 제한한다.

### 슬라이더 폭/속도 공식

```js
gradeWidth = {
  C: .36, B: .31, A: .26, S: .22,
  SS: .19, LEGEND: .16, MYTHIC: .13
}[fish.grade]

aimWidth = clamp(
  (gradeWidth + rod.power * .009 + timeAttackBonus) * random(.86, 1.00),
  .12,
  .42
)

aimSpeed = clamp(
  fish.aimSpeed * (1.9 + tension * .68) * random(.94, 1.26) + timeAttackBonus,
  .0031,
  .0088
)
```

`random()`을 쓰는 이유는 같은 어종이라도 매번 완전히 외운 타이밍으로 끝나지 않게 하기 위해서다. 다만 폭과 속도 변동을 15~30% 안에 묶어 억울함을 막는다.

## 3. 슬라이더(마지막 끌어올리기)

### 플레이 경험

1. 릴이 끝나면 “연타를 멈추세요”를 명확하게 알린다.
2. 1.85초(타임어택 0.85초) 동안 버튼을 잠근다.
3. 흰 커서가 좌우 왕복한다.
4. 노란 목표 범위 위에서 플레이어가 **한 번만** 누른다.
5. 범위 안이면 보상, 밖이면 실패 화면으로 간다.

### 위치 계산

커서는 사인파를 이용해 0→1→0을 부드럽게 반복한다. CSS animation만으로 만들지 말고 게임 루프의 시간값으로 계산해야 판정 위치와 화면 위치가 항상 일치한다.

```js
const elapsed = now - aimStart;
aimValue = (Math.sin(elapsed * aimSpeed - Math.PI / 2) + 1) / 2;
cursor.style.left = `${aimValue * 100}%`;

const hit = Math.abs(aimValue - aimTarget) <= aimWidth / 2;
```

목표 범위의 시작점은 `aimTarget - aimWidth / 2`, 끝점은 `aimTarget + aimWidth / 2`다. 목표 중심은 보통 `0.20~0.80` 안에서 뽑아 화면 가장자리의 불공정한 난이도를 피한다.

### 이식 의사코드

```js
function startAim(catchInfo, runId) {
  state = 'aim';
  aim.lockUntil = now + 1850;
  aim.startAt = aim.lockUntil;
  aim.target = random(.20, .80);
  aim.width = makeAimWidth(catchInfo);
  aim.speed = makeAimSpeed(catchInfo);
  aim.deadline = now + 20000;
  showAimUI({ locked: true });

  setTimeout(() => {
    if (state === 'aim' && activeRunId === runId) unlockAimUI();
  }, 1890);
}

function onAimPress() {
  if (now < aim.lockUntil) return showHint('연타를 멈추고 잠시 기다려요.');
  const success = Math.abs(aim.value - aim.target) <= aim.width / 2;
  success ? grantReward() : enterFailure('range');
}
```

### QA 체크

- 릴 마지막 연타가 슬라이더 실패로 처리되지 않는가.
- 잠금 중 탭은 성공/실패/복귀를 일으키지 않는가.
- 고등급일수록 목표가 좁고 커서가 빨라지는가.
- 커서의 시각 위치와 실제 판정 값이 같은가.
- 슬라이더 실패 뒤 보상 창이 뜨지 않는가.

## 4. 릴 연타

릴은 “짧은 집중력”을 만드는 보조 기믹이다. 공격적으로 빠른 연타를 요구하지 말고, 화면 버튼과 Space 모두 한 번의 `reel()`로 합류시킨다.

```js
function reel() {
  if (state === 'bite') return hook();
  if (state !== 'reel') return;
  progress += 1;
  renderReel(progress / need);
  if (progress >= need) startSkillOrAim();
}
```

- 모바일: 버튼을 충분히 크게 두고, 더블 탭 확대를 막는다.
- 키보드: `Space` 기본 지원.
- 입력 과다: 완료 시 즉시 `state`를 바꾸고 다음 단계의 잠금 시간을 둔다.
- 실패: 제한 시간이 끝날 때만 실패한다. 누르는 속도가 느리다고 중간 실패시키면 어린 플레이어에게 불친절하다.

## 5. 추가 미니도전 5종

모든 미니도전은 `skill` 상태로 실행하며, 성공 후 `completeSkill()` → 330ms 연출 → 슬라이더로 이어진다. 오답 또는 시간이 끝나면 `skillFail()` → `failure`다.

### 5.1 구슬 기억하기 (`memory`)

- 표시: 빨강/노랑/파랑/초록 구슬 2~5개 순서를 3초 보여준다.
- 입력: 4개 색 버튼을 같은 순서로 누른다.
- 성공: 모든 인덱스가 패턴과 일치.
- 실패: 한 번이라도 다른 색을 누르거나 제한 시간 초과.
- 데이터: `skillPattern: number[]`, `skillStep`.
- 난이도: `patternLength = 2 + floor(tension * 2) + random(0 or 1)`; 최대 5.

어린 플레이어용 기본값은 2~3개를 추천한다. 색각 이상 접근성을 위해 색만 쓰지 말고 작은 아이콘/문양을 함께 넣는다.

### 5.2 거품 톡톡 (`bubble`)

- 표시: 3×3 격자, 빛나는 거품 1개와 일반 거품 8개.
- 입력: 빛나는 거품만 누른다. 성공할 때마다 목표 위치를 다시 뽑는다.
- 성공: `skillGoal`번 연속 정답.
- 실패: 일반 거품 클릭 또는 시간 초과.
- 데이터: `skillTarget`, `skillStep`, `skillGoal`.
- 난이도: `skillGoal=3~5`; 희귀할수록 4~5로 비중을 올린다.

같은 칸이 연속으로 나오면 단조로울 수 있으므로, 직전 목표와 다른 칸을 우선 뽑는 개선을 권장한다.

### 5.3 물살 읽기 (`current`)

- 표시: 중앙에 방향 화살표 한 개, 아래에 ↑/→/↓/← 버튼.
- 입력: 표시와 같은 방향을 선택한다.
- 성공: 정답을 고를 때마다 새 방향, 목표 횟수 달성.
- 실패: 다른 방향 선택 또는 시간 초과.
- 데이터: `skillTarget`(0~3), `skillStep`, `skillGoal`.

반사신경형이지만 글을 읽지 않아도 된다. 버튼 순서는 고정해 학습 기회를 남긴다.

### 5.4 안전한 그물 (`net`)

- 표시: 6칸 중 물고기 아이콘이 있는 안전한 그물 1개, 바위 아이콘이 있는 위험 그물 5개.
- 입력: 물고기 쪽 그물을 선택한다.
- 성공/실패: 거품 톡톡과 동일.
- 데이터: `skillTarget`(0~5), `skillStep`, `skillGoal`.

시각적 차이를 아이콘·색·테두리 세 겹으로 제공한다. 바위와 물고기의 크기를 지나치게 작게 만들지 않는다.

### 5.5 파도 세기 (`count`)

- 표시: `〰` 2~5개를 약 2.2초 보여준다.
- 입력: 2/3/4/5 버튼 중 본 개수를 고른다.
- 성공: 한 번 정답이면 완료.
- 실패: 오답 또는 시간 초과.
- 데이터: `skillCount`, `skillStep=-1`(암기 표시 단계).

이 기믹은 기억하기보다 진입 장벽이 낮아 C~B급 또는 첫 10분 경험에 적합하다.

## 6. 어떤 미니도전을 띄울지 결정하는 법

현재 규칙은 물고기 `score`를 기준으로 한다.

```js
challengeChance = score >= 1200 ? 1
  : score >= 600 ? .72
  : .42;
```

- 일반 물고기: 약 42%만 추가 기믹. 매 판이 길어지는 것을 막는다.
- 중상급: 약 72%.
- 전설급: 100%. 전설을 잡았다는 긴장감을 보장한다.

다른 게임에 이식할 때는 “보상이 클수록 모든 단계를 통과해야 한다”는 의미만 유지하면 된다. 보상 품질, 스테이지, 콤보 등에 맞춰 확률을 바꿔도 된다.

## 7. 시간 제한 및 실패 UX

| 구간 | 일반 | 타임어택 | 실패 사유 키 |
| --- | ---: | ---: | --- |
| 입질 반응 | 3초 | 3초 | `time` |
| 릴 | 6.8초 | 4.7초 | `time` |
| 미니도전 | 9~10초 | 5~6초 | `skill` |
| 슬라이더 | 20초 | 7.2초 | `range`/`time` |

실패 화면은 다음을 모두 보여준다.

1. 무엇이 실패했는지: 시간, 오답, 노란 구역 바깥.
2. 다음 행동 하나: `다시 부두로` 또는 `재도전`.
3. 처벌 없음: 미끼를 이미 소비했는지 여부는 기획적으로 명시한다. 현재 게임은 캐스팅 시 미끼를 소비한다.

자동 복귀는 피한다. 특히 모바일 화면 캡처·브라우저 지연·손가락 이동 때문에 실패 메시지가 1초 내 사라지면 실제 버그처럼 보인다.

## 8. 입력 및 화면 구현 계약

### 단일 입력 관문

화면 버튼과 키보드 입력을 각각 다른 로직에 연결하지 말고 `action()` → 현재 상태별 처리로 한 곳에 모은다.

```js
switch (state) {
  case 'bite': return hook();
  case 'reel': return reel();
  case 'aim': return stopAim();
  case 'skill': return showSkillHint();
  case 'failure': return returnToHub();
}
```

### DOM 권장 구조

- `actionButton`: 입질/릴/슬라이더/실패 복귀에 공용으로 사용.
- `meter`: 릴 게이지와 슬라이더가 공유하되 `aim` 클래스로 스타일을 분기.
- `skillPanel`: 미니도전 전용 모달. 슬라이더와 동시에 열지 않는다.
- `interactionBar`: 지금 해야 할 행동을 한 문장으로 말한다.

모바일에서 버튼이 가려지지 않도록, 상단 HUD·중앙 게임판·하단 행동 버튼·최하단 설명을 별도 레인으로 고정한다.

## 9. 이식 전 QA 시나리오

1. 일반 보상으로 입질 → 릴 → 슬라이더 → 성공.
2. 일반 보상으로 슬라이더 범위 밖 클릭 → 실패 설명 확인 → 수동 복귀.
3. 희귀 보상으로 릴 → 다섯 미니도전 각각 성공 → 슬라이더.
4. 각 미니도전에서 오답/시간 초과 → 보상 미지급 확인.
5. 릴 마지막 10연타를 계속한 채 슬라이더 진입 → 잠금 동안 실패하지 않는지 확인.
6. 실패 후 즉시 다음 캐스팅 → 이전 타이머가 새 판을 종료하지 않는지 확인.
7. 390×844 모바일, 태블릿, 데스크톱에서 버튼과 텍스트가 겹치지 않는지 확인.
8. 키보드 Space와 터치 버튼이 완전히 동일한 결과를 내는지 확인.
9. 타임어택에서는 축소된 시간과 목표 수가 적용되는지 확인.
10. 20회 연속 플레이에서 보상/실패/다음 판 전환이 한 번도 멈추지 않는지 확인.

## 10. 이식 시 리팩터링 권장 사항

현재 게임 파일은 기능 추가 과정에서 같은 이름의 함수 선언이 여러 번 남아 있다. JavaScript에서는 마지막 선언이 실제로 적용되므로, 다른 게임으로 복사하지 말고 아래처럼 모듈을 나눈다.

```text
fishing/
  state-machine.ts       // 상태 전환, runId, 타이머 취소
  reel-challenge.ts      // 목표 횟수, 게이지
  aim-challenge.ts       // 슬라이더 수학과 판정
  skill-challenges.ts    // memory/bubble/current/net/count
  difficulty.ts          // 어종·보상별 난이도 데이터와 공식
  reward-resolver.ts     // 보상 확률과 결과 지급
  fishing-ui.ts          // DOM/Canvas 표시만 담당
```

이렇게 분리하면 신규 미니도전을 추가할 때 상태 전환과 보상 지급을 건드리지 않아도 되고, 각 기믹을 독립 테스트할 수 있다.

## 11. 추가 미니도전 10종과 난이도 배정 (v35)

기존 5종(`memory`, `bubble`, `current`, `net`, `count`)에 아래 10종을 추가했다. 모두 한 번의 정답으로 끝나는 쉬운 관찰형부터, 여러 번 연속 정답이 필요한 전설형까지 한 상태 머신(`skill`)으로 처리한다.

| 키 | 플레이어가 하는 일 | 적용 난이도 |
| --- | --- | --- |
| `shell` | 위에 보인 조개와 같은 조개를 고른다 | 쉬움 |
| `sonar` | 소나 파형과 같은 신호를 고른다 | 보통·전설 |
| `knot` | 밧줄 매듭 수를 세어 고른다 | 보통 |
| `depth` | 잠깐 보인 수심 표시를 기억해 고른다 | 보통 |
| `compass` | 화살표 순서를 외워 다시 누른다 | 어려움·전설 |
| `tide` | 물살 표식과 같은 표식을 고른다 | 어려움 |
| `lantern` | 빛나는 등불을 빠르게 찾는다 | 어려움·전설 |
| `star` | 3×3 칸의 별빛 하나를 찾는다 | 어려움·전설 |
| `lure` | 물고기가 찾는 미끼와 같은 그림을 고른다 | 어려움·전설 |
| `scales` | 양쪽 점 수를 보고 더 무거운 쪽을 고른다 | 전설 |

어종 점수로 난이도를 자동 선택한다. 일반어종은 2회·10.8초, 중급은 3회·9.9초, 고급은 4회·8.8초, 전설은 5회·7.6초가 기본이다. 타임어택은 목표를 한 단계 줄이고 제한 시간을 68%로 줄인다. 따라서 초등학생도 일반어종에서는 새 규칙을 부담 없이 익히고, 큰 물고기에서는 기억·관찰·속도를 모두 써야 한다.
