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

## P4 UI inventory

`brush-fat`, `brush-thin`, `bucket`, `eraser`, `stamp-star`, `stamp-heart`, `stamp-dot`, `stamp-stripe`, `undo`, `redo`, `clear`, `color-swatch`.

Every item has `<name>.svg`, `<name>.png`, `<name>-on.svg`, and `<name>-on.png`.

## Next integration work

P0–P16의 에셋 생산은 완료됐다. 정글은 `check_shape.py` **36/36**, `check_variety.py`
전 항목, 그리고 P16에서 발견된 모든 대상 부위 접점을 통과했다.

다음은 실제 기기에서 `?selftest=1`로 색칠·제출·무대 수신을 순서대로 점검하는 운영 QA다.
마스터 조립 경로는 PNG 원본의 실제 가로·세로 크기를 사용하도록 수정했으므로,
기린·홍학의 세로 부위도 런타임에서 납작해지지 않는다.
