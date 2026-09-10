import { FileText, Upload } from 'lucide-react'
import { useRef } from 'react'
import type { DocumentSummary } from '../../types/ai'

export function DocumentPicker({ documents, selected, disabled, onToggle, onUpload }: {
  documents: DocumentSummary[]
  selected: string[]
  disabled: boolean
  onToggle: (id: string) => void
  onUpload: (file: File) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <aside className="document-picker card">
      <div className="card__header">
        <div><p className="eyebrow">Evidence</p><h2>Your notes</h2></div>
        <button className="icon-button" onClick={() => input.current?.click()} disabled={disabled} aria-label="Upload notes" title="Upload notes"><Upload size={18} /></button>
        <input ref={input} className="sr-only" type="file" accept="application/pdf,text/plain,.pdf,.txt" onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onUpload(file)
          event.target.value = ''
        }} />
      </div>
      {documents.length === 0 ? <p className="muted">No processed notes are available.</p> : (
        <div className="document-list">
          {documents.map((document) => (
            <label className="document-option" key={document.id}>
              <input type="checkbox" checked={selected.includes(document.id)} onChange={() => onToggle(document.id)} disabled={disabled} />
              <FileText size={17} />
              <span><strong>{document.title}</strong><small>{document.subject_id ? `Subject ${document.subject_id}` : 'General resource'}</small></span>
            </label>
          ))}
        </div>
      )}
    </aside>
  )
}
