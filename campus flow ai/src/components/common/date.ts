export function safeDate(value?: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date }
export function formatDate(value?: string) { return safeDate(value)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? 'Date unavailable' }
export function formatTime(value?: string) { return safeDate(value)?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) ?? 'Time unavailable' }
export function remaining(value: string | undefined, now: Date) { const date = safeDate(value); if (!date) return 'No deadline'; const hours = (date.getTime() - now.getTime()) / 3600000; return hours < 0 ? 'Overdue' : hours < 1 ? 'Due within an hour' : hours < 24 ? `${Math.ceil(hours)}h left` : `${Math.ceil(hours / 24)} days left` }

