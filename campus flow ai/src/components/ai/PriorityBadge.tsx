import type { PriorityLevel } from '../../types/ai'

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  return <span className={`badge badge--${level}`}>{level}</span>
}
