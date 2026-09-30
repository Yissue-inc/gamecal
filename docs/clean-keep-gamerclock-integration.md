# Clean & Keep — GamerClock integration

2026-09-30. Source: `/Users/ck/Yissue_Brain/Output/clean-house-defense`, version27.0.

- Public route: `/play/clean-keep`; arcade: `/mini-games`; generic catalog: `/api/minigames/catalog`.
- Uses the current shared iframe bridge and session/score APIs already used by Pilgrim’s Path and Wave Village Fishing, not the older draft API spec.
- HTML, 3 scripts, stylesheet and 129 WebP images copied from the hash-addressed mobile release. Only deploy-manifest release files are exported. No master art, local QA files or secrets.
- No service worker registered in the GamerClock iframe. Existing standalone PWA remains separate.
- Adapter sends READY, STARTED, SCORE_CHANGED and COMPLETED. Story room completion and city contract completion report results. Menu also has an explicit record submission action.
- Metric: `dust_cleaned`, total cleaned piles capped at the generic API maximum5,000,000. Scalar stats include mode/wave/chapter/contracts. No GP, claims or new reward policy.
- Full gameplay state stays in browser localStorage; profile score saving uses existing authenticated API. **This is not full cloud save/sync.** Old file:// progress can be exported from the original game and imported into the hosted game. The origin changes, so it does not migrate automatically.
- Sandbox downloads are enabled only for Clean & Keep so users can export their save. Origin/source checks remain in shared bridge and shell.
- Responsive frame avoids the old600px minimum on short landscape screens only for this game.
- English story option follows initial browser locale when no saved language preference exists; tycoon UI is Korean.

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
- `scripts/qa-clean-keep.cjs`:375/390/430×844 and844×390, actual mode-selection button clicks, iframe and parent no horizontal overflow, same-origin bridge context/start/results, result panel, guest score401, save download, arcade/catalog links. No page exceptions.
- Existing other-game source modifications were left intact and are not part of this integration commit.

Deploy through the repository's existing main→Vercel Production integration. Production status and public checks are recorded in the task worklog after deployment.
