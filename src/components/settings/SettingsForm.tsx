'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
} from '@/components/ui/dialog'
import { usePreferences } from '@/hooks/usePreferences'
import { useAuth } from '@/hooks/useAuth'
import { DEFAULT_SELECTED_GAMES } from '@/types'

const SECTIONS = ['General', 'Time Zone', 'Calendar View', 'My Games', 'Account'] as const

const TIMEZONES = Intl.supportedValuesOf('timeZone')

interface SettingsFormProps {
  email: string
  onSaved: () => void
}

export function SettingsForm({ email, onSaved }: SettingsFormProps) {
  const { preferences, updatePreferences } = usePreferences()
  const { signOut } = useAuth()
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]>('General')
  const [form, setForm] = useState(preferences)
  const [secondaryEnabled, setSecondaryEnabled] = useState(!!preferences.secondary_timezone)
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const handleSave = async () => {
    await updatePreferences(form)
    onSaved()
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div data-testid="settings-form" className="mx-auto flex max-w-5xl gap-8 px-6 py-8">
      <nav className="sticky top-8 hidden w-48 shrink-0 md:block">
        <ul className="space-y-1">
          {SECTIONS.map((section) => (
            <li key={section}>
              <button
                type="button"
                data-testid={`settings-nav-${section.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setActiveSection(section)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  activeSection === section ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {section}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex-1 space-y-8">
        {activeSection === 'General' && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">General</h2>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => update('language', v)}>
                <SelectTrigger data-testid="language-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (US)</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date format</Label>
              <Select value={form.date_format} onValueChange={(v) => update('date_format', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time format</Label>
              <Select value={form.time_format} name="time_format" onValueChange={(v) => update('time_format', v as '12h' | '24h')}>
                <SelectTrigger data-testid="time-format-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (1:00 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (13:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button data-testid="settings-save-btn" onClick={handleSave}>Save</Button>
          </section>
        )}

        {activeSection === 'Time Zone' && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">Time Zone</h2>
            <div className="space-y-2">
              <Label>Primary timezone</Label>
              <Select value={form.timezone} name="timezone" onValueChange={(v) => update('timezone', v)}>
                <SelectTrigger data-testid="timezone-select"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={secondaryEnabled} onCheckedChange={setSecondaryEnabled} />
              <Label>Secondary timezone</Label>
            </div>
            {secondaryEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  value={form.secondary_timezone ?? ''}
                  onValueChange={(v) => update('secondary_timezone', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  maxLength={5}
                  placeholder="Label (e.g. US)"
                  value={form.timezone_label}
                  onChange={(e) => update('timezone_label', e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="auto-tz" defaultChecked />
              <Label htmlFor="auto-tz">Auto-detect timezone from browser</Label>
            </div>
            <Button data-testid="settings-save-btn" onClick={handleSave}>Save</Button>
          </section>
        )}

        {activeSection === 'Calendar View' && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">Calendar View</h2>
            <div className="space-y-2">
              <Label>Week starts on</Label>
              <Select
                value={String(form.week_starts_on)}
                name="week_starts_on"
                onValueChange={(v) => update('week_starts_on', Number(v) as 0 | 1)}
              >
                <SelectTrigger data-testid="week-starts-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="weekends"
                checked={form.show_weekends}
                onCheckedChange={(c) => update('show_weekends', !!c)}
              />
              <Label htmlFor="weekends">Show weekends</Label>
            </div>
            <Button data-testid="settings-save-btn" onClick={handleSave}>Save</Button>
          </section>
        )}

        {activeSection === 'My Games' && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">My Games</h2>
            <div className="space-y-2">
              {DEFAULT_SELECTED_GAMES.map((slug) => (
                <div key={slug} className="flex items-center gap-2">
                  <Checkbox
                    id={`game-${slug}`}
                    checked={form.selected_games.includes(slug)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...form.selected_games, slug]
                        : form.selected_games.filter((s) => s !== slug)
                      update('selected_games', next)
                    }}
                  />
                  <Label htmlFor={`game-${slug}`} className="capitalize">
                    {slug.replace('-', ' ')}
                  </Label>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => setSubscribeOpen(true)}>
              Subscribe All Calendars
            </Button>
            <Button data-testid="settings-save-btn" onClick={handleSave}>Save</Button>
          </section>
        )}

        {activeSection === 'Account' && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">Account</h2>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <Button data-testid="signout-settings-btn" variant="destructive" onClick={() => setSignOutOpen(true)}>
              Sign Out
            </Button>
          </section>
        )}
      </div>

      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ICS Calendar Subscription</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Subscribe to all game calendars using these webcal links in Google Calendar, Apple Calendar, or Outlook.
          </p>
          <div className="space-y-2 text-sm">
            {DEFAULT_SELECTED_GAMES.map((slug) => (
              <div key={slug} className="rounded border border-zinc-800 p-2">
                <span className="capitalize">{slug.replace('-', ' ')}</span>
                <code className="mt-1 block text-xs text-primary">
                  webcal://{typeof window !== 'undefined' ? window.location.host : 'gamecal.io'}/api/feed/{slug}
                </code>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">You will need to sign in again to access all events.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSignOutOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => signOut()}>Sign Out</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
