# Paint World — Asset Master Index

## Asset conventions

- Runtime assets live directly under `assets/<family>/`.
- A coloring creature is always a pair: `<slug>-ink.png` above the child's paint, and `<slug>-mask.png` as the clip shape.
- Each runtime PNG has a sibling editable SVG source with the same basename.
- Creature masks must have only opaque white paintable pixels and fully transparent non-paintable pixels. Eyes are ink-only transparent holes in masks.

## Completed

| Pack | Assets | Source / output | QA status |
|---|---:|---|---|
| P0 pilot | clownfish ink + mask | `assets/sea/` | 720×480 pair; transparent ink / binary white mask |
| P4 coloring tools | 12 icons × default and pressed states | `assets/ui/` | 24 PNGs + 24 SVG sources; transparent RGBA; 1.9–8.7KB each; swatch centers transparent |
| P1 easy sea | 14 creature ink + mask pairs | `assets/sea/` | 28 PNGs + 28 SVG sources; 720×480; masks are binary white/transparent |
| P7 sea backgrounds | 12 layered backgrounds | `assets/bg/` | 12 WebP runtime files + SVG sources; 512 or 1920px source dimensions; alpha and horizontal tile edges checked where required; 1–33KB each |
| P5 screen buttons | 10 buttons/panels with press states | `assets/ui/` | 22 PNGs + 22 SVG sources, including sound on/off; exact requested dimensions; all <11KB |
| P2 medium sea | 16 creature ink + mask pairs | `assets/sea/` | 32 PNGs + 32 SVG sources; 720×480; all masks binary white/transparent and within safe margins |
| P8 sea/common props | 23 interactive props | `assets/prop/` | 23 PNGs + SVG sources; transparent RGBA; exact prompt dimensions; all <17KB |
| P6 effects | 12 sprites/effects | `assets/ui/` | 12 PNG sprite sheets + SVG sources; all <93KB; spotlight center tested fully transparent |
| P3 ornate sea | 10 creature ink + mask pairs | `assets/sea/` | 20 PNGs + 20 SVG sources; 720×480; binary white/transparent masks; 6+ broad coloring sections each |
| P9 elephant pilot | 5 rigged parts × ink/mask | `assets/jungle/` | 10 PNGs + SVG sources plus editable `elephant-parts-master.svg`; documented joint coordinates and binary masks verified |
| P10 easy jungle | 12 rigged animals | `assets/jungle/` | 120 PNG part files incl. pilot + editable SVG sources and 12 master layouts; all masks binary white/transparent |
| P11 jungle worlds | 12 backgrounds + 6 props | `assets/bg/`, `assets/prop/` | WebP backgrounds and transparent PNG props with SVG sources; exact prompt dimensions; all files <21KB |
| P12 medium jungle | 16 rigged animals | `assets/jungle/` | Per-part ink/mask PNG + SVG and 16 master layouts; masks verified binary white/transparent |
| P13 ornate jungle | 11 rigged animals + snake | `assets/jungle/` | 11 rigged master sets plus 720×480 snake ink/mask pair; masks verified binary white/transparent |
| P14 jungle remake | 39 rigged animals | `assets/jungle/` | P16 feature-vector rework complete: 36/36 shape rules pass; all 39 layout signatures and part-diversity gates pass; the documented tiger/deer/raccoon pixel-contact defects are repaired and verified |
| P15 jungle height layers | 16 stage props + 4 common backgrounds | `assets/prop/`, `assets/bg/` | Transparent colored layer props and PNG backgrounds; exact requested dimensions, alpha holes, and <200KB outputs verified |
| P17 UI icons + canopy repair | 5 UI keys × normal/pressed + 1 prop | `assets/ui/`, `assets/prop/` | Exact PNG dimensions, transparent canvases, pressed gold treatment, and reworked canopy centre alpha hole (45.7% transparent) verified; game prefetch and jungle canopy placement wired |
| P18 coral remake | far + near background tiles | `assets/bg/` | Exact 1920×360 / 1920×420 RGBA WebP; black-silhouette review shows distributed reef clusters rather than a hand shape; top alpha and pixel-exact horizontal tile seams verified |
| P19 treasure accessories | 40 item icons + chest burst | `assets/item/`, `assets/ui/` | 40 exact 256×256 transparent RGBA PNGs + editable SVG sources; colored fills and transparent corners verified. `Items` loads every icon and `FXA` preloads the 512×512 chest-light effect; self-test now reports readiness. |

