import { academicApi } from '../services/academicApi'
import { useAcademicQuery } from '../hooks/useAcademicQuery'
import { derivedAssignmentStatus, displayDateTime } from '../utils/academicDates'
import { Button, DataState, Icon, PageIntro, PriorityBadge, VerifyBadge } from '../components/academic/ui'
import './academic-pages.css'

export function AssignmentDetailsPage({ assignmentId }: { assignmentId: string }) {
  const { data, loading, error, refresh } = useAcademicQuery((signal) => academicApi.assignment(assignmentId, signal), [assignmentId])
  if (loading) return <div className="detail-loading">Loading assignment…</div>
  if (!data) return <><PageIntro title="Assignment" eyebrow="ACADEMIC WORKSPACE" /><DataState error={error} onRetry={refresh} itemName="assignment" /></>
  const status = derivedAssignmentStatus(data)
  return <><PageIntro title={data.title} eyebrow="ASSIGNMENT DETAILS" action={data.editable ? <Button icon={status === 'completed' ? 'refresh' : 'check'} onClick={() => { void academicApi.setAssignmentStatus(data.id, status === 'completed' ? 'not_started' : 'completed').then(refresh) }}>{status === 'completed' ? 'Reopen task' : 'Mark complete'}</Button> : undefined}>Academic records keep their source and verification information visible.</PageIntro><section className="detail-card"><div className="detail-labels"><PriorityBadge priority={data.priority} /><VerifyBadge status={data.verification_status} /></div><dl><div><dt>Subject</dt><dd>{data.subject?.title || 'Subject not returned'}</dd></div><div><dt>Due</dt><dd>{displayDateTime(data.due_at)}</dd></div><div><dt>Status</dt><dd>{status.replace('_', ' ')}</dd></div><div><dt>Estimated effort</dt><dd>{data.estimated_minutes === null || data.estimated_minutes === undefined ? 'Not provided' : `${data.estimated_minutes} minutes`}</dd></div></dl>{data.description && <div className="detail-description"><h2>Description</h2><p>{data.description}</p></div>}{data.attachment_url && <a className="attachment-link" href={data.attachment_url} target="_blank" rel="noreferrer"><Icon name="book" size={16} />Open attachment <Icon name="arrow" size={14} /></a>}</section></>
}
