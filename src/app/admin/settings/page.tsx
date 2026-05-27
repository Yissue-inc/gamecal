'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { adminFetch } from '@/lib/admin-fetch'
import {
  DEFAULT_PUBLIC_UI_SETTINGS,
  mergePublicUiSettings,
  type PublicUiSettings,
  type CinematicIntroSettings,
} from '@/lib/public-ui-settings'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PublicUiSettings>(DEFAULT_PUBLIC_UI_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch('/api/admin/site-settings')
    const data = await res.json()
    if (res.ok) {
      setSettings(mergePublicUiSettings(data.settings ?? {}))
    } else {
      toast.error(data.error ?? 'Failed to load settings')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    const res = await adminFetch('/api/admin/site-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    const data = await res.json()
    setSaving(false)

    if (res.ok) {
      setSettings(mergePublicUiSettings(data.settings ?? {}))
      toast.success('Settings saved')
    } else {
      toast.error(data.error ?? 'Save failed')
    }
  }

  const toggle = (key: keyof PublicUiSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const patchCinematic = (patch: Partial<CinematicIntroSettings>) => {
    setSettings((prev) => ({
      ...prev,
      cinematic_intro: {
        ...prev.cinematic_intro,
        ...patch,
      },
    }))
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Control first-visit surfaces without changing production code.
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : (
        <section className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <span>
              <span className="block font-semibold text-white">Cinematic intro</span>
              <span className="text-sm text-zinc-500">Show the first-visit animation overlay.</span>
            </span>
            <input
              type="checkbox"
              checked={settings.show_cinematic_intro}
              onChange={() => toggle('show_cinematic_intro')}
              className="h-5 w-5"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <span>
              <span className="block font-semibold text-white">Signup onboarding</span>
              <span className="text-sm text-zinc-500">
                Show the timezone and followed-games setup modal after sign-in.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.show_signup_onboarding}
              onChange={() => toggle('show_signup_onboarding')}
              className="h-5 w-5"
            />
          </label>

          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Cinematic intro editor</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Copy and animation settings saved here are used by the real first-visit intro.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="/?replay=cinematic" target="_blank" rel="noopener noreferrer">
                  Preview Intro
                </a>
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-zinc-500">
                  Eyebrow override
                  <Input
                    value={settings.cinematic_intro.eyebrow}
                    placeholder="Leave empty to use featured event game"
                    onChange={(event) => patchCinematic({ eyebrow: event.target.value })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Accent color
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.cinematic_intro.accentColor}
                      onChange={(event) => patchCinematic({ accentColor: event.target.value })}
                      className="h-10 w-14 border-zinc-800 bg-zinc-950 p-1"
                    />
                    <Input
                      value={settings.cinematic_intro.accentColor}
                      onChange={(event) => patchCinematic({ accentColor: event.target.value })}
                      className="border-zinc-800 bg-zinc-950 text-white"
                    />
                  </div>
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Title override
                  <Input
                    value={settings.cinematic_intro.title}
                    placeholder="Leave empty to use featured event title"
                    onChange={(event) => patchCinematic({ title: event.target.value })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Title accent
                  <Input
                    value={settings.cinematic_intro.titleAccent}
                    placeholder="Optional second line"
                    onChange={(event) => patchCinematic({ titleAccent: event.target.value })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500 md:col-span-2">
                  Subtitle override
                  <Textarea
                    value={settings.cinematic_intro.subtitle}
                    placeholder="Leave empty to use featured event metadata"
                    onChange={(event) => patchCinematic({ subtitle: event.target.value })}
                    className="min-h-20 border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Primary CTA
                  <Input
                    value={settings.cinematic_intro.primaryCta}
                    onChange={(event) => patchCinematic({ primaryCta: event.target.value })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Secondary CTA
                  <Input
                    value={settings.cinematic_intro.secondaryCta}
                    onChange={(event) => patchCinematic({ secondaryCta: event.target.value })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Brand label
                  <Input
                    value={settings.cinematic_intro.brandLabel}
                    onChange={(event) => patchCinematic({ brandLabel: event.target.value })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Sponsor label
                  <Input
                    value={settings.cinematic_intro.sponsorLabel}
                    onChange={(event) => patchCinematic({ sponsorLabel: event.target.value })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Animation
                  <select
                    value={settings.cinematic_intro.animationStyle}
                    onChange={(event) =>
                      patchCinematic({
                        animationStyle: event.target.value as CinematicIntroSettings['animationStyle'],
                      })
                    }
                    className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white"
                  >
                    <option value="dragon">Dragon flyover</option>
                    <option value="embers">Embers only</option>
                    <option value="minimal">Minimal fade</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Auto dismiss ms
                  <Input
                    type="number"
                    min={2500}
                    max={15000}
                    step={250}
                    value={settings.cinematic_intro.autoDismissMs}
                    onChange={(event) => patchCinematic({ autoDismissMs: Number(event.target.value) })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Letterbox height
                  <Input
                    type="number"
                    min={0}
                    max={160}
                    value={settings.cinematic_intro.letterboxHeight}
                    onChange={(event) => patchCinematic({ letterboxHeight: Number(event.target.value) })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-500">
                  Backdrop blur
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={settings.cinematic_intro.backdropBlur}
                    onChange={(event) => patchCinematic({ backdropBlur: Number(event.target.value) })}
                    className="border-zinc-800 bg-zinc-950 text-white"
                  />
                </label>
              </div>

              <div className="overflow-hidden rounded-md border border-zinc-800 bg-[#101014]">
                <div
                  className="relative flex aspect-video flex-col items-center justify-center px-6 text-center"
                  style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.78), rgba(0,0,0,${settings.cinematic_intro.backdropOpacity / 100}))`,
                  }}
                >
                  <div
                    className="absolute left-0 right-0 top-0 bg-black"
                    style={{ height: `${Math.max(8, settings.cinematic_intro.letterboxHeight / 4)}px` }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black"
                    style={{ height: `${Math.max(8, settings.cinematic_intro.letterboxHeight / 4)}px` }}
                  />
                  <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: settings.cinematic_intro.accentColor }}>
                    {settings.cinematic_intro.eyebrow || 'Featured Game'}
                  </span>
                  <h3 className="text-2xl font-black text-white">
                    {settings.cinematic_intro.title || 'Featured Event Title'}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    {settings.cinematic_intro.subtitle || 'Event type · Live Now'}
                  </p>
                  <span className="mt-4 rounded px-4 py-2 text-xs font-bold text-black" style={{ backgroundColor: settings.cinematic_intro.accentColor }}>
                    {settings.cinematic_intro.primaryCta}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}
