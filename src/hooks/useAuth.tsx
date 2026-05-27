'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/mock-data'

type AuthActionResult = { error: string | null }
type OAuthProvider = 'google' | 'apple'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isGuest: boolean
  signInWithGoogle: () => Promise<AuthActionResult>
  signInWithApple: () => Promise<AuthActionResult>
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>
  signUpWithEmail: (email: string, password: string) => Promise<AuthActionResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseConfigured = isSupabaseConfigured()

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    let mounted = true
    let unsubscribe: (() => void) | null = null

    import('@/lib/supabase/client').then(({ createClient }) => {
      if (!mounted) return
      const supabase = createClient()

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (session?.user) {
          const { data } = await supabase.from('user_preferences').select('id').eq('id', session.user.id).single()
          if (!data) {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
            await supabase.from('user_preferences').insert({ id: session.user.id, timezone: tz })
          }
          const { identifyUser } = await import('@/lib/posthog')
          identifyUser(session.user.id, { email: session.user.email })
        }
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [supabaseConfigured])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (!supabaseConfigured) {
      return { error: 'Supabase not configured. Set environment variables to enable auth.' }
    }
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }, [supabaseConfigured])

  const signInWithGoogle = useCallback(() => signInWithOAuth('google'), [signInWithOAuth])

  const signInWithApple = useCallback(() => signInWithOAuth('apple'), [signInWithOAuth])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) {
      return { error: 'Supabase not configured. Set environment variables to enable auth.' }
    }
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [supabaseConfigured])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) {
      return { error: 'Supabase not configured. Set environment variables to enable auth.' }
    }
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error: error?.message ?? null }
  }, [supabaseConfigured])

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return
    const { createClient } = await import('@/lib/supabase/client')
    const { resetUser } = await import('@/lib/posthog')
    const supabase = createClient()
    await supabase.auth.signOut()
    resetUser()
  }, [supabaseConfigured])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isGuest: !user,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
