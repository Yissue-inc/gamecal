export interface GroupCalOption {
  label: string
  start_at?: string
}

export interface CreatePartyPayload {
  title: string
  created_by: string
  vibe: 'game'
  theme_color?: string
  options: GroupCalOption[]
}

export interface CreatePartyResult {
  slug: string
  url: string
  creator_token: string
  admin_url: string
}

export function buildOptionsFromEvent(
  startAt: string,
  endAt: string | null,
  gameName: string
): GroupCalOption[] {
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : new Date(startAt)
  const now = new Date()
  const options: GroupCalOption[] = []

  if (!Number.isNaN(start.getTime())) {
    options.push({
      label: `${gameName} — ${formatUS(start)}`,
      start_at: start.toISOString(),
    })
  }

  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    const mid = new Date((start.getTime() + end.getTime()) / 2)
    if (mid.toDateString() !== start.toDateString()) {
      options.push({
        label: `Midway — ${formatUS(mid)}`,
        start_at: mid.toISOString(),
      })
    }

    const dayBeforeEnd = new Date(end)
    dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1)
    if (
      options.length < 3 &&
      dayBeforeEnd > now &&
      dayBeforeEnd.toDateString() !== start.toDateString()
    ) {
      options.push({
        label: `Last day — ${formatUS(dayBeforeEnd)}`,
        start_at: dayBeforeEnd.toISOString(),
      })
    }
  }

  if (options.length < 2) {
    options.push({ label: 'During the event — TBD' })
  }

  if (options.length < 2) {
    options.push({ label: 'Backup squad time — TBD' })
  }

  return options.slice(0, 4)
}

function formatUS(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
