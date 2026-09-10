import { useState } from 'react'
import { useExaminations } from '../hooks/useExaminations'
import { daysUntil, displayDate, displayDateTime } from '../utils/academicDates'
import { Button, DataState, Icon, LoadingCards, PageIntro, VerifyBadge } from '../components/academic/ui'
import './academic-pages.css'

export function ExaminationsPage() {
  const [upcoming, setUpcoming] = useState(true); const { data, loading, error, refresh } = useExaminations({ upcoming, page_size: 50 })
  return <>
    <PageIntro title="Examinations" eyebrow="ACADEMIC WORKSPACE" action={<Button kind="secondary" icon="refresh" onClick={refresh}>Refresh records</Button>}>Only dates and venues confirmed by your academic sources are shown as examinations.</PageIntro>
    <section className="filter-bar"><div className="segmented"><button className={upcoming ? 'selected' : ''} onClick={() => setUpcoming(true)}>Upcoming</button><button className={!upcoming ? 'selected' : ''} onClick={() => setUpcoming(false)}>Past</button></div><span className="filter-spacer"></span><span className="verified-note"><Icon name="check" size={15} />Dates are source-labelled</span></section>
    {loading && <LoadingCards count={3} />}
    {!loading && !data && <DataState error={error} onRetry={refresh} itemName="examinations" />}
    {!loading && data && (data.items.length === 0 ? <DataState itemName={upcoming ? 'upcoming examinations' : 'past examinations'}>{upcoming ? 'No examination has been announced for your enrolled subjects.' : 'No past examination record is available.'}</DataState> : <section className="exam-grid">{data.items.map((exam) => { const days = daysUntil(exam.starts_at); return <article className="exam-card" key={exam.id}><div className="exam-top"><span className="exam-type">{exam.exam_type.replace('_', ' ')}</span><VerifyBadge status={exam.verification_status} /></div><h2>{exam.title}</h2><p className="exam-subject"><Icon name="book" size={14} />{exam.subject?.title || 'Subject not returned'}</p><div className="exam-date"><span>{displayDate(exam.starts_at, { day: '2-digit' })}</span><div><strong>{displayDate(exam.starts_at, { month: 'short', year: 'numeric' })}</strong><small>{displayDateTime(exam.starts_at).split(', ').at(-1)}{exam.ends_at ? ` – ${displayDateTime(exam.ends_at).split(', ').at(-1)}` : ''}</small></div></div><div className="exam-footer"><span>{exam.venue ? <><Icon name="location" size={14} />{exam.venue}</> : 'Venue pending'}</span>{days !== null && days >= 0 && <strong>{days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} left`}</strong>}</div>{exam.syllabus_url && <a href={exam.syllabus_url} target="_blank" rel="noreferrer">Open syllabus <Icon name="arrow" size={13} /></a>}</article> })}</section>)}
    <p className="privacy-note"><Icon name="lock" size={14} />Students cannot change official examination records. Contact your department if a confirmed date is incorrect.</p>
  </>
}
