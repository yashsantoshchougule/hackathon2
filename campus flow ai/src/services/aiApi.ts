import type {
  ApiErrorBody,
  AssistantRequest,
  AssistantResponse,
  CopilotMode,
  CopilotResponse,
  DashboardSummary,
  DocumentSummary,
  DocumentUploadResponse,
  NoticeExtraction,
  NoticeFields,
  StudyPlan,
} from '../types/ai'

const baseUrl = (import.meta.env.VITE_AI_API_URL || '').replace(/\/$/, '')
const inFlight = new Map<string, Promise<unknown>>()

export class AiApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

function fallbackMessage(status: number) {
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to access this information.'
  if (status === 422) return 'Check the information you entered and try again.'
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status === 503) return 'The AI service is temporarily unavailable.'
  return 'CampusFlow could not complete the request.'
}

export class AiApiClient {
  private readonly getAccessToken: () => Promise<string | null>

  constructor(getAccessToken: () => Promise<string | null>) {
    this.getAccessToken = getAccessToken
  }

  private async request<T>(path: string, init: RequestInit = {}, deduplicate = false): Promise<T> {
    const bodyKey = typeof init.body === 'string'
      ? init.body
      : init.body instanceof FormData
        ? [...init.body.entries()]
            .map(([name, value]) => `${name}:${value instanceof File ? `${value.name}:${value.size}` : value}`)
            .join('|')
        : ''
    const key = `${init.method || 'GET'}:${path}:${bodyKey}`
    if (deduplicate) {
      const existing = inFlight.get(key)
      if (existing) return existing as Promise<T>
    }
    const operation = this.perform<T>(path, init)
    if (deduplicate) inFlight.set(key, operation)
    try {
      return await operation
    } finally {
      if (deduplicate) inFlight.delete(key)
    }
  }

  private async perform<T>(path: string, init: RequestInit): Promise<T> {
    const token = await this.getAccessToken()
    if (!token) {
      throw new AiApiError('Your session has expired. Please sign in again.', 401, 'AUTH_REQUIRED')
    }
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('X-Request-ID', crypto.randomUUID())
    if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, { ...init, headers })
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') throw reason
      throw new AiApiError('Network connection failed. Check your connection and try again.', 0, 'NETWORK_ERROR')
    }
    if (response.status === 204) return null as T
    if (!response.ok) {
      let body: ApiErrorBody = {}
      try {
        body = (await response.json()) as ApiErrorBody
      } catch {
        // The controlled fallback below remains truthful for non-JSON infrastructure errors.
      }
      const error = body.error
      if (response.status === 401) window.dispatchEvent(new CustomEvent('campusflow:session-expired'))
      throw new AiApiError(
        error?.message || fallbackMessage(response.status),
        response.status,
        error?.code || 'REQUEST_FAILED',
        error?.request_id,
      )
    }
    return (await response.json()) as T
  }

  chat(payload: AssistantRequest, signal?: AbortSignal) {
    return this.request<AssistantResponse>(
      '/api/assistant/chat',
      { method: 'POST', body: JSON.stringify(payload), signal },
      true,
    )
  }

  currentPlan(signal?: AbortSignal) {
    return this.request<StudyPlan | null>('/api/planner/current', { signal })
  }

  generatePlan(recoveryMode: boolean, signal?: AbortSignal) {
    return this.request<StudyPlan>(
      '/api/planner/generate',
      { method: 'POST', body: JSON.stringify({ recovery_mode: recoveryMode }), signal },
      true,
    )
  }

  reviewPlan(planId: string, action: 'confirm' | 'reject', signal?: AbortSignal) {
    return this.request<StudyPlan>(`/api/planner/${planId}/${action}`, { method: 'POST', signal }, true)
  }

  extractNotice(file: File, signal?: AbortSignal) {
    const form = new FormData()
    form.append('file', file)
    return this.request<NoticeExtraction>('/api/notices/extract', { method: 'POST', body: form, signal }, true)
  }

  getNotice(noticeId: string, signal?: AbortSignal) {
    return this.request<NoticeExtraction>(`/api/notices/${noticeId}`, { signal })
  }

  reviewNotice(
    noticeId: string,
    action: 'confirm' | 'reject',
    fields: NoticeFields,
    signal?: AbortSignal,
  ) {
    return this.request<NoticeExtraction>(
      `/api/notices/${noticeId}/${action}`,
      { method: 'POST', body: JSON.stringify({ fields }), signal },
      true,
    )
  }

  listDocuments(signal?: AbortSignal) {
    return this.request<DocumentSummary[]>('/api/documents', { signal })
  }

  processDocument(file: File, subjectId?: string, signal?: AbortSignal) {
    const form = new FormData()
    form.append('file', file)
    if (subjectId) form.append('subject_id', subjectId)
    return this.request<DocumentUploadResponse>('/api/documents/process', { method: 'POST', body: form, signal }, true)
  }

  queryCopilot(
    question: string,
    documentIds: string[],
    subjectId: string | undefined,
    mode: CopilotMode,
    signal?: AbortSignal,
  ) {
    return this.request<CopilotResponse>(
      '/api/copilot/query',
      {
        method: 'POST',
        body: JSON.stringify({ question, document_ids: documentIds, subject_id: subjectId || null, mode }),
        signal,
      },
      true,
    )
  }

  dashboardSummary(signal?: AbortSignal) {
    return this.request<DashboardSummary>('/api/dashboard/ai-summary', { signal })
  }
}
