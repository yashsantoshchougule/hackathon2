import { formatDate } from '../common/date'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, ClipboardList, GraduationCap, ShieldCheck, Sparkles, Clock3, BookOpen } from 'lucide-react'
import type { DashboardData, DashboardActions, LoadState } from '../../types/dashboard'
import { SectionState, PriorityBadge } from '../common/UI'

export function SummaryCards({ summary, state, onRetry }: { summary?: Partial<DashboardData['summary']>; state?: LoadState; onRetry?: () => void }) {
  const items = [
    { label: 'Classes Today', value: summary?.classesToday, icon: CalendarDays, tone: 'purple', detail: 'Your learning, one class at a time', empty: 'No classes today' },
    { label: 'Pending Assignments', value: summary?.pendingAssignments, icon: ClipboardList, tone: 'amber', detail: 'Make room for focused work', empty: 'You’re all caught up' },
    { label: 'Current Attendance', value: summary?.overallAttendance == null ? undefined : `${summary.overallAttendance}%`, icon: ShieldCheck, tone: 'purple', detail: 'Review each subject’s requirement', empty: 'Attendance not yet uploaded' },
    { label: 'Upcoming Exams', value: summary?.upcomingExams, icon: GraduationCap, tone: 'blue', detail: 'A little preparation goes a long way', empty: 'No upcoming exams' },
  ]
  return <section className="summary-grid" aria-label="Academic summary">{items.map(item => <article className="card stat-card" key={item.label}><SectionState state={state} empty={false} message="Summary unavailable" onRetry={onRetry}><div className="stat-top"><span>{item.label}</span><span className={`stat-icon ${item.tone}`}><item.icon /></span></div><strong className="stat-value">{item.value ?? '—'}</strong><small>{item.value == null || item.value === 0 ? item.empty : item.detail}</small></SectionState></article>)}</section>
}
export function NextActionCard({ action, state, onStartTask, onRetry, demo }: { action?: DashboardData['nextAction']; state?: LoadState; demo?: boolean } & DashboardActions) {
  return <section className="card next-action"><div className="recommendation-label"><span><Sparkles /> RECOMMENDED NEXT ACTION</span><small>{demo ? 'Sample recommendation' : 'Your next step'}</small></div><SectionState state={state} empty={!action} message="No recommendation available yet. Add your academic information to get started." onRetry={onRetry}>{action && <><div className="next-action-heading"><h2>{action.title}</h2><PriorityBadge priority={action.priority} /></div><p>{action.reason}</p><div className="action-meta"><span><Clock3 />{action.estimatedMinutes ?? '—'} min</span><span><BookOpen />{action.subject || 'Subject unavailable'}</span><span><CalendarDays />{action.deadline ? `Due ${formatDate(action.deadline)}` : 'No deadline'}</span></div><div className="recommendation-footer">{onStartTask ? <button className="button primary" onClick={() => onStartTask(action.id)}>Start Task <ArrowRight /></button> : <Link className="button primary" to={`/academics?task=${encodeURIComponent(action.id)}`}>Start Task <ArrowRight /></Link>}<details><summary>Why this?</summary><p>{action.reason}{demo && ' This is a visual demo, not a live AI recommendation.'}</p></details></div></>}</SectionState></section>
}

