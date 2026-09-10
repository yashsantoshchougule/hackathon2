import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Sparkles, Sun } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { SectionHeader, SectionState, StatusBadge, Toast } from '../components/common/UI'
import { SummaryCards, NextActionCard } from '../components/dashboard/Overview'
import { ScheduleTimeline } from '../components/dashboard/ScheduleTimeline'
import { PriorityTaskList } from '../components/dashboard/PriorityTaskList'
import { AttendanceOverview, DeadlineList, NoticePreview, StudyProgressCard, QuickActions } from '../components/dashboard/AcademicCards'
import { createDashboardDemoData } from '../mocks/dashboardDemoData'
import type { DashboardInput, DashboardActions, DashboardSection, LoadState } from '../types/dashboard'

export type DashboardPageProps = DashboardActions & { data?: DashboardInput; state?: LoadState; sectionStates?: Partial<Record<DashboardSection, LoadState>>; now?: Date }
export function DashboardPage({ data, state = 'ready', sectionStates, now: suppliedNow, ...actions }: DashboardPageProps) {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setClock(new Date()), 60000); return () => clearInterval(timer) }, [])
  const now = suppliedNow ?? clock
  const [params] = useSearchParams()
  const demo = data === undefined
  const fixture = useMemo(() => createDashboardDemoData(clock), [clock])
  const variant = demo ? params.get('state') : null
  const model = data ?? (variant === 'empty' ? {} : variant === 'partial' ? { student: fixture.student, attendance: fixture.attendance } : fixture)
  const loadState = variant === 'loading' || variant === 'error' ? variant : state
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer) }, [toast])
  function section(key: DashboardSection, title: string, empty: boolean, message: string, children: ReactNode, to?: string) { return <section className={`card section-card section-${key}`}><SectionHeader title={title} to={to} action={key === 'schedule' ? 'Full timetable' : 'View all'} /><SectionState state={sectionStates?.[key] ?? loadState} empty={empty} message={message} onRetry={actions.onRetry}>{children}</SectionState></section> }
  const hour = now.getHours(), greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return <AppShell student={model.student}><div className="dashboard-heading"><div><div className="eyebrow"><Sun /> YOUR DAY, WITH A LITTLE MORE CLARITY</div><h1>{greeting}, {model.student?.name?.split(' ')[0] || 'Student'} <span className="greeting-dot">.</span></h1><p>Here is what needs your attention today.</p></div><div className="header-actions"><Link className="button" to="/planner"><CalendarDays />View Study Plan</Link><Link className="button primary" to="/assistant"><Sparkles />Ask CampusFlow</Link></div></div>
    <div className="date-row"><span><CalendarDays />{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>{demo && <StatusBadge>Demo workspace · sample data</StatusBadge>}</div>
    <SummaryCards summary={model.summary} state={sectionStates?.summary ?? loadState} onRetry={actions.onRetry} />
    <div className="dashboard-columns"><div className="column main-column"><NextActionCard action={model.nextAction} state={sectionStates?.nextAction ?? loadState} demo={demo} {...actions} />
      {section('schedule', 'Today’s Schedule', !model.schedule?.length, 'No classes today. Make a little time for yourself.', <ScheduleTimeline schedule={model.schedule ?? []} now={now} />, '/academics?view=timetable')}
      {section('priorityTasks', 'Priority Tasks', !model.priorityTasks?.length, 'No upcoming assignments. You’re all caught up.', <PriorityTaskList tasks={model.priorityTasks ?? []} now={now} notify={setToast} {...actions} />, '/academics')}
      {section('notice', 'Important Notice', !model.notice, 'No important notices to review.', model.notice && <NoticePreview notice={model.notice} />, '/notices')}
    </div><div className="column side-column">
      {section('attendance', 'Attendance Overview', !model.attendance?.length, 'Attendance not yet uploaded.', <AttendanceOverview subjects={model.attendance ?? []} />)}
      {section('deadlines', 'Upcoming Deadlines', !model.deadlines?.length, 'No upcoming deadlines. Enjoy the breathing room.', <DeadlineList deadlines={model.deadlines ?? []} now={now} />, '/academics')}
      {section('studyProgress', 'Your Study Progress', !model.studyProgress, 'Add a study plan to see your weekly progress.', model.studyProgress && <StudyProgressCard progress={model.studyProgress} />)}
    </div></div><section className="card section-card quick-card"><SectionHeader title="A shortcut to your next step" /><QuickActions /></section><Toast message={toast} onClose={() => setToast('')} />
  </AppShell>
}
