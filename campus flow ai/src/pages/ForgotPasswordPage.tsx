import { useState } from 'react'
import { AuthFrame, FormNotice } from '../components/auth/AuthFrame'
import { requestPasswordReset } from '../services/authService'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage('')
    try { await requestPasswordReset(email.trim()); setSent(true) } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to request a reset.') } finally { setPending(false) }
  }
  return <AuthFrame title="Reset your password" subtitle="We’ll send a reset link if this address can receive one.">
    <form onSubmit={submit} className="form-stack">
      <label>Email<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      {sent && <FormNotice kind="success" message="If the account is eligible, a reset link has been sent." />}
      {message && <FormNotice message={message} />}
      <button disabled={pending} type="submit">{pending ? 'Sending…' : 'Send reset link'}</button>
    </form>
    <p className="form-links"><a href="/login">Back to sign in</a></p>
  </AuthFrame>
}
