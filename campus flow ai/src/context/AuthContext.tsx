import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { supabase } from '../lib/supabase'
import * as authService from '../services/authService'
import { getAppRole, loadProfile } from '../services/profileService'
import type { AuthContextValue, SignUpInput } from '../types/auth'
import { authContext } from './AuthContextValue'

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<Omit<AuthContextValue, 'signIn' | 'signUp' | 'signInWithGoogle' | 'signOut' | 'refreshProfile'>>({
    user: null, session: null, profile: null, role: null, loading: true, profileLoading: false, isAuthenticated: false, isOnboarded: false,
  })

  const hydrate = useCallback(async (session: AuthContextValue['session']) => {
    if (!session) {
      setState({ user: null, session: null, profile: null, role: null, loading: false, profileLoading: false, isAuthenticated: false, isOnboarded: false })
      return
    }
    setState((current) => ({ ...current, user: session.user, session, loading: false, profileLoading: true, isAuthenticated: true }))
    try {
      const [profile, role] = await Promise.all([loadProfile(session.user.id), getAppRole(session.user.id)])
      setState({ user: session.user, session, profile, role, loading: false, profileLoading: false, isAuthenticated: true, isOnboarded: Boolean(profile?.onboardingCompleted) })
    } catch {
      setState((current) => ({ ...current, user: session.user, session, profile: null, role: null, loading: false, profileLoading: false, isAuthenticated: true, isOnboarded: false }))
    }
  }, [])

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => hydrate(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void hydrate(session) })
    return () => listener.subscription.unsubscribe()
  }, [hydrate])

  const signIn = useCallback(async (email: string, password: string) => { await authService.signIn(email, password) }, [])
  const signUp = useCallback((input: SignUpInput) => authService.signUp(input), [])
  const signInWithGoogle = useCallback(() => authService.signInWithGoogle(), [])
  const signOut = useCallback(async () => { await authService.signOut() }, [])
  const refreshProfile = useCallback(async () => { if (state.session) await hydrate(state.session) }, [hydrate, state.session])

  return <authContext.Provider value={useMemo(() => ({ ...state, signIn, signUp, signInWithGoogle, signOut, refreshProfile }), [state, signIn, signUp, signInWithGoogle, signOut, refreshProfile])}>{children}</authContext.Provider>
}
