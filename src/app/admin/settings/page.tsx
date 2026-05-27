'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { adminFetch } from '@/lib/admin-fetch'

interface PublicUiSettings {
  show_cinematic_intro: boolean
  show_signup_onboarding: boolean
}

const DEFAULT_SETTINGS: PublicUiSettings = {
  show_cinematic_intro: true,
  show_signup_onboarding: true,
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PublicUiSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch('/api/admin/site-settings')
    const data = await res.json()
    if (res.ok) {
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) })
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
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) })
      toast.success('Settings saved')
    } else {
      toast.error(data.error ?? 'Save failed')
    }
  }

  const toggle = (key: keyof PublicUiSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Control first-visit surfaces without changing production code.
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : (
        <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
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
