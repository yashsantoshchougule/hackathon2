import { formatDate, remaining, safeDate } from '../common/date'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, GraduationCap, Sparkles, Plus, Upload, ShieldCheck, AlarmClock, BookOpen } from 'lucide-react'
import type { DashboardData } from '../../types/dashboard'
import { StatusBadge, PriorityBadge } from '../common/UI'
export function AttendanceOverview({ subjects }: { subjects: DashboardData['attendance'] }) {
  return <div className="attendance-list">{subjects.map(subject => {
    const value = subject.totalClasses > 0 && subject.percentage != null && Number.isFinite(subject.percentage) ? Math.max(0, Math.min(100, subject.percentage)) : null
    const status = value == null ? 'No data' : value < subject.minimumRequired ? 'Critical' : value < subject.minimumRequired + 5 ? 'Warning' : 'Safe'
    return <article key={subject.subjectId}><div className="row"><h3>{subject.subjectName || 'Unnamed subject'}</h3><strong>{value == null ? '—' : `${Math.round(value)}%`}</strong></div><progress aria-label={`${subject.subjectName} attendance`} max={100} value={value ?? 0} className={status.toLowerCase().replace(' ', '-')} /><div className="row"><small>{subject.attendedClasses ?? 0} of {subject.totalClasses ?? 0} classes · {subject.minimumRequired}% required</small><StatusBadge tone={status.toLowerCase()}>{status}</StatusBadge></div></article>
  })}<Link className="button full-width" to="/attendance">Open What-If Simulator <ArrowRight /></Link></div>
}
export function DeadlineList({ deadlines, now }: { deadlines: DashboardData['deadlines']; now: Date }) {
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay() || 7))
  const group = (value: string) => { const d = safeDate(value); return !d ? 'Date unavailable' : d < today ? 'Overdue' : d < tomorrow ? 'Today' : d < endOfWeek ? 'This Week' : 'Later' }
  const sorted = [...deadlines].sort((a, b) => (safeDate(a.dueAt)?.getTime() ?? Infinity) - (safeDate(b.dueAt)?.getTime() ?? Infinity))
  return <div className="deadlines">{['Overdue', 'Today', 'This Week', 'Later', 'Date unavailable'].map(label => { const items = sorted.filter(item => group(item.dueAt) === label); return items.length > 0 && <div key={label}><span className="list-label">{label}</span>{items.map(item => <Link to={`/academics?deadline=${encodeURIComponent(item.id)}`} className="deadline-item" key={item.id}><span className={`small-icon ${item.type === 'exam' ? 'purple' : 'blue'}`}>{item.type === 'exam' ? <GraduationCap /> : <FileText />}</span><div><h3>{item.title || 'Untitled deadline'}</h3><p>{item.subject} · {formatDate(item.dueAt)}</p><small className={remaining(item.dueAt, now) === 'Overdue' ? 'overdue' : ''}>{remaining(item.dueAt, now)}</small></div>{item.priority && <PriorityBadge priority={item.priority} />}</Link>)}</div> })}</div>
}
export function NoticePreview({ notice }: { notice: NonNullable<DashboardData['notice']> }) {
  return <div className="notice-content"><StatusBadge tone={notice.requiresConfirmation ? 'warning' : 'safe'}>{notice.requiresConfirmation ? 'Needs your confirmation' : 'Confirmed'}</StatusBadge><h3>{notice.title || 'Untitled notice'}</h3><p>{notice.relevance ?? 'Review the original notice to check whether it applies to you.'}</p><small>{notice.source || 'Source unavailable'} · {formatDate(notice.publishedAt)}</small>{notice.extractedDeadline && <p className="notice-deadline">Extracted deadline: <strong>{formatDate(notice.extractedDeadline)}</strong></p>}<Link className="text-link" to={`/notices?notice=${encodeURIComponent(notice.id)}`}>View Notice <ArrowRight /></Link></div>
}
export function StudyProgressCard({ progress }: { progress: NonNullable<DashboardData['studyProgress']> }) {
  const percent = progress.plannedMinutes > 0 ? Math.min(100, Math.max(0, progress.completedMinutes / progress.plannedMinutes * 100)) : 0
  return <div className="study-progress"><div className="row"><span><strong>{Math.round(progress.completedMinutes / 60 * 10) / 10}</strong> <small>hours completed</small></span><StatusBadge tone="purple">This week</StatusBadge></div><progress max={100} value={percent} aria-label="Weekly study plan completion" /><p>{Math.round(progress.plannedMinutes / 60 * 10) / 10} hours planned · {progress.completedTasks} tasks completed</p>{progress.streakDays != null && progress.streakDays > 0 && <small>{progress.streakDays}-day study streak</small>}<Link to="/planner" className="text-link">Keep your momentum <ArrowRight /></Link></div>
}
export function QuickActions() { const actions = [{ label: 'Ask CampusFlow', to: '/assistant', icon: Sparkles }, { label: 'Add Assignment', to: '/academics?action=add-assignment', icon: Plus }, { label: 'Upload Notice', to: '/notices?action=upload', icon: Upload }, { label: 'Check Attendance', to: '/attendance', icon: ShieldCheck }, { label: 'Upload Notes', to: '/study-copilot?action=upload', icon: BookOpen }, { label: 'Create Reminder', to: '/reminders?action=create', icon: AlarmClock }]; return <div className="quick-actions">{actions.map(action => <Link key={action.label} to={action.to}><action.icon /><span>{action.label}</span></Link>)}</div> }

