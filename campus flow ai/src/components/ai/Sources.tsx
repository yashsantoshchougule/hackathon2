import { ExternalLink, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Citation } from '../../types/ai'

export function Sources({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null
  return (
    <section className="sources" aria-label="Verified sources">
      <h3><FileText size={16} /> Sources</h3>
      <div className="source-list">
        {citations.map((citation) => (
          <Link className="source-card" to={citation.route} key={`${citation.source_type}:${citation.source_id}:${citation.section_id || ''}`}>
            <span><strong>{citation.title}</strong>{citation.page_number ? ` · page ${citation.page_number}` : ''}</span>
            {citation.excerpt && <small>{citation.excerpt}</small>}
            <ExternalLink size={14} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  )
}
