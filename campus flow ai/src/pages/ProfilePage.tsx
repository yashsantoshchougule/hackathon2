import { useState } from 'react'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { uploadAvatar } from '../services/documentService'
import { updateProfile } from '../services/profileService'
import type { Profile } from '../types/auth'

function ProfileForm({ profile }: { profile: Profile }) {
  const { refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile.fullName)
  const [collegeName, setCollegeName] = useState(profile.collegeName ?? '')
  const [timezone, setTimezone] = useState(profile.timezone)
  const [minimumAttendance, setMinimumAttendance] = useState(String(profile.minimumAttendancePercentage))
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); setMessage(''); try { await updateProfile({ ...profile, fullName, collegeName, timezone, minimumAttendancePercentage: Number(minimumAttendance) }); await refreshProfile(); setMessage('Profile saved.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Profile could not be saved.') } finally { setPending(false) } }
  async function chooseAvatar(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setPending(true); setMessage(''); try { const avatarPath = await uploadAvatar(file); await updateProfile({ ...profile, avatarPath }); await refreshProfile(); setMessage('Avatar saved.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Avatar could not be saved.') } finally { setPending(false) } }
  return <main className="app-page"><section className="settings-card"><a className="brand" href="/dashboard">CampusFlow</a><h1>Your profile</h1><p className="muted">Role, email, course, and semester are protected outside this form.</p><form className="form-stack" onSubmit={submit}><label>Avatar<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} /></label><label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label><label>College<input value={collegeName} onChange={(event) => setCollegeName(event.target.value)} /></label><label>Timezone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} required /></label><label>Minimum attendance (%)<input type="number" min="0" max="100" value={minimumAttendance} onChange={(event) => setMinimumAttendance(event.target.value)} required /></label>{message && <p className={`notice ${message.endsWith('saved.') ? 'success' : 'error'}`} role="status">{message}</p>}<button disabled={pending} type="submit">{pending ? 'Saving…' : 'Save profile'}</button></form></section></main>
}

export function ProfilePage() {
  const { profile } = useAuth()
  return <ProtectedRoute>{profile && <ProfileForm profile={profile} />}</ProtectedRoute>
}
