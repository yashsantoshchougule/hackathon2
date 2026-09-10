import { useState } from 'react'
import { AuthFrame, FormNotice } from '../components/auth/AuthFrame'
import { googleAuthEnabled } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const destination = new URLSearchParams(window.location.search).get('returnTo')
  const returnTo = destination?.startsWith('/') ? destination : '/dashboard'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true); setMessage('')
    try { await signIn(email.trim(), password); window.location.assign(returnTo) } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sign in.') } finally { setPending(false) }
  }

  return <AuthFrame title="Welcome back" subtitle="Sign in to continue your academic flow.">
    <form onSubmit={submit} className="form-stack">
      <label>Email<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Password<div className="password-field"><input autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="text-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
      {message && <FormNotice message={message} />}
      <button disabled={pending} type="submit">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
    {googleAuthEnabled && <button className="secondary" onClick={() => void signInWithGoogle().catch((error: Error) => setMessage(error.message))}>Continue with Google</button>}
    <p className="form-links"><a href="/forgot-password">Forgot password?</a><a href="/register">Create account</a></p>
  </AuthFrame>
}
