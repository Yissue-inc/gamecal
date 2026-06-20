'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { adminFetch } from '@/lib/admin-fetch'
import {
  DEFAULT_PUBLIC_UI_SETTINGS,
  mergePublicUiSettings,
  type PublicUiSettings,
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Control public UI surfaces without changing production code.
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : (
        <section className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
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
              onChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  show_signup_onboarding: !prev.show_signup_onboarding,
                }))
              }
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
