import { useState } from 'react'
import { AuthFrame, FormNotice } from '../components/auth/AuthFrame'
import { updatePassword } from '../services/authService'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 8) return setMessage('Use a password with at least 8 characters.')
    if (password !== confirm) return setMessage('Passwords do not match.')
    setPending(true); setMessage('')
    try { await updatePassword(password); setMessage('Password updated. You can now continue.') } catch (error) { setMessage(error instanceof Error ? error.message : 'The reset link is invalid or expired.') } finally { setPending(false) }
  }
  return <AuthFrame title="Choose a new password" subtitle="This page only works from a valid password-reset link.">
    <form onSubmit={submit} className="form-stack">
      <label>New password<input autoComplete="new-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label>Confirm password<input autoComplete="new-password" type="password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>
      {message && <FormNotice kind={message.startsWith('Password updated') ? 'success' : 'error'} message={message} />}
      <button disabled={pending} type="submit">{pending ? 'Updating…' : 'Update password'}</button>
    </form>
  </AuthFrame>
}
