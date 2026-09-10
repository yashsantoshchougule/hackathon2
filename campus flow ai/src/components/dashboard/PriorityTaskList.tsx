import { remaining } from '../common/date'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import type { Task, DashboardActions } from '../../types/dashboard'
import { EmptyState, PriorityBadge } from '../common/UI'
export function PriorityTaskList({ tasks, now, onTaskComplete, notify }: { tasks: Task[]; now: Date; notify: (message: string) => void } & DashboardActions) {
  const [filter, setFilter] = useState('pending')
  const [pending, setPending] = useState<string[]>([])
  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  const visible = [...tasks].filter(task => filter === 'all' || task.completed === (filter === 'completed')).sort((a, b) => order[a.priority] - order[b.priority])
  async function complete(task: Task) {
    if (!onTaskComplete) { notify('Task updates will be available when your academic account is connected.'); return }
    setPending(ids => [...ids, task.id])
    try { await onTaskComplete(task.id, !task.completed); notify('Task update saved.') } catch { notify('Could not update the task. Please try again.') } finally { setPending(ids => ids.filter(id => id !== task.id)) }
  }
  return <><div className="task-tabs" aria-label="Filter tasks">{['pending', 'completed', 'all'].map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div>{!visible.length && <EmptyState message={`No ${filter === 'all' ? '' : filter} tasks. You have room to breathe.`} />}{visible.map(task => <article className={`task-item ${task.completed ? 'completed' : ''}`} key={task.id}><label className="task-check"><input type="checkbox" aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`} checked={task.completed} disabled={pending.includes(task.id)} onChange={() => void complete(task)} /></label><div className="task-copy"><h3>{task.title || 'Untitled task'}</h3><p>{task.subject || 'Subject unavailable'} <span>·</span> <span className={remaining(task.dueAt, now) === 'Overdue' ? 'overdue' : ''}>{remaining(task.dueAt, now)}</span>{task.estimatedMinutes != null && ` · ${task.estimatedMinutes} min`}</p></div><PriorityBadge priority={task.priority} /><details className="task-overflow"><summary aria-label={`Options for ${task.title}`}><MoreHorizontal /></summary><div><Link to={`/academics?task=${encodeURIComponent(task.id)}`}>Open task details</Link></div></details></article>)}</>
}

