import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { AiApiClient } from '../services/aiApi'

export function useAiClient() {
  const { getAccessToken } = useAuth()
  return useMemo(() => new AiApiClient(getAccessToken), [getAccessToken])
}
