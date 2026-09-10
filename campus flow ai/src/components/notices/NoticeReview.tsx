import { CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NoticeExtraction, NoticeFieldKey } from '../../types/ai'
import { Warnings } from '../ai/Feedback'

const labels: Record<NoticeFieldKey, string> = {
  title: 'Notice title',
  issuing_department: 'Issuing department',
  publication_date: 'Publication date',
  deadline: 'Deadline',
  applicable_courses: 'Applicable courses',
  applicable_semesters: 'Applicable semesters',
  instructions: 'Instructions',
  required_documents: 'Required documents',
  fees: 'Fees',
  relevant_subjects: 'Relevant subjects',
  location: 'Location',
  contact_information: 'Contact information',
  required_student_actions: 'Required actions',
}

export function NoticeReview({ extraction, processing, onChange, onConfirm, onReject }: {
  extraction: NoticeExtraction
  processing: boolean
  onChange: (key: NoticeFieldKey, value: string) => void
  onConfirm: () => void
  onReject: () => void
}) {
  const editable = extraction.status === 'review_required'
  return (
    <section className="review-layout">
      <div className="card review-summary">
        <div className="card__header">
          <div><p className="eyebrow">Original document</p><h2>{extraction.document_title}</h2></div>
          <Link className="button button--ghost button--small" to={extraction.original_document_route}><ExternalLink size={15} /> Open</Link>
        </div>
        <div className={`status-callout status-callout--${extraction.status}`}>
          {extraction.status === 'review_required' ? <ShieldAlert size={19} /> : <CheckCircle2 size={19} />}
          <div><strong>{extraction.status === 'review_required' ? 'Review required' : `Extraction ${extraction.status}`}</strong>
            <p>{editable ? 'These values are AI-extracted and are not verified until you confirm them.' : 'This review decision has been recorded.'}</p>
          </div>
        </div>
        <Warnings items={extraction.warnings} />
      </div>
      <div className="card field-card">
        <div className="card__header"><div><p className="eyebrow">Extracted information</p><h2>Check every important detail</h2></div></div>
        <div className="field-grid">
          {(Object.keys(labels) as NoticeFieldKey[]).map((key) => {
            const field = extraction.fields[key]
            const value = Array.isArray(field.value) ? field.value.join(', ') : field.value || ''
            return (
              <label className={['instructions', 'required_documents', 'required_student_actions'].includes(key) ? 'field field--wide' : 'field'} key={key}>
                <span>{labels[key]}</span>
                <textarea value={value} rows={key === 'title' ? 1 : 2} disabled={!editable || processing} onChange={(event) => onChange(key, event.target.value)} />
                <small>
                  {Math.round(field.confidence * 100)}% confidence
                  {field.source_page ? ` · page ${field.source_page}` : ' · no page reference'}
                  {field.source_location ? ` · ${field.source_location}` : ''}
                </small>
              </label>
            )
          })}
        </div>
        {editable && (
          <div className="review-actions">
            <button className="button button--danger" onClick={onReject} disabled={processing}>Reject extraction</button>
            <button className="button button--primary" onClick={onConfirm} disabled={processing}><CheckCircle2 size={16} /> Confirm and save</button>
          </div>
        )}
      </div>
    </section>
  )
}
