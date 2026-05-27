import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('Demo seed is disabled for production safety. Set ALLOW_DEMO_SEED=true only for local demo data.')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: require('ws') },
})

// ─── GAMES ───────────────────────────────────────────────────────────────────
const GAMES = [
  { slug: 'fortnite',   name: 'Fortnite',           brand_color: '#00d4ff', platform: ['PC','PS5','Xbox','Mobile','Switch'], sort_order: 1 },
  { slug: 'apex',       name: 'Apex Legends',        brand_color: '#e33c3c', platform: ['PC','PS5','Xbox'],                   sort_order: 2 },
  { slug: 'valorant',   name: 'Valorant',            brand_color: '#ff4655', platform: ['PC'],                                sort_order: 3 },
  { slug: 'lol',        name: 'League of Legends',   brand_color: '#c89b3c', platform: ['PC'],                                sort_order: 4 },
  { slug: 'destiny2',   name: 'Destiny 2',           brand_color: '#4f91cd', platform: ['PC','PS5','Xbox'],                   sort_order: 5 },
  { slug: 'diablo4',    name: 'Diablo IV',           brand_color: '#b45309', platform: ['PC','PS5','Xbox'],                   sort_order: 6 },
  { slug: 'wow',        name: 'World of Warcraft',   brand_color: '#f59e0b', platform: ['PC'],                                sort_order: 7 },
  { slug: 'pokemon-go', name: 'Pokémon GO',          brand_color: '#eab308', platform: ['Mobile'],                            sort_order: 8 },
  { slug: 'genshin',    name: 'Genshin Impact',      brand_color: '#4ade80', platform: ['PC','PS5','Mobile'],                 sort_order: 9 },
]

// ─── EVENT DEFINITIONS ───────────────────────────────────────────────────────
type EventType =
  | 'weekly_reset' | 'season_start' | 'season_end' | 'live_event'
  | 'limited_reward' | 'patch_release' | 'tournament' | 'ranked_reset'
  | 'banner_end' | 'double_xp' | 'maintenance' | 'new_content' | 'other'
type Importance = 'critical' | 'high' | 'normal' | 'low'

interface EventDef {
  slug: string
  title: string
  event_type: EventType
  importance: Importance
  start_at: string
  end_at?: string
  description?: string
}

