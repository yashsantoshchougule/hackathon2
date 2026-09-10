import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext, type AuthValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const handleExpiredSession = () => {
      void client.auth.signOut({ scope: 'local' })
    }
    window.addEventListener('campusflow:session-expired', handleExpiredSession)
    return () => window.removeEventListener('campusflow:session-expired', handleExpiredSession)
  }, [])

  const getAccessToken = useCallback(async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut({ scope: 'local' })
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured: isSupabaseConfigured,
      getAccessToken,
      signOut,
    }),
    [getAccessToken, loading, session, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
