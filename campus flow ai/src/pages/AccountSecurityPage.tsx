import { useState } from 'react'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { updatePassword } from '../services/authService'

export function AccountSecurityPage() {
  const { user, signOut } = useAuth()
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [message, setMessage] = useState(''); const [pending, setPending] = useState(false)
  async function submit(event: React.FormEvent) { event.preventDefault(); if (newPassword.length < 8) return setMessage('Use a password with at least 8 characters.'); setPending(true); setMessage(''); try { await updatePassword(newPassword, currentPassword); setCurrentPassword(''); setNewPassword(''); setMessage('Password updated.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Password could not be updated.') } finally { setPending(false) } }
  return <ProtectedRoute><main className="app-page"><section className="settings-card"><a className="brand" href="/dashboard">CampusFlow</a><h1>Account security</h1><p className="muted">Signed in as {user?.email ?? 'your account'}.</p><form className="form-stack" onSubmit={submit}><label>Current password<input autoComplete="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>New password<input autoComplete="new-password" type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>{message && <p className={`notice ${message === 'Password updated.' ? 'success' : 'error'}`} role="status">{message}</p>}<button disabled={pending} type="submit">{pending ? 'Updating…' : 'Change password'}</button></form><button className="secondary" onClick={() => void signOut().then(() => window.location.assign('/login'))}>Sign out of this session</button></section></main></ProtectedRoute>
}
