import { googleAuthEnabled, supabase } from '../lib/supabase'
import type { SignUpInput } from '../types/auth'

const authRedirect = (path: string) => `${window.location.origin}${path}`

function throwAuthError(error: { message: string; code?: string } | null, fallback: string): never {
  if (error?.code === 'email_not_confirmed') throw new Error('Please confirm your email before signing in.')
  throw new Error(error?.message || fallback)
}

export async function signUp(input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName }, emailRedirectTo: authRedirect('/auth/callback') },
  })
  if (error) throwAuthError(error, 'Registration could not be completed.')
  return { needsEmailConfirmation: !data.session }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) throwAuthError(error, 'Invalid email or password.')
  return data.session
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throwAuthError(error, 'Could not sign out.')
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirect('/reset-password') })
  if (error) throwAuthError(error, 'Password reset could not be requested.')
}

export async function updatePassword(password: string, currentPassword?: string) {
  const { error } = await supabase.auth.updateUser({ password, ...(currentPassword ? { current_password: currentPassword } : {}) })
  if (error) throwAuthError(error, 'Password could not be updated.')
}

export async function signInWithGoogle() {
  if (!googleAuthEnabled) throw new Error('Google sign-in is not configured for this environment.')
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirect('/auth/callback') } })
  if (error) throwAuthError(error, 'Google sign-in could not be started.')
}
