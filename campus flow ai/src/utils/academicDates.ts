import type { Assignment, AssignmentStatus } from '../types/academic'

const displayZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
export const studentTimezone = displayZone
export const displayDate = (value?: string | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => value ? new Intl.DateTimeFormat(undefined, { ...options, timeZone: displayZone() }).format(new Date(value)) : 'Not scheduled'
export const displayDateTime = (value?: string | null) => displayDate(value, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
export const daysUntil = (value?: string | null): number | null => { if (!value) return null; return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000) }
export const derivedAssignmentStatus = (assignment: Assignment): AssignmentStatus | 'overdue' => assignment.status !== 'completed' && assignment.due_at && new Date(assignment.due_at).getTime() < Date.now() ? 'overdue' : assignment.status
export const toLocalDateTimeInput = (iso?: string | null) => { if (!iso) return ''; const date = new Date(iso); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16) }
export const toIsoDateTime = (localValue: string) => localValue ? new Date(localValue).toISOString() : null
