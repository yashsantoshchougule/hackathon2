import { formatTime, safeDate } from '../common/date'
import { MapPin, Clock3 } from 'lucide-react'
import type { DashboardData } from '../../types/dashboard'
import { StatusBadge } from '../common/UI'
export function ScheduleTimeline({ schedule, now }: { schedule: DashboardData['schedule']; now: Date }) {
  const sorted = [...schedule].sort((a, b) => (safeDate(a.startTime)?.getTime() ?? Infinity) - (safeDate(b.startTime)?.getTime() ?? Infinity))
  const nextId = sorted.find(item => (safeDate(item.startTime)?.getTime() ?? 0) > now.getTime())?.id
  return <div className="schedule"><div className="current-time"><Clock3 /> Current time · {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>{sorted.map(item => {
    const start = safeDate(item.startTime)?.getTime(), end = safeDate(item.endTime)?.getTime()
    const current = start != null && end != null && start <= now.getTime() && end > now.getTime()
    const past = end != null && end < now.getTime()
    return <article key={item.id} className={`timeline-item ${current ? 'current' : ''} ${past ? 'past' : ''}`}><div className="timeline-time"><strong>{formatTime(item.startTime)}</strong><small>{formatTime(item.endTime)}</small></div><span className="timeline-dot" /><div className="timeline-content"><div className="row"><h3>{item.subject || 'Untitled class'}</h3>{current ? <StatusBadge tone="purple">Now</StatusBadge> : item.id === nextId ? <StatusBadge tone="purple">Up next</StatusBadge> : null}</div><p><MapPin size={13} />{item.location || 'Location pending'}<span>·</span>{item.type}</p></div></article>
  })}</div>
}

