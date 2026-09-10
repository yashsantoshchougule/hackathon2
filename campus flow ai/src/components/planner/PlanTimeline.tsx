import { Clock3 } from 'lucide-react'
import type { PlanItem } from '../../types/ai'
import { PriorityBadge } from '../ai/PriorityBadge'

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function PlanTimeline({ items, compact }: { items: PlanItem[]; compact: boolean }) {
  const grouped = items.reduce((days, item) => {
    const key = new Date(item.starts_at).toDateString()
    const current = days.get(key) || []
    current.push(item)
    days.set(key, current)
    return days
  }, new Map<string, PlanItem[]>())
  return (
    <div className={compact ? 'timeline timeline--compact' : 'timeline'}>
      {[...grouped].map(([day, dayItems]) => (
        <section className="timeline-day" key={day}>
          <h3>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(day))}</h3>
          <div className="timeline-day__items">
            {dayItems.map((item) => (
              <article className="plan-block" key={item.id}>
                <div className="plan-block__time"><Clock3 size={15} /> {formatTime(item.starts_at)}–{formatTime(item.ends_at)}</div>
                <div className="plan-block__main">
                  <div className="plan-block__heading"><h4>{item.title}</h4><PriorityBadge level={item.priority} /></div>
                  {item.subject && <span className="plan-block__subject">{item.subject}</span>}
                  <p>{item.reason}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
