import { useCallback, useEffect, useRef, useState } from 'react'
import { useAiClient } from './useAiClient'
import type { StudyPlan } from '../types/ai'

export function useStudyPlanner() {
  const api = useAiClient()
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    controller.current?.abort()
    controller.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      setPlan(await api.currentPlan(controller.current.signal))
    } catch (reason) {
      if ((reason as Error).name !== 'AbortError') setError(reason as Error)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    queueMicrotask(() => void load())
    return () => controller.current?.abort()
  }, [load])

  const generate = useCallback(
    async (recoveryMode = false) => {
      setProcessing(true)
      setError(null)
      try {
        setPlan(await api.generatePlan(recoveryMode))
      } catch (reason) {
        setError(reason as Error)
      } finally {
        setProcessing(false)
      }
    },
    [api],
  )

  const review = useCallback(
    async (action: 'confirm' | 'reject') => {
      if (!plan || processing) return
      setProcessing(true)
      setError(null)
      try {
        setPlan(await api.reviewPlan(plan.id, action))
      } catch (reason) {
        setError(reason as Error)
      } finally {
        setProcessing(false)
      }
    },
    [api, plan, processing],
  )

  return { plan, loading, processing, error, load, generate, review }
}
