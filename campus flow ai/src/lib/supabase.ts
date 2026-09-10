import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error('CampusFlow requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
}

export const googleAuthEnabled = import.meta.env.VITE_SUPABASE_GOOGLE_ENABLED === 'true'
export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
