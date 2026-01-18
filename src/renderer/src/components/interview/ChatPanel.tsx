import { useState, useRef, useEffect, type ReactElement, type KeyboardEvent, type FormEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useMessages, useIsInterviewing, useInterviewStore } from '@renderer/stores/interviewStore'
import type { InterviewMessage } from '@renderer/types/interview'
import { nanoid } from 'nanoid'

export interface ChatPanelProps {
  className?: string
}

/**
 * ChatPanel - Interactive chat interface for the interview.
 * Handles message display, input, and real-time streaming.
 */
export function ChatPanel({ className }: ChatPanelProps): ReactElement {
  const messages = useMessages()
  const isInterviewing = useIsInterviewing()
  const addMessage = useInterviewStore((s) => s.addMessage)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when interview starts
  useEffect(() => {
    if (isInterviewing) {
      inputRef.current?.focus()
    }
  }, [isInterviewing])

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to store
    addMessage({
      id: nanoid(),
      role: 'user',
      content: message,
      timestamp: Date.now()
    })

    // In a real app, this would call the backend to get AI response
    // For now, just reset loading state
    setTimeout(() => {
      setIsLoading(false)
    }, 100)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message: InterviewMessage) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted',
                  message.isStreaming && 'animate-pulse'
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                <span className="mt-1 block text-xs opacity-50">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value) }}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
            disabled={!isInterviewing || isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || !isInterviewing}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
