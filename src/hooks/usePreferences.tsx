'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { UserPreferences } from '@/types'
import { DEFAULT_PREFERENCES } from '@/types'
import { useAuth } from '@/hooks/useAuth'

const STORAGE_KEY = 'gamecal_preferences'

interface PreferencesContextValue {
  preferences: UserPreferences
  loading: boolean
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  setSelectedGames: (games: string[]) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

function loadLocalPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return { id: 'guest', ...DEFAULT_PREFERENCES }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { id: 'guest', ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
  } catch {
    // ignore
  }
  return { id: 'guest', ...DEFAULT_PREFERENCES }
}

function saveLocalPreferences(prefs: Partial<UserPreferences>) {
  const current = loadLocalPreferences()
  const merged = { ...current, ...prefs }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>(loadLocalPreferences)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) {
        setPreferences(loadLocalPreferences())
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/preferences')
        if (res.ok) {
          const data = await res.json()
          setPreferences(data.preferences)
        }
      } catch {
        setPreferences(loadLocalPreferences())
      }
      setLoading(false)
    }
    load()
  }, [user])

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!user) {
        const merged = saveLocalPreferences(updates)
        setPreferences(merged)
        return
      }

      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        const data = await res.json()
        setPreferences(data.preferences)
      }
    },
    [user]
  )

  const setSelectedGames = useCallback(
    (games: string[]) => {
      updatePreferences({ selected_games: games })
    },
    [updatePreferences]
  )

  return (
    <PreferencesContext.Provider value={{ preferences, loading, updatePreferences, setSelectedGames }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
