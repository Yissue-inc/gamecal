# Clean & Keep — GamerClock integration

2026-09-30. Source: `/Users/ck/Yissue_Brain/Output/clean-house-defense`, version33.0.

- Public route: `/play/clean-keep`; arcade: `/mini-games`; generic catalog: `/api/minigames/catalog`.
- Uses the current shared iframe bridge and session/score APIs already used by Pilgrim’s Path and Wave Village Fishing, not the older draft API spec.
- HTML, 3 scripts, stylesheet and 129 WebP images copied from the hash-addressed mobile release. Only deploy-manifest release files are exported. The bridge adapter is appended to the game script so it shares the game's lexical scope. No master art, local QA files or secrets.
- No service worker registered in the GamerClock iframe. Existing standalone PWA remains separate.
- Adapter sends READY, STARTED, SCORE_CHANGED and COMPLETED. Story room completion and city contract completion report results. Menu also has an explicit record submission action.
- Metric: `dust_cleaned`, total cleaned piles capped at the generic API maximum5,000,000. Scalar stats include mode/wave/chapter/contracts. No GP, claims or new reward policy.
- Full gameplay state stays in browser localStorage; profile score saving uses existing authenticated API. **This is not full cloud save/sync.** Old file:// progress can be exported from the original game and imported into the hosted game. The origin changes, so it does not migrate automatically.
- Sandbox downloads are enabled only for Clean & Keep so users can export their save. Origin/source checks remain in shared bridge and shell.
- Responsive frame avoids the old600px minimum on short landscape screens only for this game.
- English story option follows initial browser locale when no saved language preference exists; tycoon UI is Korean.
- v28 adds an optional mini-game after a treasure ambush (70% roll when an ambush occurs): free best-of-three rock-paper-scissors or a 50-credit slot. The choice dialog pauses play and discloses every probability, reward and loss before play. Arcade and Open Graph thumbnail use the new original `clean-keep-cover.svg` illustration.
- v29 protects the three opening queue guests until the first product is stocked. Nexus recovery now preserves the wave and remaining reinforcements, charges 15% cash (minimum 25; below that it also consumes 10% of available cores and raw supplies), restores at 65% base/75% player HP, and applies a 12 reputation loss plus 25 seconds of production downtime.
- Contract cards disclose bond and losses including spent upkeep; active contracts show currently available stock and remaining shortage. The story language picker explains Korean-only workshop support.

## Regeneration

From the game source:

```sh
python3 build.py
python3 tools/build_mobile.py
python3 tools/build_gamerclock.py --target /Users/ck/gamecal
```

Catalog/version and arcade card are in `src/lib/minigames.ts` and `src/app/mini-games/page.tsx`.

## Verified locally

- `corepack pnpm exec tsc --noEmit`
- `corepack pnpm lint`
- `corepack pnpm build`
- `scripts/qa-clean-keep-v28.cjs` and `scripts/qa-clean-keep-v29.cjs`:375/390/430×844 and844×390, actual movement and rare encounter actions, guest score401, save download, original card/OG thumbnail, arcade/catalog and existing story/fishing route checks; v29 also checks the opening customer grace and paid defeat recovery.
- Existing other-game source modifications were left intact and are not part of this integration commit.

Deploy through the repository's existing main→Vercel Production integration. Production status and public checks are recorded in the task worklog after deployment.


## v30 — Mobile rendering budget (2026-09-29)

- Touch devices default to 1× DPR, low-power WebGL, no antialiasing/shadow pass, and a 30fps cap; idle world rendering is 1fps. Quality presets: battery 0.85×/30fps, sharp 1.25×/30fps on touch (shadows stay off) and 2×/60fps on desktop.
- The standalone local HTML, PWA and GamerClock iframe export come from the same source.
- `scripts/qa-clean-keep-v30.cjs` includes the v29 public flow and asserts touch renderer settings. Source performance pacing is also checked by `qa/v30/performance.cjs` in the clean-house-defense repo.


## v30 — Mobile rendering budget (2026-09-29)

- Touch devices default to 1× DPR, low-power WebGL, no antialiasing/shadow pass, and a 30fps cap; idle world rendering is 1fps. Quality presets: battery 0.85×/30fps, sharp 1.25×/30fps on touch (shadows stay off) and 2×/60fps on desktop.
- The standalone local HTML, PWA and GamerClock iframe export come from the same source.
- `scripts/qa-clean-keep-v30.cjs` includes the v29 public flow and asserts touch renderer settings. Source performance pacing is also checked by `qa/v30/performance.cjs` in the clean-house-defense repo.


## v31 — Safari focus behavior

Temporary `window.blur` only releases input. When the document actually goes to the background, the simulation saves and pauses quietly; returning to the visible page resumes without opening the save/settings panel. Manual pause still opens settings. Focus/lifecycle regressions are covered in `scripts/qa-clean-keep-v31.cjs`.

## v33 — manual recycling core

The base dust economy is now player-driven again: walk/suction dust into the backpack, press F at the recycler to deposit it, press F again to convert the visible raw pile into green recycled material, and press F at the output pad to pick it up. Dock unload is also explicit. Standing on a pad no longer silently consumes cargo. Constructed high-speed sorting and vacuum buildings remain opt-in automation rewards. Source verification: `qa/v33/manual-recycling.cjs`.
