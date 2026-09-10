import { useMemo, useState } from 'react'
import { useTimetable } from '../hooks/useTimetable'
import { displayDate, displayDateTime } from '../utils/academicDates'
import { Button, DataState, Icon, LoadingCards, PageIntro, VerifyBadge } from '../components/academic/ui'
import './academic-pages.css'

const monday = (date: Date) => { const copy = new Date(date); const weekday = copy.getDay() || 7; copy.setDate(copy.getDate() - weekday + 1); copy.setHours(0, 0, 0, 0); return copy }
const isoDay = (date: Date) => date.toISOString().slice(0, 10)
export function TimetablePage() {
  const [week, setWeek] = useState(() => monday(new Date())); const [mode, setMode] = useState<'week' | 'day'>('week')
  const range = useMemo(() => { const end = new Date(week); end.setDate(end.getDate() + (mode === 'week' ? 6 : 0)); return { from: isoDay(week), to: isoDay(end), view: mode } }, [week, mode])
  const { data, loading, error, refresh } = useTimetable(range)
  const moveWeek = (direction: number) => setWeek((previous) => { const next = new Date(previous); next.setDate(next.getDate() + (mode === 'week' ? 7 : 1) * direction); return next })
  const heading = mode === 'week' ? `${displayDate(range.from, { day: 'numeric', month: 'short' })} – ${displayDate(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}` : displayDate(range.from, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return <>
    <PageIntro title="Timetable" eyebrow="ACADEMIC WORKSPACE" action={<Button kind="secondary" icon="calendar" onClick={() => setWeek(monday(new Date()))}>Today</Button>}>Your confirmed classes and academic events, shown in your local timezone.</PageIntro>
    <section className="schedule-toolbar"><div className="segmented"><button className={mode === 'week' ? 'selected' : ''} onClick={() => setMode('week')}>Week</button><button className={mode === 'day' ? 'selected' : ''} onClick={() => setMode('day')}>Day</button></div><div className="date-nav"><button aria-label="Previous period" onClick={() => moveWeek(-1)}><Icon name="chevron" size={17} /></button><strong>{heading}</strong><button aria-label="Next period" onClick={() => moveWeek(1)}><Icon name="chevron" size={17} /></button></div><Button kind="quiet" icon="refresh" onClick={refresh}>Refresh</Button></section>
    {loading && <LoadingCards count={3} />}
    {!loading && !data && <DataState error={error} onRetry={refresh} itemName="timetable entries">CampusFlow only displays timetable events issued to your course or created as your personal records.</DataState>}
    {!loading && data && (data.items.length === 0 ? <DataState itemName="classes for this period">There are no verified timetable entries for the selected dates.</DataState> : <section className="schedule-list">{data.items.map((entry) => <article key={entry.id} className="schedule-entry"><div className="schedule-time"><strong>{displayDate(entry.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{displayDateTime(entry.starts_at).split(', ').at(-1)} – {displayDateTime(entry.ends_at).split(', ').at(-1)}</span></div><div className={`event-mark event-${entry.entry_type}`}></div><div className="schedule-details"><div className="schedule-title"><strong>{entry.subject?.title || entry.entry_type}</strong><span className="entry-type">{entry.entry_type}</span></div><p>{entry.location ? <><Icon name="location" size={13} />{entry.location}</> : 'Location has not been published'}</p>{entry.change_note && <span className="change-note"><Icon name="alert" size={12} />{entry.change_note}</span>}</div><VerifyBadge status={entry.verification_status} /></article>)}</section>)}
    <p className="privacy-note"><Icon name="lock" size={14} />Timetable conflicts are checked on the server using timezone-aware start and end times. Personal-event editing is enabled only when the authenticated API confirms it.</p>
  </>
}
