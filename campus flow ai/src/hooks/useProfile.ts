import { useAuth } from './useAuth'

export function useProfile() {
  const { profile, profileLoading, refreshProfile } = useAuth()
  return { profile, loading: profileLoading, refresh: refreshProfile }
}
