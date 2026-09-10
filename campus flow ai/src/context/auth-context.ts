import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthValue {
  user: User | null
  session: Session | null
  loading: boolean
  configured: boolean
  getAccessToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
