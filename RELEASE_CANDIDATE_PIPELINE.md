# GamerClock Release Candidate Pipeline

## Admin queue

Primary queue:

- `/admin/release-candidates`

External editorial reference:

- `http://127.0.0.1:8010/queue?week=2026-5%2F18W`

The GamerClock queue is the system of record for upcoming game releases. The external editorial queue can stay as a broader planning board until both products share an API.

## Workflow

1. Crawlers collect candidates from official and supporting sources.
2. Candidates are upserted into `release_candidates` with confidence scores and source signals.
3. Admin reviews, edits, approves, or rejects each candidate.
4. Approved candidates are inserted into public `new_releases`.
5. Calendar and `/new-releases` only read `new_releases`, so unreviewed items never go public.

## Source strategy

### PC

- Primary: Steam official Store Coming Soon pages and Steam Web API app identifiers.
- Supporting: SteamDB upcoming / popularity signals and SteamCharts trend signals.
- Rule: SteamDB and SteamCharts are ranking signals, not canonical release facts.

### Mobile

- Primary: App Store and Google Play listing pages when a title has an official listing.
- Supporting: Pocket Gamer and mobile gaming media upcoming lists.
- Rule: Media-only items should stay pending until a store or publisher page confirms them.

### PlayStation / Xbox

- Primary: PlayStation Store, PlayStation Blog, Xbox Store coming soon.
- Supporting: IGN and major gaming media release calendars.
- Rule: Official store or publisher link should be present before approval.

### Nintendo Switch

- Primary: Nintendo eShop coming soon and Nintendo official news.
- Supporting: Nintendo Life, IGN, and major gaming media release calendars.
- Rule: Official Nintendo or publisher confirmation should outweigh media lists.

## Confidence scoring

- Official source exists: +20
- Exact release date exists: +20
- Image/art exists: +10
- Ranking/media signal exists: +5 to +20
- Multi-platform launch: +5

Recommended thresholds:

- `80+`: safe to approve after quick human check.
- `60-79`: review details and verify source links.
- `<60`: keep pending or reject unless editorially important.

## Current implementation

Implemented source:

- Steam Popular Upcoming crawler.

Prepared expansion points:

- Additional source crawlers can be added in `src/lib/crawlers/release-candidates.ts`.
- Add source routes to `/api/admin/release-candidates/crawl`.
- Daily cron runs `/api/cron/release-candidates`.
