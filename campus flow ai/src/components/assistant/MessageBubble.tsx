import { Bot, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ChatMessage } from '../../hooks/useAssistant'
import { Sources } from '../ai/Sources'
import { Warnings } from '../ai/Feedback'

export function MessageBubble({ message }: { message: ChatMessage }) {
  const assistant = message.role === 'assistant'
  return (
    <article className={assistant ? 'message message--assistant' : 'message message--user'}>
      <div className="message__avatar" aria-hidden="true">{assistant ? <Bot size={18} /> : <UserRound size={18} />}</div>
      <div className="message__body">
        <p className="message__author">{assistant ? 'CampusFlow' : 'You'}</p>
        <div className="message__content">{message.content}</div>
        {message.response && (
          <>
            <Warnings items={message.response.warnings} />
            <Sources citations={message.response.citations} />
            {message.response.suggested_actions.length > 0 && (
              <div className="action-row">
                {message.response.suggested_actions.map((action) => (
                  <Link className="action-card" to={action.route} key={`${action.type}:${action.source_id || action.route}`}>
                    <span>{action.title}</span>
                    {action.requires_confirmation && <small>Review required</small>}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}
