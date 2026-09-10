import { useEffect, useMemo, useRef, useState } from 'react'
import { FileUp, UploadCloud } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { ErrorBanner, LoadingState } from '../components/ai/Feedback'
import { PageHeader } from '../components/ai/PageHeader'
import { NoticeReview } from '../components/notices/NoticeReview'
import { useNoticeIntelligence } from '../hooks/useNoticeIntelligence'

export function NoticesPage() {
  const { noticeId } = useParams()
  const { extraction, processing, error, extract, updateField, review, retry } = useNoticeIntelligence(noticeId)
  const [file, setFile] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => file ? URL.createObjectURL(file) : null, [file])

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Notice intelligence"
        title="Turn a college notice into clear next steps"
        description="Upload a PDF or text notice, review every extracted value, then confirm before reminders are created."
      />
      {!extraction && (
        <section className="upload-layout">
          <button className="upload-zone" type="button" onClick={() => input.current?.click()} disabled={processing}>
            <span className="upload-zone__icon"><UploadCloud size={27} /></span>
            <strong>{file ? file.name : 'Choose a notice to analyse'}</strong>
            <span>PDF or UTF-8 text · maximum 10 MB</span>
            <input
              ref={input}
              className="sr-only"
              type="file"
              accept="application/pdf,text/plain,.pdf,.txt"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </button>
          {preview && file?.type === 'application/pdf' && <iframe className="document-preview" src={preview} title="Selected notice preview" />}
          {file && (
            <button className="button button--primary upload-action" onClick={() => void extract(file)} disabled={processing}>
              <FileUp size={17} /> Analyse notice
            </button>
          )}
        </section>
      )}
      {processing && <LoadingState label={extraction ? 'Saving your review…' : 'Reading and validating the notice…'} />}
      {error && <ErrorBanner error={error} onRetry={noticeId ? () => void retry() : file ? () => void extract(file) : undefined} />}
      {extraction && preview && file?.type === 'application/pdf' && (
        <iframe className="document-preview" src={preview} title="Original notice preview" />
      )}
      {extraction && (
        <NoticeReview
          extraction={extraction}
          processing={processing}
          onChange={updateField}
          onConfirm={() => void review('confirm')}
          onReject={() => void review('reject')}
        />
      )}
    </div>
  )
}
