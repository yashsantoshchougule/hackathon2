import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { AiApiClient } from '../services/aiApi'

export function useAiClient() {
  const { session } = useAuth()
  return useMemo(() => new AiApiClient(async () => session?.access_token ?? null), [session])
}
