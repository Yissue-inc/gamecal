# Pixel Sea Fishing — Phase 1 Asset Manifest

## Art direction lock

- **Look:** original 16-bit, monster-collecting RPG adventure pixel art. It is an original visual system, not a reuse of any existing game or character.
- **Palette:** navy outlines, sea-glass cyan, cobalt, coral, sun-gold, honey wood.
- **Runtime rule:** every PNG must be drawn with `imageSmoothingEnabled = false` / `image-rendering: pixelated`; never interpolate it.
- **Scale:** world backgrounds are 1672×941. Player characters use independent oversized transparent PNGs (not sliced sheets), so cards and world play share an unwarped, crisp source; display player/NPC frames at roughly 48×64 logical px, common fish at 48–56×36, giant fish at 96–160×96.

## Deliverable inventory

| Runtime group | File | Frames | Intended use |
|---|---|---:|---|
| Harbor world | `backgrounds/harbor-day.png` | 1 | Main fishing scene; centered player area and right-side cast-water lane are intentionally clear. |
| Portrait harbor world | `backgrounds/harbor-portrait-v1.png` | 1 | 9:16 mobile-native harbor; central dock and fishing water lane remain in-frame. |
| Aquarium room | `backgrounds/aquarium-room.png` | 1 | Aquarium tab/room. Caught fish are layered over its water zone and animated with a gentle sine drift. |
| Portrait aquarium room | `backgrounds/aquarium-portrait-v1.png` | 1 | 9:16 mobile-native tank; fish swim in the clear central water zone. |
| Player | `sprites/player-minjun.png` | 4 | idle · side-walk · back-walk · cast |
| Player | `sprites/player-doyun.png` | 4 | idle · side-walk · back-walk · cast |
| Player | `sprites/player-seoyeon.png` | 4 | idle · side-walk · back-walk · cast |
| Player | `sprites/player-harin.png` | 4 | idle · side-walk · back-walk · cast |
| Active player | `sprites-v2/player-minjun.png` | 1 | Large independent idle PNG; direct render for selection and world play. |
| Active player | `sprites-v2/player-doyun.png` | 1 | Large independent idle PNG; direct render for selection and world play. |
| Active player | `sprites-v2/player-seoyeon.png` | 1 | Large independent idle PNG; direct render for selection and world play. |
| Active player | `sprites-v2/player-harin.png` | 1 | Large independent idle PNG; direct render for selection and world play. |
| Harbor NPC | `npc/npc-harbor-auntie.png` | 3 | idle · rod-tug · celebration |
| Harbor NPC | `npc/npc-harbor-boy.png` | 3 | idle · rod-tug · celebration |
| Harbor NPC | `npc/npc-harbor-girl.png` | 3 | idle · rod-tug · celebration |
| Rod inventory | `ui/rod-tier-sheet.png` | 5 | wood · stone · bronze · silver · gold; order is left to right. |
| Mini challenge UI | `ui/minigame-challenge-icons-v1.webp` | 15 | memory · bubble · current · net · waves · shell · sonar · knot · depth · compass · tide · lantern · star · lure · scales. Transparent 5×3 pixel-art sprite sheet. |
| Catch | `fish/01-bubblefin.png` | 3 | swim · bob · jump. Common. |
| Catch | `fish/02-sunstripe.png` | 3 | swim · bob · jump. Uncommon. |
| Catch | `fish/03-moonpot.png` | 3 | swim · bob · jump. First deliberately huge, fantastical catch. |
| Catch | `fish/04-cloudwhale.png` | 3 | swim · bob · breach. Giant catch. |
| Catch | `fish/05-starlure.png` | 3 | swim · bob · leap. Legendary giant catch. |

### Runtime frame cache

`tools/extract_pixel_frames.py` creates `frames/players`, `frames/npc`, `frames/fish`, and `frames/rods`. These are tightly alpha-cropped, one-PNG-per-frame derivatives of the source sheets. `game.js` uses the `sprites-v2/` player originals directly, and uses derivatives for NPCs, rods, and fish, so no runtime asset is stretched to fit an arbitrary rectangle.

## Aquarium integration contract (for Phase 2)

`caughtFish` is an array of `{ fishId, caughtAt, size, animationSeed }`. On each successful catch, append one entry, then render a **thumbnail** in the HUD aquarium strip and a full fish sprite in the aquarium room.

1. `fishId` maps directly to the numbered asset filename above.
2. Use frame 1 (swimming side view) for the aquarium; horizontal facing is randomized from `animationSeed`.
3. Each catch gets a unique tank lane `(x, y, depth)` and moves at 0.3–0.8 px/frame. Giants use a slower swim speed and a back layer, so they are visible without covering every smaller fish.
4. Do not delete caught fish on a failed catch; failed catches never enter `caughtFish`.
5. Persist `caughtFish` in local storage only after the Phase 2 game integration is implemented.

## Generation prompt family used

All assets used the built-in image generator with the same core direction: “premium original 16-bit pixel art, crisp navy outline, transparent background for sprites, child-friendly ocean adventure, no text/logo/watermark, no assets from an existing franchise.” Scene prompts added the requested harbor or aquarium layout; individual sprite prompts named their exact colors, frame count, and poses.
