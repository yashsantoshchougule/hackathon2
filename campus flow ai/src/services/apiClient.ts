import { supabase } from '../lib/supabase'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function accessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const request = async (token: string) => fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${token}` },
  })
  let token = await accessToken()
  if (!token) throw new ApiError(401, 'Please sign in to continue.')
  let response = await request(token)
  if (response.status === 401) {
    const { data } = await supabase.auth.refreshSession()
    token = data.session?.access_token
    if (token) response = await request(token)
  }
  if (response.status === 401) {
    await supabase.auth.signOut({ scope: 'local' })
    const returnTo = `${window.location.pathname}${window.location.search}`
    window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new ApiError(response.status, body?.error?.message || 'The request could not be completed.')
  }
  return response
}