## P4 UI inventory

`brush-fat`, `brush-thin`, `bucket`, `eraser`, `stamp-star`, `stamp-heart`, `stamp-dot`, `stamp-stripe`, `undo`, `redo`, `clear`, `color-swatch`.

Every item has `<name>.svg`, `<name>.png`, `<name>-on.svg`, and `<name>-on.png`.

## Next integration work

P0–P16의 에셋 생산은 완료됐다. 정글은 `check_shape.py` **36/36**, `check_variety.py`
전 항목, 그리고 P16에서 발견된 모든 대상 부위 접점을 통과했다.

로컬 브라우저 `?selftest=1`에서 바다·정글·공룡·로봇·곤충의 무대/고르기/색칠 화면과
신규 모드 150종의 도안·부위 anchor를 점검했다. 실제 전시 기기에서는 색칠·제출·무대 수신을
한 번 더 순서대로 확인하는 운영 QA만 남았다.
마스터 조립 경로는 PNG 원본의 실제 가로·세로 크기를 사용하도록 수정했으므로,
기린·홍학의 세로 부위도 런타임에서 납작해지지 않는다.## Next production order

**P23 — 공룡·곤충 움직이는 부위 재제작: 완료 ✓** → `prompts/P23_부위_재제작.md`

몸통·anchor·배경을 그대로 보존한 채 ink/mask 부위 페어를 재제작했다.
`check_variety.py` 기준: 공룡 다리 40종 중 ink 36·mask 40 고유(평균 겹침 0.34/0.63),
공룡 날개·지느러미는 각각 전종 고유, 곤충 다리 15종 중 14 고유, 곤충 날개 24종 중 22 고유다.
모든 부위군이 고유성·실루엣 겹침 게이트를 통과했다.

**P24 — 로봇 몸통·부위 재제작: 완료 ✓** → `prompts/P24_로봇_재제작.md`

`assets/robot/`의 몸통 ink/mask 50종과 분리 부위를 재생성했다. 검증 기준에서 로봇 몸통 mask는
49/49 고유·평균 겹침 0.56, 팔 11/12·다리 8/10·바퀴 8/8 고유이며 모든 대상의 mask 겹침은 0.75 이하이다.
`js/37_modeworld.js`에 로봇 전용 asset revision을 추가해 같은 파일명으로 교체된 P24 PNG가 이전 브라우저
캐시 대신 로드되도록 했다. 수동 anchor와 도시 배경은 보존했다.

**P21 — 로봇 50종 + 로봇도시 배경 12종: 완료 ✓** → `prompts/P21_로봇50종.md`

`assets/robot/`에 몸통 ink/mask·마스터 SVG 50종, 분리 부위 ink/mask 39종, `_anchor.json` 39개,
`_manifest.json`을 수록했다(총 PNG 178장). 기존 파일럿 3종의 수동 anchor 값은 그대로 보존했다.
`assets/bg/city-*.webp`에는 로봇도시 레이어 12종을 수록했다.

**완료 ✓**
  P23 공룡·곤충 부위 재제작 · P22 곤충 50종 + 배경 12 · P21 로봇 50종 + 배경 12 · P20 공룡 50종 + 배경 12
  P19 아이템 40종 · P18 산호 · P17 UI 아이콘 · P16 정글 형태 · P15 정글 소품

⚠ 검사기가 새 모드 폴더를 안 보고 있었다 — 그래서 공룡 부위 중복을 놓칠 뻔했다.
   `tools/check_variety.py` 가 이제 dino·robot·bug 도 본다.
   **검사하지 않는 폴더는 반드시 어긋난다.**
