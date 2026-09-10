import { useCallback, useEffect, useRef, useState } from 'react'
import { useAiClient } from './useAiClient'
import type { CopilotMode, CopilotResponse, DocumentSummary } from '../types/ai'

export function useStudyCopilot() {
  const api = useAiClient()
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [result, setResult] = useState<CopilotResponse | null>(null)
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const controller = useRef<AbortController | null>(null)

  const loadDocuments = useCallback(async () => {
    controller.current?.abort()
    controller.current = new AbortController()
    setLoadingDocuments(true)
    setError(null)
    try {
      setDocuments(await api.listDocuments(controller.current.signal))
    } catch (reason) {
      if ((reason as Error).name !== 'AbortError') setError(reason as Error)
    } finally {
      setLoadingDocuments(false)
    }
  }, [api])

  useEffect(() => {
    queueMicrotask(() => void loadDocuments())
    return () => controller.current?.abort()
  }, [loadDocuments])

  const query = useCallback(
    async (question: string, documentIds: string[], subjectId: string | undefined, mode: CopilotMode) => {
      setProcessing(true)
      setError(null)
      try {
        setResult(await api.queryCopilot(question, documentIds, subjectId, mode))
      } catch (reason) {
        setError(reason as Error)
      } finally {
        setProcessing(false)
      }
    },
    [api],
  )

  const upload = useCallback(
    async (file: File, subjectId?: string) => {
      setProcessing(true)
      setError(null)
      try {
        await api.processDocument(file, subjectId)
        await loadDocuments()
      } catch (reason) {
        setError(reason as Error)
      } finally {
        setProcessing(false)
      }
    },
    [api, loadDocuments],
  )

  return { documents, result, loadingDocuments, processing, error, query, upload, retry: loadDocuments }
}
