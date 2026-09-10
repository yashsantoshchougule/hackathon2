import { useCallback, useEffect, useRef, useState } from 'react'
import { useAiClient } from './useAiClient'
import type { NoticeExtraction, NoticeFieldKey, NoticeFields } from '../types/ai'

export function useNoticeIntelligence(noticeId?: string) {
  const api = useAiClient()
  const [extraction, setExtraction] = useState<NoticeExtraction | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!noticeId) return
    controller.current?.abort()
    controller.current = new AbortController()
    setProcessing(true)
    setError(null)
    try {
      setExtraction(await api.getNotice(noticeId, controller.current.signal))
    } catch (reason) {
      if ((reason as Error).name !== 'AbortError') setError(reason as Error)
    } finally {
      setProcessing(false)
    }
  }, [api, noticeId])

  useEffect(() => {
    queueMicrotask(() => void load())
    return () => controller.current?.abort()
  }, [load])

  const extract = useCallback(
    async (file: File) => {
      setProcessing(true)
      setError(null)
      try {
        const result = await api.extractNotice(file)
        setExtraction(result)
        return result
      } catch (reason) {
        setError(reason as Error)
        return null
      } finally {
        setProcessing(false)
      }
    },
    [api],
  )

  const updateField = useCallback((key: NoticeFieldKey, value: string) => {
    setExtraction((current) => {
      if (!current) return current
      return {
        ...current,
        fields: { ...current.fields, [key]: { ...current.fields[key], value, requires_confirmation: true } },
      }
    })
  }, [])

  const review = useCallback(
    async (action: 'confirm' | 'reject') => {
      if (!extraction || processing) return
      setProcessing(true)
      setError(null)
      try {
        setExtraction(await api.reviewNotice(extraction.notice_id, action, extraction.fields as NoticeFields))
      } catch (reason) {
        setError(reason as Error)
      } finally {
        setProcessing(false)
      }
    },
    [api, extraction, processing],
  )

  return { extraction, processing, error, extract, updateField, review, retry: load }
}
