import { useAcademicSummary } from '../hooks/useAcademicSummary'
import { displayDateTime } from '../utils/academicDates'
import { Button, DataState, Icon, LoadingCards, PageIntro, RiskBadge, StatCard, VerifyBadge } from '../components/academic/ui'
import './academic-pages.css'

const areas = [
  { title: 'Assignments', note: 'Plan, prioritise and complete work.', route: '/assignments', icon: 'checklist' as const, hue: 'mint' },
  { title: 'Timetable', note: 'See your classes and open study time.', route: '/timetable', icon: 'calendar' as const, hue: 'blue' },
  { title: 'Examinations', note: 'Keep verified dates and venues close.', route: '/examinations', icon: 'cap' as const, hue: 'gold' },
  { title: 'Attendance', note: 'Understand your current position.', route: '/attendance', icon: 'chart' as const, hue: 'rose' },
  { title: 'Reminders', note: 'Stay on top of personal deadlines.', route: '/reminders', icon: 'bell' as const, hue: 'violet' },
]

export function AcademicHubPage({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { data, loading, error, refresh } = useAcademicSummary()
  return <>
    <PageIntro eyebrow="ACADEMIC WORKSPACE" title="Keep your semester in flow.">A verified view of your classes, work, attendance and important dates.</PageIntro>
    {loading && <LoadingCards />}
    {!loading && !data && <DataState error={error} onRetry={refresh} itemName="academic summary">Your dashboard will only show records that belong to your authenticated student profile.</DataState>}
    {!loading && data && <>
      <section className="stats-grid">
        <StatCard label="Pending work" value={data.pending_assignment_count} helper="Assignments to move forward" icon="checklist" />
        <StatCard label="Classes today" value={data.classes_today.length} helper={data.next_class ? `Next: ${displayDateTime(data.next_class.starts_at)}` : 'No next class scheduled'} icon="calendar" tone="lime" />
        <StatCard label="Upcoming exams" value={data.upcoming_exam_count} helper="Verified examination records" icon="cap" tone="amber" />
        <StatCard label="Attendance" value={data.attendance.overall_percentage === null ? '—' : `${data.attendance.overall_percentage.toFixed(1)}%`} helper={data.attendance.risk_subjects.length ? `${data.attendance.risk_subjects.length} subject(s) need attention` : 'Weighted overall attendance'} icon="chart" tone="rose" />
      </section>
      <section className="hub-grid">
        <article className="panel timeline-panel"><div className="panel-heading"><div><span className="panel-kicker">TODAY</span><h2>What’s next</h2></div><button className="text-link" onClick={() => onNavigate('/timetable')}>Open timetable <Icon name="arrow" size={14} /></button></div>
          {data.next_class ? <div className="next-class"><span className="timeline-pin"></span><div><strong>{data.next_class.subject?.title || data.next_class.entry_type}</strong><p>{displayDateTime(data.next_class.starts_at)} {data.next_class.location ? `· ${data.next_class.location}` : ''}</p><VerifyBadge status={data.next_class.verification_status} /></div></div> : <div className="inline-empty"><Icon name="calendar" size={19} />No further classes are scheduled for today.</div>}
        </article>
        <article className="panel attention-panel"><div className="panel-heading"><div><span className="panel-kicker">ACADEMIC SIGNALS</span><h2>Needs your attention</h2></div></div>
          {data.attendance.risk_subjects.length + data.upcoming_deadlines.length === 0 ? <div className="inline-empty"><Icon name="check" size={19} />Nothing urgent is flagged in verified records.</div> : <div className="attention-list">{data.attendance.risk_subjects.slice(0, 2).map((row) => <div className="attention-row" key={row.subject.id}><div><strong>{row.subject.title}</strong><span>Attendance {row.percentage === null ? 'unavailable' : `${row.percentage.toFixed(1)}%`}</span></div><RiskBadge risk={row.risk} /></div>)}{data.upcoming_deadlines.slice(0, 2).map((item) => <div className="attention-row" key={item.id}><div><strong>{item.title}</strong><span>Due {displayDateTime(item.due_at)}</span></div><VerifyBadge status={item.verification_status} /></div>)}</div>}
        </article>
      </section>
    </>}
    <section className="module-section"><div className="section-label">MANAGE YOUR ACADEMICS</div><div className="module-grid">{areas.map((area) => <button key={area.title} className={`module-card ${area.hue}`} onClick={() => onNavigate(area.route)}><span className="module-icon"><Icon name={area.icon} size={23} /></span><span><strong>{area.title}</strong><small>{area.note}</small></span><Icon name="arrow" size={17} /></button>)}</div></section>
    {data && data.warnings.length > 0 && <section className="notice-card"><Icon name="alert" size={18} /><div><strong>Academic data notice</strong><p>{data.warnings[0]}</p></div><Button kind="quiet" onClick={refresh} icon="refresh">Refresh</Button></section>}
  </>
}
