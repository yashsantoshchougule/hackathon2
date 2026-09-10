import type { ReactNode } from 'react'
import { ArrowUpRight, Inbox, AlertCircle, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LoadState, Priority } from '../../types/dashboard'
export function Logo() { return <Link to="/" className="brand" aria-label="CampusFlow home"><span className="brand-icon"><Sparkles /></span><span>CampusFlow<span className="brand-caption">Your academic companion</span></span></Link> }
export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span> }
export function PriorityBadge({ priority }: { priority: Priority }) { return <StatusBadge tone={priority}>{priority}</StatusBadge> }
export function SectionHeader({ title, to, action = 'View all', children }: { title: string; to?: string; action?: string; children?: ReactNode }) { return <header className="section-header"><h2>{title}</h2>{children}{to && <Link className="text-link" to={to}>{action}<ArrowUpRight size={14} /></Link>}</header> }
export function EmptyState({ message }: { message: string }) { return <div className="empty-state"><Inbox /><p>{message}</p></div> }
export function LoadingSkeleton() { return <div className="skeleton-stack" role="status" aria-label="Loading section"><div className="skeleton" /><div className="skeleton" /><div className="skeleton short" /><span className="sr-only">Loading…</span></div> }
export function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="empty-state" role="alert"><AlertCircle /><p>We couldn’t load this section.</p>{onRetry && <button className="button" onClick={onRetry}>Try again</button>}</div> }
export function SectionState({ state = 'ready', empty, message, children, onRetry }: { state?: LoadState; empty?: boolean; message: string; children: ReactNode; onRetry?: () => void }) { return state === 'loading' ? <LoadingSkeleton /> : state === 'error' ? <ErrorState onRetry={onRetry} /> : empty ? <EmptyState message={message} /> : children }
export function Toast({ message, onClose }: { message: string; onClose: () => void }) { return message ? <div className="toast" role="status">{message}<button aria-label="Dismiss notification" onClick={onClose}><X /></button></div> : null }