const EVENTS: EventDef[] = [

  // ── FORTNITE ──────────────────────────────────────────────────────────────
  { slug:'fortnite', title:'Double XP Weekend',           event_type:'double_xp',      importance:'high',     start_at:'2026-05-29T04:00:00Z', end_at:'2026-06-01T04:00:00Z', description:'Earn double XP on all activities through the weekend.' },
  { slug:'fortnite', title:'Weekly Quests Reset',         event_type:'weekly_reset',   importance:'high',     start_at:'2026-05-28T09:00:00Z', end_at:'2026-06-04T08:59:00Z' },
  { slug:'fortnite', title:'OG Cup — Solo Tournament',    event_type:'tournament',     importance:'critical', start_at:'2026-06-07T12:00:00Z', end_at:'2026-06-07T18:00:00Z', description:'Compete for 20,000 V-Bucks and the OG Cup trophy in Solo Cash Cup format.' },
  { slug:'fortnite', title:'Weekly Quests Reset',         event_type:'weekly_reset',   importance:'high',     start_at:'2026-06-04T09:00:00Z', end_at:'2026-06-11T08:59:00Z' },
  { slug:'fortnite', title:'Weekly Quests Reset',         event_type:'weekly_reset',   importance:'high',     start_at:'2026-06-11T09:00:00Z', end_at:'2026-06-18T08:59:00Z' },
  { slug:'fortnite', title:'Chapter 6 Season 3 Ends',     event_type:'season_end',     importance:'critical', start_at:'2026-06-13T02:00:00Z', description:'Last chance to complete the Battle Pass and claim all Season 3 rewards before the vault.' },
  { slug:'fortnite', title:'Chapter 6 Season 4 Begins',   event_type:'season_start',   importance:'critical', start_at:'2026-06-14T04:00:00Z', description:'New Battle Pass, new map POIs, and the Season 4 ranked split launch simultaneously.' },
  { slug:'fortnite', title:'Ranked Season 4 Begins',      event_type:'ranked_reset',   importance:'high',     start_at:'2026-06-14T04:00:00Z', description:'Ranked resets. Build rank from Bronze I.' },
  { slug:'fortnite', title:'Weekly Quests Reset',         event_type:'weekly_reset',   importance:'high',     start_at:'2026-06-18T09:00:00Z', end_at:'2026-06-25T08:59:00Z' },
  { slug:'fortnite', title:'Summer Splash Event',         event_type:'live_event',     importance:'high',     start_at:'2026-06-20T00:00:00Z', end_at:'2026-07-10T23:59:00Z', description:'Seasonal water-themed LTMs, free spray rewards, and the Summer Splash Supercharged playlist.' },
  { slug:'fortnite', title:'Weekly Quests Reset',         event_type:'weekly_reset',   importance:'high',     start_at:'2026-06-25T09:00:00Z', end_at:'2026-07-02T08:59:00Z' },
  { slug:'fortnite', title:'Marvel Rivals Crossover',     event_type:'live_event',     importance:'high',     start_at:'2026-07-01T00:00:00Z', end_at:'2026-07-14T23:59:00Z', description:'Limited hero skins, themed POIs, and the Zero-Point Clash LTM featuring Marvel hero abilities.' },
  { slug:'fortnite', title:'Weekly Quests Reset',         event_type:'weekly_reset',   importance:'high',     start_at:'2026-07-02T09:00:00Z', end_at:'2026-07-09T08:59:00Z' },
  { slug:'fortnite', title:'Fortnite World Cup Qualifiers', event_type:'tournament',   importance:'critical', start_at:'2026-07-12T12:00:00Z', end_at:'2026-07-12T18:00:00Z', description:'Regional qualifier matches across NA-East, NA-West, EU, and Brazil.' },
  { slug:'fortnite', title:'Weekly Quests Reset',         event_type:'weekly_reset',   importance:'high',     start_at:'2026-07-09T09:00:00Z', end_at:'2026-07-16T08:59:00Z' },
  { slug:'fortnite', title:'Season 4 Mid-Season Update',  event_type:'new_content',    importance:'high',     start_at:'2026-07-20T04:00:00Z', description:'New augments, weapon unvaults, and a map change reveal the final story arc of Season 4.' },
  { slug:'fortnite', title:'Back to School Event',        event_type:'live_event',     importance:'normal',   start_at:'2026-08-10T00:00:00Z', end_at:'2026-08-24T23:59:00Z', description:'Limited-time back-to-school themed quests and locker bundles.' },
  { slug:'fortnite', title:'Chapter 6 Season 4 Ends',     event_type:'season_end',     importance:'critical', start_at:'2026-09-12T02:00:00Z', description:'Final day to level Battle Pass and earn unclaimed rewards before Season 4 vaults.' },
  { slug:'fortnite', title:'Chapter 6 Season 5 Begins',   event_type:'season_start',   importance:'critical', start_at:'2026-09-13T04:00:00Z', description:'New season, new collab. Epic teases a gaming crossover unlike anything before.' },

  // ── APEX LEGENDS ─────────────────────────────────────────────────────────
  { slug:'apex', title:'Double XP Weekend',               event_type:'double_xp',      importance:'normal',   start_at:'2026-05-24T00:00:00Z', end_at:'2026-05-26T23:59:00Z', description:'Memorial Day weekend double XP on Battle Pass progression.' },
  { slug:'apex', title:'Emergence Collection Event',      event_type:'live_event',     importance:'high',     start_at:'2026-06-04T17:00:00Z', end_at:'2026-06-18T23:59:00Z', description:'24 exclusive cosmetics available through event packs. Unlock all 24 to get the Bangalore Prestige Skin.' },
  { slug:'apex', title:'Season 24: Broken Edge Ends',     event_type:'season_end',     importance:'critical', start_at:'2026-06-17T17:00:00Z', description:'Season 24 Ranked splits close. Finalize your rank to earn Ranked cosmetic rewards.' },
  { slug:'apex', title:'Season 25: Ascendancy Begins',    event_type:'season_start',   importance:'critical', start_at:'2026-06-17T17:00:00Z', description:'New Legend Seer rework, new map rotation, and a reworked Battle Pass structure drop at season launch.' },
  { slug:'apex', title:'Ranked Split 2 Reset',            event_type:'ranked_reset',   importance:'high',     start_at:'2026-06-17T17:00:00Z', description:'RP resets for Season 25 Split 1. A soft reset drops all players 1.5 tiers.' },
  { slug:'apex', title:'Anniversary 8 Collection Event',  event_type:'live_event',     importance:'high',     start_at:'2026-07-09T17:00:00Z', end_at:'2026-07-23T23:59:00Z', description:'Celebrate 8 years of Apex with anniversary packs, returning fan-favorite LTMs, and a free legendary reward at 8 wins.' },
  { slug:'apex', title:'Warriors Collection Event',       event_type:'live_event',     importance:'high',     start_at:'2026-08-06T17:00:00Z', end_at:'2026-08-20T23:59:00Z', description:'New weapon charms, kill quips, and the Rampart Prestige skin headline this combat-focused collection.' },
  { slug:'apex', title:'Season 25 Mid-Season Patch',      event_type:'patch_release',  importance:'high',     start_at:'2026-07-14T17:00:00Z', description:'Mid-season balance pass: legend nerfs/buffs, weapon tuning, and a World\'s Edge POI update.' },
  { slug:'apex', title:'Season 25 Ends',                  event_type:'season_end',     importance:'critical', start_at:'2026-09-08T17:00:00Z', description:'Ranked ladder freezes. Check your final standing for Season 25 Ranked Badges.' },

  // ── VALORANT ─────────────────────────────────────────────────────────────
  { slug:'valorant', title:'Patch 10.11 — Balance Update',  event_type:'patch_release', importance:'high',    start_at:'2026-05-28T07:00:00Z', description:'Raze and Chamber receive significant kit adjustments. Icebox returns to ranked rotation.' },
  { slug:'valorant', title:'Night Market Opens',             event_type:'limited_reward',importance:'high',    start_at:'2026-06-05T00:00:00Z', end_at:'2026-06-19T23:59:00Z', description:'Your personal Night Market reveals 6 mystery weapon skin discounts (30–50% off).' },
  { slug:'valorant', title:'Episode 10 Act 2 Ends',          event_type:'season_end',    importance:'critical',start_at:'2026-06-11T00:00:00Z', description:'Last day to level Act 2 Battle Pass and claim gun buddies, sprays, and the Act card.' },
  { slug:'valorant', title:'Patch 10.12 — Agent Release',    event_type:'patch_release', importance:'critical',start_at:'2026-06-12T07:00:00Z', description:'New duelist "Kestrel" launches with Act 3. New Iceland map enters the competitive pool.' },
  { slug:'valorant', title:'Episode 10 Act 3 Begins',        event_type:'season_start',  importance:'critical',start_at:'2026-06-12T07:00:00Z', description:'Act 3 Battle Pass, new ranked split, and the Kestrel Agent Contract drop simultaneously.' },
  { slug:'valorant', title:'Ranked Split 2 — Act 3',         event_type:'ranked_reset',  importance:'high',    start_at:'2026-06-12T07:00:00Z', description:'Rank resets partially. Immortal+ players experience a stronger demotion buffer wipe.' },
  { slug:'valorant', title:'Patch 10.13 — Balance Update',   event_type:'patch_release', importance:'high',    start_at:'2026-06-25T07:00:00Z', description:'Kestrel early tuning patch. Economy changes reduce eco-round winrate variance.' },
  { slug:'valorant', title:'VCT Champions 2026 — Groups',    event_type:'tournament',    importance:'critical',start_at:'2026-07-25T14:00:00Z', end_at:'2026-08-08T23:00:00Z', description:'8 regional champions compete in double-elimination group stage. Live from Berlin.' },
  { slug:'valorant', title:'VCT Champions 2026 — Playoffs',  event_type:'tournament',    importance:'critical',start_at:'2026-08-14T14:00:00Z', end_at:'2026-08-21T23:00:00Z', description:'Top 4 teams from groups advance to single-elimination playoff bracket.' },
  { slug:'valorant', title:'VCT Champions 2026 — Grand Final',event_type:'tournament',   importance:'critical',start_at:'2026-08-22T16:00:00Z', end_at:'2026-08-22T22:00:00Z', description:'The best team in the world is crowned. Exclusive viewership drop: Finalists Gun Buddy.' },
  { slug:'valorant', title:'Episode 10 Act 3 Ends',          event_type:'season_end',    importance:'critical',start_at:'2026-09-10T00:00:00Z', description:'Competitive Act 3 ends. Rank badge and Act card rewards finalized.' },

  // ── LEAGUE OF LEGENDS ─────────────────────────────────────────────────────
  { slug:'lol', title:'Patch 16.11 — Durability Update',  event_type:'patch_release', importance:'high',    start_at:'2026-05-27T14:00:00Z', description:'Systemic HP and armor tuning across the board. Tanks and bruisers buffed, burst mages adjusted.' },
  { slug:'lol', title:'Night Market Opens',               event_type:'limited_reward', importance:'high',   start_at:'2026-06-05T00:00:00Z', end_at:'2026-06-19T23:59:00Z', description:'6 personal discounted skin offers appear in your shop. Discounts range from 25% to 60%.' },
  { slug:'lol', title:'Patch 16.12 — New Champion Hotfix',event_type:'patch_release', importance:'high',    start_at:'2026-06-10T14:00:00Z', description:'Balance hotfix for new champion Aurellia Sol. Jungle item tuning mid-patch.' },
  { slug:'lol', title:'LEC Summer 2026 — Week 1',         event_type:'tournament',    importance:'high',    start_at:'2026-06-13T14:00:00Z', end_at:'2026-06-14T22:00:00Z', description:'European League kicks off Summer Split. G2, FNC, KOI, and new roster debuts.' },
  { slug:'lol', title:'LCS Summer 2026 — Week 1',         event_type:'tournament',    importance:'high',    start_at:'2026-06-14T17:00:00Z', end_at:'2026-06-14T23:00:00Z', description:'NA Summer Split begins with 8 teams. Cloud9 and Team Liquid headline the opening weekend.' },
  { slug:'lol', title:'Split 2 Ranked Season Begins',     event_type:'ranked_reset',  importance:'high',    start_at:'2026-06-14T00:00:00Z', description:'Split 2 starts. LP soft reset. Split 1 Victorious skin recipients notified.' },
  { slug:'lol', title:'MSI 2026 — Grand Finals',          event_type:'tournament',    importance:'critical',start_at:'2026-06-20T12:00:00Z', end_at:'2026-06-20T18:00:00Z', description:'T1 vs. Cloud9 headline the most anticipated MSI match-up in years. Live from São Paulo.' },
  { slug:'lol', title:'Patch 16.13 — Worlds Prep',        event_type:'patch_release', importance:'high',    start_at:'2026-06-24T14:00:00Z', description:'Jungle systemic changes aim to rebalance early game tempo ahead of Worlds meta.' },
  { slug:'lol', title:'Patch 16.14',                      event_type:'patch_release', importance:'normal',  start_at:'2026-07-08T14:00:00Z', description:'Mid-summer balance sweep. Yuumi, Nilah, and K\'Sante receive meaningful changes.' },
  { slug:'lol', title:'LCS Summer — Playoffs',            event_type:'tournament',    importance:'critical',start_at:'2026-08-08T17:00:00Z', end_at:'2026-08-10T23:00:00Z', description:'Top 6 LCS teams battle for Worlds seeds. Double-elimination bracket format.' },
  { slug:'lol', title:'Worlds 2026 — Play-In',            event_type:'tournament',    importance:'critical',start_at:'2026-09-26T10:00:00Z', end_at:'2026-10-01T22:00:00Z', description:'12 teams compete for the final 4 Group Stage spots. Live from Seoul.' },
  { slug:'lol', title:'Worlds 2026 — Group Stage',        event_type:'tournament',    importance:'critical',start_at:'2026-10-03T10:00:00Z', end_at:'2026-10-12T22:00:00Z', description:'16 teams divided into 4 groups. Best-of-1 round robin determines knockout bracket seeding.' },

  // ── DESTINY 2 ─────────────────────────────────────────────────────────────
  { slug:'destiny2', title:'Weekly Reset',                 event_type:'weekly_reset',  importance:'high',    start_at:'2026-05-26T17:00:00Z', end_at:'2026-06-02T16:59:00Z', description:'Nightfall, Trials, and Iron Banner rotate. New Xûr inventory Friday.' },
  { slug:'destiny2', title:'Trials of Osiris — Weekend',   event_type:'live_event',    importance:'high',    start_at:'2026-05-29T17:00:00Z', end_at:'2026-06-02T17:00:00Z', description:'Go Flawless (7-0) to earn the adept weapons and Flawless-exclusive armor ornaments.' },
  { slug:'destiny2', title:'Season 27: Edge of Salvation', event_type:'season_start',  importance:'critical',start_at:'2026-06-03T17:00:00Z', description:'New seasonal artifact, exotic quest, dungeon rotation, and the story expansion "The Witness Reborn" launches.' },
  { slug:'destiny2', title:'Iron Banner: Fortress',        event_type:'live_event',    importance:'high',    start_at:'2026-06-03T17:00:00Z', end_at:'2026-06-17T17:00:00Z', description:'Control variant with Iron Banner armor focusing available. Complete bounties for Iron Engrams.' },
  { slug:'destiny2', title:'Weekly Reset',                 event_type:'weekly_reset',  importance:'high',    start_at:'2026-06-09T17:00:00Z', end_at:'2026-06-16T16:59:00Z', description:'Season 27 Week 2 reset. New seasonal challenge unlocks.' },
  { slug:'destiny2', title:'Rite of the Nine — Final Week',event_type:'live_event',    importance:'high',    start_at:'2026-06-09T17:00:00Z', end_at:'2026-06-16T17:00:00Z', description:'Final week of Rite of the Nine. Farm Sundered Doctrine for god-roll weapons before it rotates out.' },
  { slug:'destiny2', title:'Weekly Reset',                 event_type:'weekly_reset',  importance:'high',    start_at:'2026-06-16T17:00:00Z', end_at:'2026-06-23T16:59:00Z' },
  { slug:'destiny2', title:'Trials of Osiris — Weekend',   event_type:'live_event',    importance:'high',    start_at:'2026-06-19T17:00:00Z', end_at:'2026-06-23T17:00:00Z' },
  { slug:'destiny2', title:'Weekly Reset',                 event_type:'weekly_reset',  importance:'high',    start_at:'2026-06-23T17:00:00Z', end_at:'2026-06-30T16:59:00Z' },
  { slug:'destiny2', title:'Pale Heart Reprised Raid Launch',event_type:'new_content', importance:'critical',start_at:'2026-06-20T17:00:00Z', description:'Day 1 Raid Race begins. First team to complete earns exclusive Belt Buckle emblems and a Bungie-signed card.' },
  { slug:'destiny2', title:'Weekly Reset',                 event_type:'weekly_reset',  importance:'high',    start_at:'2026-07-07T17:00:00Z', end_at:'2026-07-14T16:59:00Z' },
  { slug:'destiny2', title:'Guardian Games 2026',          event_type:'live_event',    importance:'high',    start_at:'2026-07-21T17:00:00Z', end_at:'2026-08-04T17:00:00Z', description:'Hunters vs. Titans vs. Warlocks. Complete class medallion activities to tilt the scoreboard. Winning class earns the Heir Apparent catalyst.' },
  { slug:'destiny2', title:'Codename: Apollo — Expansion', event_type:'new_content',   importance:'critical',start_at:'2026-08-27T17:00:00Z', description:'Major expansion drops. New destination, new raid, new exotic class item, and story resolution for Season 27.' },

  // ── DIABLO IV ─────────────────────────────────────────────────────────────
  { slug:'diablo4', title:'Double XP — Memorial Weekend', event_type:'double_xp',     importance:'normal',  start_at:'2026-05-23T17:00:00Z', end_at:'2026-05-26T17:00:00Z', description:'1.5× XP multiplier on all activities. Stack with Elixirs for up to 3× season XP.' },
  { slug:'diablo4', title:'Patch 2.2 — Balance & Systems', event_type:'patch_release', importance:'high',   start_at:'2026-06-10T18:00:00Z', description:'Necromancer Army rework, mercenary system expansion, and significant endgame Torment scaling.' },
  { slug:'diablo4', title:'Season 8 Mid-Season Update',   event_type:'patch_release',  importance:'high',   start_at:'2026-06-17T18:00:00Z', description:'Belial returns to world bosses. Mid-tier Pit tuning and crafting material drop rate increases.' },
  { slug:'diablo4', title:'Double XP — Independence Day', event_type:'double_xp',     importance:'normal',  start_at:'2026-07-04T17:00:00Z', end_at:'2026-07-07T17:00:00Z', description:'Seasonal XP bonus for the long weekend. Push your characters to paragon cap.' },
  { slug:'diablo4', title:'Season 8: Belial\'s Return Ends',event_type:'season_end',   importance:'critical',start_at:'2026-07-14T17:00:00Z', description:'Season 8 ends. Earn the Scythe of the Devourer trophy cosmetic before the season gates close.' },
  { slug:'diablo4', title:'Season 9: Sins of the Horadrim',event_type:'season_start',  importance:'critical',start_at:'2026-07-15T17:00:00Z', description:'New seasonal mechanic: Horadric Tomes. Collect lore pages to unlock experimental legendary powers mid-season.' },
  { slug:'diablo4', title:'Season 9 Mid-Season Patch',    event_type:'patch_release',  importance:'high',   start_at:'2026-08-19T18:00:00Z', description:'Community-requested skill changes. Sorcerer frost build overperformance addressed.' },

  // ── WORLD OF WARCRAFT ─────────────────────────────────────────────────────
  { slug:'wow', title:'Weekly Reset',                      event_type:'weekly_reset',  importance:'high',   start_at:'2026-05-26T15:00:00Z', end_at:'2026-06-02T14:59:00Z', description:'Mythic+ weekly chest, raid lockouts, and world quests reset.' },
  { slug:'wow', title:'WoW Classic SoD — Phase 7 Launch', event_type:'new_content',   importance:'critical',start_at:'2026-06-03T15:00:00Z', description:'Season of Discovery Phase 7: Level 65 cap, Gnomeregan Reloaded megadungeon, new Rune discovery system.' },
  { slug:'wow', title:'Weekly Reset',                      event_type:'weekly_reset',  importance:'high',   start_at:'2026-06-02T15:00:00Z', end_at:'2026-06-09T14:59:00Z' },
  { slug:'wow', title:'Patch 11.2: Seeds of Renewal',     event_type:'patch_release', importance:'critical',start_at:'2026-06-09T15:00:00Z', description:'New raid: Nerub-ar Palace (9 bosses), new zone The Undermine, catch-up gear currency system, and Mythic+ Season 4 ends.' },
  { slug:'wow', title:'Mythic+ Season 4 Ends',            event_type:'season_end',     importance:'high',   start_at:'2026-06-09T15:00:00Z', description:'Season 4 Mythic+ score finalizes. Keystone Master and Keystone Hero achievement criteria lock in.' },
  { slug:'wow', title:'Weekly Reset',                      event_type:'weekly_reset',  importance:'high',   start_at:'2026-06-09T15:00:00Z', end_at:'2026-06-16T14:59:00Z' },
  { slug:'wow', title:'Mythic+ Season 5 Begins',          event_type:'season_start',   importance:'high',   start_at:'2026-06-16T15:00:00Z', description:'New dungeon pool: 4 new + 4 returning dungeons. Season 5 Keystone rewards updated.' },
  { slug:'wow', title:'Weekly Reset',                      event_type:'weekly_reset',  importance:'high',   start_at:'2026-06-16T15:00:00Z', end_at:'2026-06-23T14:59:00Z' },
  { slug:'wow', title:'Midsummer Fire Festival',           event_type:'live_event',    importance:'high',   start_at:'2026-06-21T10:00:00Z', end_at:'2026-07-05T09:59:00Z', description:'Honor the Flame at capital cities, douse enemy bonfires for AP, and earn the Flame Warden/Keeper achievement.' },
  { slug:'wow', title:'Weekly Reset',                      event_type:'weekly_reset',  importance:'high',   start_at:'2026-06-23T15:00:00Z', end_at:'2026-06-30T14:59:00Z' },
  { slug:'wow', title:'Timewalking — The Burning Crusade', event_type:'live_event',    importance:'normal', start_at:'2026-06-30T15:00:00Z', end_at:'2026-07-07T14:59:00Z', description:'Scale down to BC content. Earn Timewarped Badges and a weekly quest reward cache from Black Temple or Sunwell.' },
  { slug:'wow', title:'Patch 11.2.5 — Undermine Epilogue',event_type:'patch_release', importance:'high',   start_at:'2026-08-04T15:00:00Z', description:'Story epilogue quest, The Undermine daily quest hub expansion, and Heritage Armor for Mechagnomes.' },
  { slug:'wow', title:'Brewfest 2026',                     event_type:'live_event',    importance:'normal', start_at:'2026-09-20T10:00:00Z', end_at:'2026-10-06T09:59:00Z', description:'Seasonal beer festival. Ram racing, daily Coren Direbrew boss, and the Brewfest mount drop.' },

  // ── POKÉMON GO ────────────────────────────────────────────────────────────
  { slug:'pokemon-go', title:'Raid Hour: Rayquaza',        event_type:'live_event',    importance:'high',   start_at:'2026-05-28T18:00:00Z', end_at:'2026-05-28T19:00:00Z', description:'Rayquaza floods 5-Star Raid Gyms for one hour. Shiny rate boosted. Remote Raid Passes work.' },
  { slug:'pokemon-go', title:'Battle League Season 21 End',event_type:'season_end',    importance:'high',   start_at:'2026-06-01T20:00:00Z', description:'Season 21 ends. Rank 20+ trainers receive Stardust, XP, and the Season 21 Pokémon encounter reward.' },
  { slug:'pokemon-go', title:'Battle League Season 22 Begins',event_type:'season_start',importance:'high',  start_at:'2026-06-02T00:00:00Z', description:'Season 22 meta shift: new cup rotations, Great League adjusted move updates.' },
  { slug:'pokemon-go', title:'GO Fest 2026: Seattle',      event_type:'live_event',    importance:'critical',start_at:'2026-06-13T10:00:00Z', end_at:'2026-06-14T18:00:00Z', description:'In-person GO Fest Seattle. Ticketed habitats, rare spawns, and the Mythical Pokémon reveal. 5 habitats rotating hourly.' },
  { slug:'pokemon-go', title:'Community Day: Deino',       event_type:'live_event',    importance:'critical',start_at:'2026-06-21T14:00:00Z', end_at:'2026-06-21T17:00:00Z', description:'Deino Community Day — 3× catch XP, 3-hour incense, and Hydreigon learns the exclusive move Dragon Ascent.' },
  { slug:'pokemon-go', title:'Solstice Horizons Event',    event_type:'live_event',    importance:'high',   start_at:'2026-06-17T10:00:00Z', end_at:'2026-06-22T20:00:00Z', description:'Fire and Ice Pokémon flood the map. Mega Rayquaza returns to raids. Solstice-themed Collection Challenge.' },
  { slug:'pokemon-go', title:'GO Fest 2026: London',       event_type:'live_event',    importance:'critical',start_at:'2026-07-11T10:00:00Z', end_at:'2026-07-12T18:00:00Z', description:'In-person GO Fest London. Europe-exclusive spawns, regional Pokémon habitat, and post-fest surprises.' },
  { slug:'pokemon-go', title:'GO Fest 2026: Global',       event_type:'live_event',    importance:'critical',start_at:'2026-07-18T10:00:00Z', end_at:'2026-07-19T20:00:00Z', description:'24-hour global event. All trainers worldwide access GO Fest habitats, enhanced shiny rates, and Special Research.' },
  { slug:'pokemon-go', title:'Community Day: Larvitar',    event_type:'live_event',    importance:'critical',start_at:'2026-07-19T14:00:00Z', end_at:'2026-07-19T17:00:00Z', description:'Larvitar spawns everywhere. Tyranitar gains exclusive move Stone Edge+. 1/4 Egg hatch distance.' },
  { slug:'pokemon-go', title:'Ultra Unlock 2026: Space',   event_type:'live_event',    importance:'high',   start_at:'2026-08-05T10:00:00Z', end_at:'2026-08-16T20:00:00Z', description:'Space-themed bonus unlocked by GO Fest Global. Ultra Space Pokémon spawn, Celesteela and Kartana raid rotation.' },
  { slug:'pokemon-go', title:'Community Day: Goomy',       event_type:'live_event',    importance:'critical',start_at:'2026-08-16T14:00:00Z', end_at:'2026-08-16T17:00:00Z', description:'Goomy Community Day. Goodra (Hisui) learns the exclusive Water Pulse. Trade range expanded globally for 3 hours.' },

  // ── GENSHIN IMPACT ────────────────────────────────────────────────────────
  { slug:'genshin', title:'Version 5.7 Update',            event_type:'new_content',   importance:'critical',start_at:'2026-05-28T06:00:00Z', description:'New Pyro character Ignara released with a new Mondstadt story quest and the Frostfire Crucible event.' },
  { slug:'genshin', title:'Ignara — Character Banner',     event_type:'banner_end',    importance:'high',    start_at:'2026-05-28T06:00:00Z', end_at:'2026-06-17T17:59:00Z', description:'Phase 1 banner. Ignara (5★) and Fischl rerun. Pull before 5.8 for guaranteed 50/50 carry-over.' },
  { slug:'genshin', title:'Frostfire Crucible Event',      event_type:'live_event',    importance:'high',    start_at:'2026-05-28T10:00:00Z', end_at:'2026-06-11T03:59:00Z', description:'Timed tower-defense event. Complete all 8 stages on Challenge difficulty for Primogems and a free 4-star selector.' },
  { slug:'genshin', title:'Phase 2 Banner: Zhongli Rerun', event_type:'banner_end',    importance:'high',    start_at:'2026-06-17T18:00:00Z', end_at:'2026-07-08T17:59:00Z', description:'Zhongli (5★) and Noelle rerun. Last opportunity before Zhongli enters standard banner.' },
  { slug:'genshin', title:'Version 5.8 Update',            event_type:'new_content',   importance:'critical',start_at:'2026-07-09T06:00:00Z', description:'New Dendro support character Vayuda. Enkanomiya zone expansion with underwater exploration mechanic.' },
  { slug:'genshin', title:'Summer Odyssey Event',          event_type:'live_event',    importance:'high',    start_at:'2026-07-09T10:00:00Z', end_at:'2026-07-29T03:59:00Z', description:'Annual summer event on a temporary island. Unlock exclusive Fischl outfit through event currency.' },
  { slug:'genshin', title:'Version 5.8 Phase 2 Banner',   event_type:'banner_end',    importance:'normal',  start_at:'2026-07-29T18:00:00Z', end_at:'2026-08-19T17:59:00Z', description:'Hu Tao rerun with new Yanfei skin. Phase 2 ends with 5.9 patch deployment.' },
  { slug:'genshin', title:'Version 5.9 Update',            event_type:'new_content',   importance:'critical',start_at:'2026-08-20T06:00:00Z', description:'Tsurumi Island expansion continuation. New weekly boss Dvalin Resurgent added to rotation.' },
]

