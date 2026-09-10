import { useEffect, useState } from 'react'
import { AuthFrame, FormNotice } from '../components/auth/AuthFrame'
import { supabase } from '../lib/supabase'

export function AuthCallbackPage() {
  const callbackError = new URLSearchParams(window.location.search).get('error_description') || new URLSearchParams(window.location.search).get('error')
  const code = new URLSearchParams(window.location.search).get('code')
  const [message, setMessage] = useState(() => callbackError ? 'Sign-in could not be completed. Please try again.' : 'Completing sign-in…')
  useEffect(() => {
    if (callbackError) return
    void (async () => {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) { setMessage('This sign-in link is invalid or expired.'); return }
      }
      const { data } = await supabase.auth.getSession()
      if (!data.session) { setMessage('No active session was found. Please sign in again.'); return }
      window.location.replace('/dashboard')
    })()
  }, [callbackError, code])
  return <AuthFrame title="Authenticating" subtitle="CampusFlow is securely completing your sign-in."><FormNotice kind={message === 'Completing sign-in…' ? 'success' : 'error'} message={message} /></AuthFrame>
}
