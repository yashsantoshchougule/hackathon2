import { useCallback, useEffect, useRef, useState } from 'react'
import { useAiClient } from './useAiClient'
import type { AssistantResponse } from '../types/ai'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AssistantResponse
}

export function useAssistant() {
  const api = useAiClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const lastMessage = useRef<string | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const submit = useCallback(
    async (message: string) => {
      const value = message.trim()
      if (!value || loading) return
      controller.current?.abort()
      controller.current = new AbortController()
      lastMessage.current = value
      setError(null)
      setLoading(true)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: value }])
      try {
        const response = await api.chat(
          { message: value, conversation_id: conversationId, page_context: { current_route: '/assistant' } },
          controller.current.signal,
        )
        setConversationId(response.conversation_id)
        setMessages((current) => [
          ...current,
          { id: response.message_id, role: 'assistant', content: response.answer, response },
        ])
      } catch (reason) {
        if ((reason as Error).name !== 'AbortError') setError(reason as Error)
      } finally {
        setLoading(false)
      }
    },
    [api, conversationId, loading],
  )

  const retry = useCallback(() => {
    if (lastMessage.current) void submit(lastMessage.current)
  }, [submit])

  const newConversation = useCallback(() => {
    controller.current?.abort()
    setMessages([])
    setConversationId(null)
    setError(null)
    lastMessage.current = null
  }, [])

  return { messages, loading, error, submit, retry, newConversation }
}
