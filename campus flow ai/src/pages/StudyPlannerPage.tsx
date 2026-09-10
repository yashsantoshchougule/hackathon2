import { useState } from 'react'
import { CalendarPlus, Check, RefreshCw, RotateCcw, X } from 'lucide-react'
import { EmptyState, ErrorBanner, LoadingState, Warnings } from '../components/ai/Feedback'
import { PageHeader } from '../components/ai/PageHeader'
import { PlanTimeline } from '../components/planner/PlanTimeline'
import { useStudyPlanner } from '../hooks/useStudyPlanner'

export function StudyPlannerPage() {
  const { plan, loading, processing, error, load, generate, review } = useStudyPlanner()
  const [view, setView] = useState<'daily' | 'weekly'>('weekly')

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Study planner"
        title="A realistic week, built around you"
        description="Urgent work is scheduled around verified lectures and examinations. Every new plan waits for your approval."
        actions={<button className="button button--primary" onClick={() => void generate(false)} disabled={processing}><CalendarPlus size={17} /> Generate plan</button>}
      />
      <div className="toolbar">
        <div className="segmented" aria-label="Planner view">
          <button className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>Daily</button>
          <button className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>Weekly</button>
        </div>
        <button className="button button--ghost" onClick={() => void generate(true)} disabled={processing} title="Reschedule incomplete work">
          <RotateCcw size={16} /> Recovery mode
        </button>
      </div>
      {loading && <LoadingState label="Loading your current study plan…" />}
      {processing && <LoadingState label="Checking deadlines and timetable conflicts…" />}
      {error && <ErrorBanner error={error} onRetry={() => void load()} />}
      {!loading && !processing && !error && !plan && (
        <EmptyState title="No study plan yet" message="Generate a proposal after assignments, exams, timetable, and preferences are connected." action={<button className="button button--primary" onClick={() => void generate(false)}><CalendarPlus size={17} /> Generate plan</button>} />
      )}
      {plan && (
        <section className="card plan-card">
          <div className="card__header">
            <div><span className={`status status--${plan.status}`}>{plan.status.replaceAll('_', ' ')}</span><h2>{plan.recovery_mode ? 'Recovery proposal' : 'Your study proposal'}</h2><p>{plan.explanation}</p></div>
            <button className="icon-button" onClick={() => void load()} title="Refresh plan" aria-label="Refresh plan"><RefreshCw size={17} /></button>
          </div>
          <Warnings items={plan.warnings} />
          {plan.items.length ? <PlanTimeline items={view === 'daily' ? plan.items.slice(0, 4) : plan.items} compact={view === 'daily'} /> : <EmptyState title="Nothing could be scheduled" message="No pending work with a verified source and available study time was found." />}
          {plan.status === 'pending_confirmation' && (
            <div className="confirmation-bar">
              <p>Review every time block before saving this plan.</p>
              <div>
                <button className="button button--ghost" onClick={() => void review('reject')} disabled={processing}><X size={16} /> Reject</button>
                <button className="button button--ghost" onClick={() => void generate(plan.recovery_mode)} disabled={processing}><RefreshCw size={16} /> Modify</button>
                <button className="button button--primary" onClick={() => void review('confirm')} disabled={processing}><Check size={16} /> Confirm plan</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
