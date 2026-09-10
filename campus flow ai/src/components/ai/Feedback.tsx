import type { ReactNode } from 'react'
import { AlertCircle, Inbox, LoaderCircle, RotateCcw } from 'lucide-react'

export function ErrorBanner({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="feedback feedback--error" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <div><strong>Request not completed</strong><p>{error.message}</p></div>
      {onRetry && <button className="button button--small button--ghost" onClick={onRetry}><RotateCcw size={15} /> Retry</button>}
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Inbox size={23} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  )
}

export function LoadingState({ label = 'Loading verified data…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  )
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="warnings" role="status">
      {items.map((item) => <p key={item}><AlertCircle size={15} /> {item}</p>)}
    </div>
  )
}
