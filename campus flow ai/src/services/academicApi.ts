import { AcademicApiError, type AcademicApiErrorPayload, type Assignment, type AssignmentInput, type AttendanceSimulation, type AttendanceSummary, type DashboardSummary, type Examination, type ExaminationInput, type ListResult, type Reminder, type ReminderInput, type TimetableEntry, type TimetableInput } from '../types/academic'

export type AccessTokenResolver = () => Promise<string | null>
let accessTokenResolver: AccessTokenResolver | null = null
const activeMutations = new Map<string, Promise<unknown>>()
const baseUrl = (import.meta.env.VITE_ACADEMIC_API_URL || '/api').replace(/\/$/, '')

/** Called once by the existing AuthContext after it has verified a Supabase session. */
export const configureAcademicAuth = (resolver: AccessTokenResolver) => { accessTokenResolver = resolver }
export const clearAcademicAuth = () => { accessTokenResolver = null }
export const isAcademicAuthConfigured = () => accessTokenResolver !== null

const query = (params: Record<string, string | number | boolean | null | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.set(key, String(value)) })
  const value = search.toString()
  return value ? `?${value}` : ''
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = accessTokenResolver ? await accessTokenResolver() : null
  if (!token) throw new AcademicApiError('Sign in to access your protected academic records.', 401, 'AUTHENTICATION_REQUIRED')
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => ({})) as T & AcademicApiErrorPayload
  if (!response.ok) {
    const error = payload as AcademicApiErrorPayload
    throw new AcademicApiError(error.error?.message || error.detail || 'CampusFlow could not complete that request.', response.status, error.error?.code || `HTTP_${response.status}`, error.error?.request_id)
  }
  return payload as T
}

function mutation<T>(key: string, callback: () => Promise<T>): Promise<T> {
  const current = activeMutations.get(key) as Promise<T> | undefined
  if (current) return current
  const pending = callback().finally(() => activeMutations.delete(key))
  activeMutations.set(key, pending)
  return pending
}

export const academicApi = {
  summary: (signal?: AbortSignal) => request<DashboardSummary>('/academics/dashboard-summary', { signal }),
  assignments: (params: { search?: string; subject_id?: string; status?: string; priority?: string; sort?: string; page?: number; page_size?: number } = {}, signal?: AbortSignal) => request<ListResult<Assignment>>(`/assignments${query(params)}`, { signal }),
  assignment: (id: string, signal?: AbortSignal) => request<Assignment>(`/assignments/${encodeURIComponent(id)}`, { signal }),
  createAssignment: (input: AssignmentInput) => mutation(`assignment:create:${input.title}:${input.due_at || ''}`, () => request<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(input) })),
  updateAssignment: (id: string, input: Partial<AssignmentInput>) => mutation(`assignment:update:${id}`, () => request<Assignment>(`/assignments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })),
  setAssignmentStatus: (id: string, status: 'not_started' | 'in_progress' | 'completed') => mutation(`assignment:status:${id}`, () => request<Assignment>(`/assignments/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })),
  deleteAssignment: (id: string) => mutation(`assignment:delete:${id}`, () => request<void>(`/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' })),
  timetable: (params: { from?: string; to?: string; view?: 'day' | 'week' } = {}, signal?: AbortSignal) => request<ListResult<TimetableEntry>>(`/timetable${query(params)}`, { signal }),
  timetableEntry: (id: string, signal?: AbortSignal) => request<TimetableEntry>(`/timetable/${encodeURIComponent(id)}`, { signal }),
  createTimetableEntry: (input: TimetableInput) => mutation(`timetable:create:${input.starts_at}:${input.ends_at}`, () => request<TimetableEntry>('/timetable', { method: 'POST', body: JSON.stringify(input) })),
  updateTimetableEntry: (id: string, input: Partial<TimetableInput>) => mutation(`timetable:update:${id}`, () => request<TimetableEntry>(`/timetable/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })),
  deleteTimetableEntry: (id: string) => mutation(`timetable:delete:${id}`, () => request<void>(`/timetable/${encodeURIComponent(id)}`, { method: 'DELETE' })),
  timetableConflicts: (params: { from?: string; to?: string } = {}, signal?: AbortSignal) => request<ListResult<{ first_entry_id: string; second_entry_id: string; reason: string }>>(`/timetable/conflicts${query(params)}`, { signal }),
  examinations: (params: { subject_id?: string; upcoming?: boolean; page?: number; page_size?: number } = {}, signal?: AbortSignal) => request<ListResult<Examination>>(`/examinations${query(params)}`, { signal }),
  examination: (id: string, signal?: AbortSignal) => request<Examination>(`/examinations/${encodeURIComponent(id)}`, { signal }),
  createExamination: (input: ExaminationInput) => mutation(`exam:create:${input.subject_id}:${input.starts_at}`, () => request<Examination>('/examinations', { method: 'POST', body: JSON.stringify(input) })),
  updateExamination: (id: string, input: Partial<ExaminationInput>) => mutation(`exam:update:${id}`, () => request<Examination>(`/examinations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })),
  deleteExamination: (id: string) => mutation(`exam:delete:${id}`, () => request<void>(`/examinations/${encodeURIComponent(id)}`, { method: 'DELETE' })),
  attendance: (signal?: AbortSignal) => request<AttendanceSummary>('/attendance', { signal }),
  attendanceRisks: (signal?: AbortSignal) => request<AttendanceSummary>('/attendance/risks', { signal }),
  attendanceWhatIf: (subjectId: string, futureClasses: number, action: 'attend' | 'miss') => request<AttendanceSimulation>('/attendance/what-if', { method: 'POST', body: JSON.stringify({ subject_id: subjectId, future_classes: futureClasses, action }) }),
  reminders: (params: { status?: string; page?: number; page_size?: number } = {}, signal?: AbortSignal) => request<ListResult<Reminder>>(`/reminders${query(params)}`, { signal }),
  createReminder: (input: ReminderInput) => mutation(`reminder:create:${input.title}:${input.scheduled_at}`, () => request<Reminder>('/reminders', { method: 'POST', body: JSON.stringify(input) })),
  updateReminder: (id: string, input: Partial<ReminderInput>) => mutation(`reminder:update:${id}`, () => request<Reminder>(`/reminders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })),
  completeReminder: (id: string) => mutation(`reminder:complete:${id}`, () => request<Reminder>(`/reminders/${encodeURIComponent(id)}/complete`, { method: 'PATCH' })),
  deleteReminder: (id: string) => mutation(`reminder:delete:${id}`, () => request<void>(`/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' })),
}
