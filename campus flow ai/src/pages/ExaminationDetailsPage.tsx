import { academicApi } from '../services/academicApi'
import { useAcademicQuery } from '../hooks/useAcademicQuery'
import { daysUntil, displayDateTime } from '../utils/academicDates'
import { DataState, Icon, PageIntro, VerifyBadge } from '../components/academic/ui'
import './academic-pages.css'

export function ExaminationDetailsPage({ examId }: { examId: string }) {
  const { data, loading, error, refresh } = useAcademicQuery((signal) => academicApi.examination(examId, signal), [examId])
  if (loading) return <div className="detail-loading">Loading examination…</div>
  if (!data) return <><PageIntro title="Examination" eyebrow="ACADEMIC WORKSPACE" /><DataState error={error} onRetry={refresh} itemName="examination" /></>
  const days = daysUntil(data.starts_at)
  return <><PageIntro title={data.title} eyebrow="EXAMINATION DETAILS">Official examination information is read-only for students.</PageIntro><section className="detail-card"><div className="detail-labels"><span className="exam-type">{data.exam_type.replace('_', ' ')}</span><VerifyBadge status={data.verification_status} /></div><dl><div><dt>Subject</dt><dd>{data.subject?.title || 'Subject not returned'}</dd></div><div><dt>Starts</dt><dd>{displayDateTime(data.starts_at)}</dd></div><div><dt>Venue</dt><dd>{data.venue || 'Not announced'}</dd></div><div><dt>Countdown</dt><dd>{days === null ? 'Not available' : days < 0 ? 'Past examination' : days === 0 ? 'Today' : `${days} days remaining`}</dd></div>{data.maximum_marks !== null && data.maximum_marks !== undefined && <div><dt>Maximum marks</dt><dd>{data.maximum_marks}</dd></div>}</dl>{data.syllabus_url && <a className="attachment-link" href={data.syllabus_url} target="_blank" rel="noreferrer"><Icon name="book" size={16} />Open verified syllabus <Icon name="arrow" size={14} /></a>}</section></>
}