// ─── NEW RELEASES ─────────────────────────────────────────────────────────────
const RELEASES = [
  { title: 'Hollow Knight: Silksong',    developer: 'Team Cherry',      platform: ['Switch','PC'],          release_date: '2026-06-15', is_featured: true, is_published: true, description: 'The long-awaited sequel. Play as Hornet across an entirely new kingdom.' },
  { title: 'Metroid Prime 4: Beyond',    developer: 'Nintendo / Retro', platform: ['Switch'],               release_date: '2026-07-01', is_featured: true, is_published: true, description: 'Samus returns in the long-awaited fourth entry of the first-person Metroid series.' },
  { title: 'Elden Ring: Nightreign',     developer: 'FromSoftware',     platform: ['PC','PS5','Xbox'],      release_date: '2026-05-30', is_featured: true, is_published: true, description: 'Standalone co-op roguelite. Three Nightfarers hunt the Nightlord across condensed expeditions.' },
  { title: 'Path of Exile 2 — EA Update 0.3', developer: 'Grinding Gear Games', platform: ['PC'],          release_date: '2026-06-06', is_featured: false, is_published: true, description: 'Early Access 0.3 adds the Druid class, Act 4, and a complete skill gem overhaul.' },
  { title: 'Monster Hunter Wilds: First Expansion', developer: 'Capcom', platform: ['PC','PS5','Xbox'],    release_date: '2026-06-26', is_featured: true, is_published: true, description: 'Title Update 1 introduces the elder dragon Zinogre Tempest and the Oilwell Basin night cycle.' },
  { title: 'Hades II — Full Release',   developer: 'Supergiant Games',  platform: ['PC','Switch'],          release_date: '2026-07-18', is_featured: true, is_published: true, description: 'Exits Early Access with full story, 2 new weapons, and the Olympus surface act.' },
  { title: 'Grand Theft Auto VI',        developer: 'Rockstar Games',   platform: ['PS5','Xbox'],           release_date: '2026-09-17', is_featured: true, is_published: true, description: 'Return to Vice City. Dual protagonists Jason and Lucia in the largest GTA map ever built.' },
  { title: 'Fable (2026)',               developer: 'Playground Games',  platform: ['PC','Xbox'],            release_date: '2026-08-20', is_featured: true, is_published: true, description: 'Reboot of the beloved RPG series. Albion reimagined with next-gen open world systems.' },
  { title: 'Dead by Daylight 2',         developer: 'Behaviour Interactive', platform: ['PC','PS5','Xbox'], release_date: '2026-07-09', is_featured: false, is_published: true, description: 'Full sequel to the asymmetric horror classic. New engine, new mechanics, and 5v1 mode.' },
]

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🎮 Seeding GAMECAL database...\n')

  // Clear existing data
  console.log('🗑  Clearing existing data...')
  await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('new_releases').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('   Done.\n')

  // Upsert games
  console.log('🕹  Seeding games...')
  for (const game of GAMES) {
    const { error } = await supabase.from('games').upsert(
      { ...game, is_active: true },
      { onConflict: 'slug' }
    )
    if (error) console.error(`   ❌ Game ${game.slug}:`, error.message)
    else console.log(`   ✓ ${game.name}`)
  }

  // Fetch game ID map
  const { data: games } = await supabase.from('games').select('id, slug')
  const gameMap = Object.fromEntries((games ?? []).map((g) => [g.slug, g.id]))
  console.log()

  // Insert events
  console.log('📅 Seeding events...')
  let eventCount = 0
  for (const e of EVENTS) {
    const game_id = gameMap[e.slug]
    if (!game_id) { console.error(`   ❌ No game_id for slug: ${e.slug}`); continue }
    const { slug: _s, ...rest } = e
    const { error } = await supabase.from('events').insert({
      ...rest,
      game_id,
      source_url: `https://gamecal.io/${e.slug}`,
      is_published: true,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`   ❌ ${e.title}:`, error.message)
    } else {
      eventCount++
    }
  }
  console.log(`   ✓ ${eventCount} events inserted\n`)

  // Insert new releases
  console.log('🚀 Seeding new releases...')
  for (const r of RELEASES) {
    const { error } = await supabase.from('new_releases').insert(r)
    if (error && !error.message.includes('duplicate')) {
      console.error(`   ❌ ${r.title}:`, error.message)
    } else {
      console.log(`   ✓ ${r.title}`)
    }
  }

  console.log('\n✅ Seed complete!')
  console.log(`   ${GAMES.length} games · ${eventCount} events · ${RELEASES.length} releases`)
}

seed().catch(console.error)
