'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { usePreferences } from '@/hooks/usePreferences'
import { detectBrowserTimezone, formatTimezoneLabel, getCommonTimezones } from '@/lib/timezone'
import { trackOnboardingCompleted } from '@/lib/posthog'
import type { Game } from '@/types'

const PLATFORMS = [
  { id: 'pc', label: 'PC' },
  { id: 'console', label: 'Console' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'all', label: 'All platforms' },
]

const SOURCES = [
  { id: 'friend', label: 'Friend / Discord' },
  { id: 'reddit', label: 'Reddit / Social' },
  { id: 'search', label: 'Google search' },
  { id: 'stream', label: 'Streamer / YouTube' },
  { id: 'other', label: 'Other' },
]

const PROFILE_KEY = 'gamecal_profile'

export interface UserProfileMeta {
  platform?: string
  signup_source?: string
  onboarding_completed?: boolean
}

export function loadProfileMeta(): UserProfileMeta {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveProfileMeta(meta: UserProfileMeta) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...loadProfileMeta(), ...meta }))
}

export function shouldShowOnboarding(): boolean {
  return !loadProfileMeta().onboarding_completed
}

interface SignupOnboardingProps {
  open: boolean
  games: Game[]
  onComplete: () => void
}

export function SignupOnboarding({ open, games, onComplete }: SignupOnboardingProps) {
  const { preferences, updatePreferences } = usePreferences()
  const detectedTz = detectBrowserTimezone()

  const [timezone, setTimezone] = useState(detectedTz)
  const [selectedGames, setSelectedGames] = useState<string[]>(
    preferences.selected_games.length ? preferences.selected_games : games.map((g) => g.slug)
  )
  const [platform, setPlatform] = useState('all')
  const [source, setSource] = useState('')
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(preferences.time_format)
  const [saving, setSaving] = useState(false)
  const timezoneOptions = getCommonTimezones(timezone)

  useEffect(() => {
    if (preferences.auto_timezone !== false) {
      setTimezone(detectedTz)
    } else if (preferences.timezone) {
      setTimezone(preferences.timezone)
    }
  }, [detectedTz, preferences.auto_timezone, preferences.timezone])

  const toggleGame = (slug: string) => {
    setSelectedGames((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    if (timezone === detectedTz) {
      localStorage.removeItem('gamecal_tz_manual')
    } else {
      localStorage.setItem('gamecal_tz_manual', '1')
    }
    await updatePreferences({
      timezone,
      selected_games: selectedGames,
      time_format: timeFormat,
      auto_timezone: timezone === detectedTz,
    })
    saveProfileMeta({
      platform,
      signup_source: source || undefined,
      onboarding_completed: true,
    })
    trackOnboardingCompleted({
      games: selectedGames,
      platform,
      signup_source: source || undefined,
    })
    setSaving(false)
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent data-testid="signup-onboarding" className="max-w-lg border-zinc-700 bg-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle>Welcome to GamerClock</DialogTitle>
          <DialogDescription>
            A few quick picks so events show in your timezone and your games appear first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Your timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger data-testid="onboarding-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timezoneOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz} ({formatTimezoneLabel(tz)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">Auto-detected: {formatTimezoneLabel(detectedTz)}</p>
          </div>

          <div className="space-y-2">
            <Label>Time format</Label>
            <Select value={timeFormat} onValueChange={(v) => setTimeFormat(v as '12h' | '24h')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (3:00 PM)</SelectItem>
                <SelectItem value="24h">24-hour (15:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Main platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger data-testid="onboarding-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Games you follow</Label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {games.map((game) => (
                <label key={game.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedGames.includes(game.slug)}
                    onCheckedChange={() => toggleGame(game.slug)}
                  />
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: game.brand_color }}
                  />
                  {game.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>How did you hear about us? (optional)</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger data-testid="onboarding-source">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          data-testid="onboarding-save"
          className="w-full"
          disabled={saving || selectedGames.length === 0}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Start my calendar'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
