import { useState } from 'react'
import { AuthFrame, FormNotice } from '../components/auth/AuthFrame'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (fullName.trim().length < 2) return setMessage('Enter your full name.')
    if (password.length < 8) return setMessage('Use a password with at least 8 characters.')
    if (password !== confirmPassword) return setMessage('Passwords do not match.')
    if (!terms) return setMessage('You must accept the privacy terms.')
    setPending(true); setMessage('')
    try {
      const { needsEmailConfirmation } = await signUp({ fullName: fullName.trim(), email: email.trim(), password })
      if (needsEmailConfirmation) setMessage('Check your email to confirm your account, then sign in.')
      else window.location.assign('/onboarding')
    } catch { setMessage('Registration could not be completed. Try signing in or contact support.') } finally { setPending(false) }
  }

  return <AuthFrame title="Create your account" subtitle="Every public account starts as a student account.">
    <form onSubmit={submit} className="form-stack">
      <label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
      <label>Email<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Password<input autoComplete="new-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label>Confirm password<input autoComplete="new-password" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
      <label className="checkbox"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /> I accept the privacy terms.</label>
      {message && <FormNotice message={message} kind={message.startsWith('Check') ? 'success' : 'error'} />}
      <button disabled={pending} type="submit">{pending ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p className="form-links"><a href="/login">Already have an account? Sign in</a></p>
  </AuthFrame>
}
