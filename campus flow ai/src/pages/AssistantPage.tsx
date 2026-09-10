import { useState } from 'react'
import { ArrowUp, MessageSquarePlus, Sparkles } from 'lucide-react'
import { MessageBubble } from '../components/assistant/MessageBubble'
import { ErrorBanner, LoadingState } from '../components/ai/Feedback'
import { PageHeader } from '../components/ai/PageHeader'
import { useAssistant } from '../hooks/useAssistant'

const suggestions = [
  'What should I complete today?',
  'Which assignment is most urgent?',
  'What exams are approaching?',
  'Create a study plan for this week.',
]

export function AssistantPage() {
  const [message, setMessage] = useState('')
  const { messages, loading, error, submit, retry, newConversation } = useAssistant()

  const send = () => {
    const value = message.trim()
    if (!value) return
    setMessage('')
    void submit(value)
  }

  return (
    <div className="page-stack assistant-page">
      <PageHeader
        eyebrow="Academic assistant"
        title="What can I help you decide?"
        description="Ask about verified assignments, exams, attendance, notices, and your study plan."
        actions={
          <button className="button button--ghost" onClick={newConversation} disabled={!messages.length}>
            <MessageSquarePlus size={17} /> New conversation
          </button>
        }
      />

      <section className="chat-panel" aria-label="Conversation">
        {messages.length === 0 ? (
          <div className="assistant-welcome">
            <span className="assistant-welcome__icon"><Sparkles size={25} /></span>
            <h2>Plan with facts, not guesses</h2>
            <p>CampusFlow checks your connected academic records before answering.</p>
            <div className="suggestion-grid">
              {suggestions.map((suggestion) => (
                <button key={suggestion} className="suggestion" onClick={() => void submit(suggestion)} disabled={loading}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list" aria-live="polite">
            {messages.map((item) => <MessageBubble message={item} key={item.id} />)}
            {loading && <LoadingState label="Checking your academic data…" />}
          </div>
        )}
        {error && <ErrorBanner error={error} onRetry={retry} />}
        <form className="composer" onSubmit={(event) => { event.preventDefault(); send() }}>
          <label className="sr-only" htmlFor="assistant-message">Message CampusFlow</label>
          <textarea
            id="assistant-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            maxLength={2000}
            placeholder="Ask about this week, an assignment, or your attendance…"
            rows={2}
            disabled={loading}
          />
          <button className="send-button" type="submit" disabled={loading || !message.trim()} aria-label="Send message">
            <ArrowUp size={20} />
          </button>
        </form>
        <p className="composer-note">CampusFlow answers only from connected records and verified documents.</p>
      </section>
    </div>
  )
}
