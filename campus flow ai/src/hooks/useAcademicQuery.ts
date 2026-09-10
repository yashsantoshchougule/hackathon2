import { useCallback, useEffect, useState } from 'react'
import { AcademicApiError } from '../types/academic'

export interface AcademicQuery<T> { data: T | null; loading: boolean; error: AcademicApiError | null; refresh: () => void }
export function useAcademicQuery<T>(loader: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[] = []): AcademicQuery<T> {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: AcademicApiError | null }>({ data: null, loading: true, error: null })
  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setState((previous) => ({ ...previous, loading: true, error: null }))
    loader(controller.signal).then((data) => { if (!controller.signal.aborted) setState({ data, loading: false, error: null }) }).catch((error: unknown) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return
      setState((previous) => ({ ...previous, loading: false, error: error instanceof AcademicApiError ? error : new AcademicApiError('Unable to reach the academic service.', 503, 'ACADEMIC_SERVICE_UNAVAILABLE') }))
    })
    return () => controller.abort()
  // Loader call sites intentionally provide stable dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])
  return { ...state, refresh }
}
