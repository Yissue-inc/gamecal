# 천로역정 컷신 일러스트 제작 사양서

대상 게임: `pilgrims-path` (The Pilgrim's Path)
교체 위치: `public/mini-games/pilgrims-path/assets/cinematic/<id>.webp`

---

## 0. 지금 상태 — 왜 이 문서가 필요한가

컷신 13컷은 **이미 게임 안에서 돌아간다.** 다만 지금은 *코드로 그린 역광 실루엣*이다.
같은 이름의 `.webp` 파일을 위 폴더에 넣으면 게임이 **자동으로 그 이미지를 대신 쓴다.**

```js
// 90_cinema.js — 이미 들어 있는 로직
const im = new Image()
im.onload  = () => { this.img[id] = im }   // 있으면 일러스트
im.onerror = () => {}                       // 없으면 코드 렌더링
im.src = `assets/cinematic/${id}.webp`
```

즉 **한 장씩 올려도 된다.** 13장을 다 만들 때까지 기다릴 필요가 없고,
한 장이 마음에 안 들면 그 파일만 지우면 코드 렌더링으로 돌아간다.

> 이 세션에서는 이미지 생성 모델을 쓸 수 없어 래스터 일러스트를 직접 뽑지 못했다.
> 대신 ① 지금 당장 플레이 가능한 코드 컷신 ② 아래의 생성 프롬프트 ③ 무손실 교체 배선을 넣었다.

---

## 1. 규격

| 항목 | 값 |
|---|---|
| 해상도 | **1280 × 720** (16:9) |
| 포맷 | WebP (품질 82~88) |
| 용량 | 장당 **400KB 이하** (13장 합계 5MB 이하) |
| 안전 영역 | **하단 25%** 에 자막 상자가 올라온다 — 중요한 요소를 두지 말 것 |
| 카메라 | 게임이 켄번즈로 팬·줌한다. **가장자리 6% 는 잘릴 수 있다** |

## 2. 아트 디렉션 — 기존 성경 게임 시리즈와 같은 결

`_bible-shared/assets` 의 `ending-jesus-hug-v1.webp`, `jonah/fish-cinematic-v1.png` 와 같은 계열로 간다.

**공통 프롬프트 접두** (모든 컷에 붙인다)

```
detailed pixel art illustration, 16-bit JRPG event CG, painterly shading with visible
pixel texture, cinematic backlighting, strong rim light on figures, warm-to-cool color
contrast, atmospheric dust motes, soft volumetric light rays, storybook mood,
no text, no watermark, no UI, 16:9 composition
```

**공통 프롬프트 접미**

```
--ar 16:9 --style raw
```

**지켜야 할 것**
- 인물의 **얼굴을 크게 그리지 않는다.** 이 게임의 컷신은 전부 역광 구도다 — 실루엣과 빛으로 읽힌다.
- 주인공은 **10~13세 소년**. 등에 진 짐(5장 전)과 흰 옷(5장 후)이 유일한 식별 요소다.
- 유혈·공포 묘사 금지. 대상 독자가 초등 고학년~중1이다.
- 특정 화가·작품 스타일 이름을 프롬프트에 넣지 않는다.

## 3. 13컷 프롬프트

### ★ 우선순위 1 — 이것부터 만든다 (게임의 정점 3컷)

#### `cross.webp` — 5장 · 짐이 굴러떨어진다
```
A young boy kneeling before a wooden cross on a bare hilltop at sunset, seen in
silhouette against an enormous golden sunburst. A heavy bundle has just come loose
from his back and is rolling downhill toward the dark mouth of an open tomb, motion
trail behind it. His back is finally empty. Long light rays, purple-to-amber sky,
dust motes catching the light.
```

#### `celestial.webp` — 12장 · 천성의 문
```
Two small travelers walking up a golden road toward an open gate in a vast shining
city wall, seen from behind in silhouette. Tall spires with glowing finials rise on
both sides. The gate is pure white light, almost too bright to look at. Everything
is gold and warm cream, radiant light rays filling the whole frame.
```

#### `apollyon.webp` — 8장 · 아볼루온
```
A colossal winged demon filling a narrow rocky valley, seen in near-total silhouette
against smoldering orange light behind it. Tattered bat wings with visible finger
bones spread wide, curved horns, glowing yellow furnace eyes, embers leaking from
seams in its belly. A single small boy with a sword stands far below at lower left,
tiny, edged with cool blue rim light. Menacing but not gory.
```

### 우선순위 2 — 감정 전환점

#### `dream.webp` — 1장 · 불타는 도시를 등지고
```
A boy with a huge bundle strapped to his back stands on a ridge at dusk, back turned,
looking away from a burning city behind him. Skyline silhouettes with hundreds of
tiny orange window lights, smoke and embers drifting upward. A faint white light
glows far away on the horizon ahead of him. Deep maroon and ember-orange palette.
```

#### `evangelist.webp` — 1장 · 전도자가 먼 빛을 가리킨다
```
An old traveler with a long staff points toward a distant glowing gate on the horizon
at dawn. A boy with a bundle on his back stands beside him, looking where he points.
Both in silhouette on a dark ridge, layered blue hills behind, pale gold dawn light
breaking at the horizon with long rays.
```

#### `shining.webp` — 5장 · 빛나는 이 셋
```
Three tall radiant figures in flowing white stand in a row on a night hillside,
each haloed with soft light, handing a robe, a mark and a scroll to a small boy who
raises both arms. The figures are pure light with only soft edges — no detailed faces.
Deep blue night, stars, drifting light motes.
```

#### `key.webp` — 11장 · 약속의 열쇠
```
Two prisoners kneeling in a pitch-black stone dungeon behind heavy iron bars. Between
them floats an old golden key, glowing brilliantly and lighting only their faces from
below. The rest of the cell is nearly black. Warm gold against cold black, dramatic
single light source.
```

### 우선순위 3 — 나머지 6컷

#### `pliable.webp` — 2장 · 유순이 돌아선다
```
A boy with a bundle on his back sunk to his waist in a black swamp, reaching forward,
while another boy scrambles away up the near bank toward home. Bare dead trees with
twisted branches and hanging moss, thick green-grey fog, still black water.
```

#### `helphand.webp` — 2장 · 도움의 손
```
A large strong hand reaches down from above out of a shaft of daylight, fingers spread,
almost touching a smaller hand reaching up out of black mud below. Only the two hands
and forearms are visible, both in silhouette. Bright warm light between the fingertips,
ripples spreading on the mud surface.
```

#### `sinai.webp` — 3장 · 무너지는 산
```
An enormous overhanging mountain looms over a tiny boy who cowers with arms raised,
boulders tumbling down toward him, cracks in the rock leaking hot orange light,
lightning behind. Oppressive scale, the mountain fills the top two-thirds of the frame.
```

#### `wicket.webp` — 4장 · 좁은 문
```
A boy knocks on a narrow glowing doorway set in a stone wall while flaming arrows arc
toward him from a dark fortress on a cliff to the left. The doorway is the only warm
light in a cold blue night. Arrows leave bright trails across the sky.
```

#### `valley.webp` — 9장 · 죽음의 그늘 골짜기
```
A boy holding a small lantern walks a razor-thin path between two bottomless black
chasms. The lantern lights only a few steps around him. A shadowy figure leans close
behind his shoulder, whispering. Pairs of small red eyes glint in the surrounding dark.
Almost entirely black with one warm pool of lantern light.
```

#### `chariot.webp` — 10장 · 신실의 불수레
```
A chariot of fire descends through the sky above a dark crowd, wheels blazing, and
lifts a figure upward in a column of light. Below, a boy in the crowd raises both arms
watching him go. Crowd rendered as overlapping dark silhouettes from behind.
Deep crimson night, brilliant gold fire.
```

## 4. 만든 뒤 할 일

```bash
# 1) 1280x720 WebP 로 저장해 여기에 넣는다
public/mini-games/pilgrims-path/assets/cinematic/cross.webp

# 2) 썸네일은 manifest 가 cross.webp 를 쓴다 — 이 한 장은 특히 신경 쓸 것
public/mini-games/pilgrims-path/manifest.json  →  "thumbnail"

# 3) 확인
open http://localhost:3040/play/pilgrims-path
```

교체 후 별도 배포 설정은 필요 없다. 파일만 올리면 다음 로드부터 적용된다.

## 5. 이후 확장 여지

- **대사 초상화**: 지금은 픽셀 스프라이트를 잘라 쓴다. `_bible-shared` 처럼
  인물별 클로즈업(`dialogue-<name>-<emotion>.webp`)을 만들면 JRPG 느낌이 한 단계 더 올라간다.
  대상 인물 우선순위: 크리스천 → 전도자 → 아볼루온 → 절망 거인 → 신실 → 소망.
- **컷신 간 전환**: 지금은 페이드. 일러스트가 들어오면 가로 와이프/디졸브가 더 어울린다.
- **보이스**: 컷신 캡션은 이미 한/영 분리되어 있어 나중에 오디오를 붙이기 쉽다.
