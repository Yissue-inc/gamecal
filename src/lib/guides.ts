export type Guide = {
  slug: string
  title: string
  shortTitle: string
  description: string
  keywords: string[]
  updatedAt: string
  sections: Array<{
    heading: string
    body: string[]
  }>
  faqs: Array<{
    question: string
    answer: string
  }>
  cta: {
    label: string
    href: string
  }
}

export const GUIDES: Guide[] = [
  {
    slug: 'gaming-event-calendar',
    title: 'Gaming Event Calendar: How to Track Live Events, Resets, Releases, and Rewards',
    shortTitle: 'Gaming Event Calendar',
    description:
      'Learn how a gaming event calendar helps players track live events, weekly resets, limited rewards, esports fixtures, and new releases in one place.',
    keywords: [
      'gaming event calendar',
      'game event calendar',
      'video game calendar',
      'live game events',
      'gaming schedule',
    ],
    updatedAt: '2026-06-21',
    sections: [
      {
        heading: 'What is a gaming event calendar?',
        body: [
          'A gaming event calendar is a dedicated schedule for the moments players actually plan around: limited-time events, weekly resets, patches, tournaments, beta windows, release dates, and reward deadlines.',
          'A normal work calendar can hold these dates, but it does not understand game-specific context. GamerClock is built around game names, event types, rarity, reward windows, reminders, and calendar feeds.',
        ],
      },
      {
        heading: 'Why players need one',
        body: [
          'Modern games run on rotating events. Fortnite seasons, World of Warcraft weekly resets, Pokemon GO community events, Genshin Impact updates, League of Legends patches, and new releases all compete for attention.',
          'A focused calendar reduces the cost of checking Discord, patch notes, storefronts, and social posts one by one. The goal is to make the next useful gaming moment obvious at a glance.',
        ],
      },
      {
        heading: 'How GamerClock approaches it',
        body: [
          'GamerClock groups live events, resets, tournaments, and releases into a single player-facing timeline. Players can browse by game, save events, subscribe to feeds, and return when a window is about to open.',
          'For Summer Cup 2026, GamerClock also connects match fixtures to ROAR, a playable crowd battle that turns calendar events into active participation.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is GamerClock only for one game?',
        answer:
          'No. GamerClock tracks multiple game calendars, including live service events, new releases, and Summer Cup 2026 fixtures.',
      },
      {
        question: 'Can I subscribe to game events?',
        answer:
          'Yes. GamerClock exposes calendar feeds so players can add tracked schedules to their personal calendar tools.',
      },
      {
        question: 'Does GamerClock include ROAR?',
        answer:
          'Yes. ROAR is integrated as a Summer Cup 2026 match experience where players pick a side, cheer, and save progress.',
      },
    ],
    cta: { label: 'Open the gaming calendar', href: '/' },
  },
  {
    slug: 'weekly-reset-tracker',
    title: 'Weekly Reset Tracker for Games: Events, Rewards, Patches, and Reminders',
    shortTitle: 'Weekly Reset Tracker',
    description:
      'Track weekly resets across live service games and avoid missing time-limited rewards, patches, raids, quests, and recurring events.',
    keywords: [
      'weekly reset tracker',
      'game reset tracker',
      'WoW weekly reset',
      'live service reset',
      'gaming reminders',
    ],
    updatedAt: '2026-06-21',
    sections: [
      {
        heading: 'What weekly resets mean for players',
        body: [
          'Weekly resets are the rhythm behind many live service games. They refresh quests, raids, vendors, rewards, competitive rotations, seasonal progress, and limited-time opportunities.',
          'Missing a reset often means losing a week of progress or missing a narrow reward window. A reset tracker gives players one place to see what is changing and when.',
        ],
      },
      {
        heading: 'What to track',
        body: [
          'A useful reset tracker should cover reset time, event title, game, start and end windows, reward relevance, patch or season context, and reminder options.',
          'GamerClock treats resets as first-class events alongside tournaments, patches, releases, and limited rewards, so they can live in the same schedule as the rest of a player’s gaming week.',
        ],
      },
      {
        heading: 'How to use GamerClock as a reset tracker',
        body: [
          'Players can follow game hubs, scan upcoming events, save reminders, and subscribe to feeds for the games they care about.',
          'The best workflow is simple: check what is next, save the event that matters, and let the calendar bring you back before the window closes.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Which games can use a reset tracker?',
        answer:
          'Any live service or online game with recurring weekly content can benefit from reset tracking, including MMOs, shooters, RPGs, and mobile games.',
      },
      {
        question: 'Is a reset tracker different from a release calendar?',
        answer:
          'Yes. Release calendars focus on launch dates. Reset trackers focus on recurring live game windows and weekly content refreshes.',
      },
      {
        question: 'Can reset tracking work with reminders?',
        answer:
          'Yes. GamerClock is designed around saving events and returning before important windows open or close.',
      },
    ],
    cta: { label: 'Track game resets', href: '/' },
  },
  {
    slug: 'roar-game',
    title: 'ROAR Game Guide: Summer Cup 2026 Crowd Battle on GamerClock',
    shortTitle: 'ROAR Game Guide',
    description:
      'Learn what ROAR is, how the Summer Cup 2026 crowd battle works, and how it connects match fixtures, cheering, rankings, and GamerClock accounts.',
    keywords: [
      'ROAR game',
      'Summer Cup 2026 game',
      'crowd battle game',
      'football cheering game',
      'GamerClock ROAR',
    ],
    updatedAt: '2026-06-21',
    sections: [
      {
        heading: 'What is ROAR?',
        body: [
          'ROAR is a free crowd battle game built into GamerClock for Summer Cup 2026 fixtures. Players pick a side, cheer for a nation, build support points, and return for the next match.',
          'It is designed to turn passive schedule checking into active participation. A match is not only something to track; it is something to enter, cheer through, and remember.',
        ],
      },
      {
        heading: 'How ROAR connects to the calendar',
        body: [
          'Each Summer Cup 2026 fixture can link into ROAR with match context. Before kickoff, players can pick a side. During live windows, they can cheer and build crowd momentum. After results, they can review match history and move to the next fixture.',
          'This keeps the core GamerClock loop intact: discover the match, play ROAR, save progress, and return through the calendar.',
        ],
      },
      {
        heading: 'Why sign in matters',
        body: [
          'ROAR supports guest preview, but sign-in is used when a player wants to save rank, keep history, and connect progress to a GamerClock account.',
          'That account bridge is important because the long-term value is not one match. It is the full Summer Cup 2026 journey across fixtures, picks, cheering, and reminders.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is ROAR free to play?',
        answer:
          'Yes. ROAR is free. Players can preview as guests and sign in when they want to save progress.',
      },
      {
        question: 'Is ROAR separate from GamerClock?',
        answer:
          'No. ROAR is integrated into GamerClock so match discovery, cheering, rank saving, and calendar retention work together.',
      },
      {
        question: 'Does ROAR use official tournament branding?',
        answer:
          'No. GamerClock uses the generic Summer Cup 2026 theme and does not claim official affiliation with FIFA or official World Cup marks.',
      },
    ],
    cta: { label: 'Play ROAR', href: '/roar' },
  },
]

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug) ?? null
}
