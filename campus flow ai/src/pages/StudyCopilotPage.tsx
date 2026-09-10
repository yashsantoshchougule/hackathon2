import { useMemo, useState } from 'react'
import { ArrowUp, BookOpenCheck, ListChecks, Sparkles } from 'lucide-react'
import { DocumentPicker } from '../components/copilot/DocumentPicker'
import { EmptyState, ErrorBanner, LoadingState, Warnings } from '../components/ai/Feedback'
import { PageHeader } from '../components/ai/PageHeader'
import { Sources } from '../components/ai/Sources'
import { useStudyCopilot } from '../hooks/useStudyCopilot'
import type { CopilotMode } from '../types/ai'

export function StudyCopilotPage() {
  const { documents, result, loadingDocuments, processing, error, query, upload, retry } = useStudyCopilot()
  const [selected, setSelected] = useState<string[]>([])
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<CopilotMode>('answer')
  const subjects = useMemo(() => [...new Set(documents.map((item) => item.subject_id).filter((value): value is string => Boolean(value)))], [documents])
  const [subject, setSubject] = useState('')

  const ask = () => {
    if (!question.trim() || !selected.length) return
    void query(question.trim(), selected, subject || undefined, mode)
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Evidence-locked study copilot"
        title="Learn directly from your materials"
        description="Select your notes, ask a question, and trace every explanation back to the source."
      />
      <div className="copilot-layout">
        {loadingDocuments ? <div className="card"><LoadingState label="Loading your resources…" /></div> : (
          <DocumentPicker
            documents={documents}
            selected={selected}
            disabled={processing}
            onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
            onUpload={(file) => void upload(file, subject || undefined)}
          />
        )}
        <section className="copilot-main card">
          <div className="copilot-controls">
            <label><span>Subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">All selected materials</option>{subjects.map((id) => <option value={id} key={id}>{id}</option>)}</select></label>
            <label><span>Response</span><select value={mode} onChange={(event) => setMode(event.target.value as CopilotMode)}><option value="answer">Explain</option><option value="simpler">Explain simply</option><option value="practice">Practice questions</option><option value="revision">Revision summary</option></select></label>
          </div>
          {result ? (
            <div className="copilot-answer" aria-live="polite">
              <span className="copilot-answer__icon"><BookOpenCheck size={22} /></span>
              <div><p className="eyebrow">Grounded answer</p><div className="answer-text">{result.answer}</div><Warnings items={result.warnings} /><Sources citations={result.citations} /></div>
            </div>
          ) : (
            <EmptyState title="Choose your evidence" message="Select at least one processed note, then ask a focused question." action={<span className="mini-hint"><ListChecks size={15} /> Sources remain visible beside the answer</span>} />
          )}
          {processing && <LoadingState label="Finding the strongest evidence…" />}
          {error && <ErrorBanner error={error} onRetry={() => void retry()} />}
          <div className="copilot-composer">
            <Sparkles size={18} aria-hidden="true" />
            <textarea rows={2} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about the selected notes…" disabled={processing} />
            <button className="send-button" onClick={ask} disabled={processing || !question.trim() || !selected.length} aria-label="Ask copilot"><ArrowUp size={20} /></button>
          </div>
        </section>
      </div>
    </div>
  )
}
