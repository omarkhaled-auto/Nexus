import {
  useState,
  useRef,
  useEffect,
  type ReactElement,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { useMessages, useIsInterviewing, useInterviewStore } from '@renderer/stores/interviewStore';
import type { InterviewMessage } from '@renderer/types/interview';
import { nanoid } from 'nanoid';

export interface ChatPanelProps {
  className?: string;
}

/**
 * MessageBubble - Individual chat message with role-based styling.
 *
 * AI messages: Left-aligned, muted background, purple left border
 * User messages: Right-aligned, primary background, rounded corners
 */
function MessageBubble({
  message,
  isLatest,
}: {
  message: InterviewMessage;
  isLatest?: boolean;
}): ReactElement {
  const isAI = message.role === 'assistant';
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
      data-testid={isAI ? 'ai-message' : 'user-message'}
    >
      {/* AI Avatar */}
      {isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent-primary" />
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3 relative',
          // AI Message styling
          isAI && [
            'bg-bg-card border border-border-default',
            'rounded-tl-none rounded-tr-xl rounded-br-xl rounded-bl-xl',
            'border-l-2 border-l-accent-primary',
          ],
          // User Message styling
          isUser && [
            'bg-accent-primary/10 border border-accent-primary/20',
            'rounded-tl-xl rounded-tr-none rounded-br-xl rounded-bl-xl',
          ],
          // Streaming animation
          message.isStreaming && 'animate-pulse'
        )}
      >
        {/* Message text */}
        <p className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
          {message.content}
        </p>

        {/* Timestamp */}
        <span className="mt-2 block text-xs text-text-tertiary">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        {/* Typing indicator for streaming messages */}
        {message.isStreaming && isLatest && (
          <div className="flex items-center gap-1 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center">
          <User className="w-4 h-4 text-accent-secondary" />
        </div>
      )}
    </div>
  );
}

/**
 * WelcomeMessage - Initial welcome screen when no messages exist.
 */
function WelcomeMessage(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-accent-primary" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Welcome to Genesis Mode
      </h2>
      <p className="text-sm text-text-secondary max-w-md mb-6">
        I'll help you define your project requirements through a guided conversation.
        Tell me about the application you want to build.
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {['SaaS Platform', 'Mobile App', 'E-commerce Site', 'Dashboard'].map((suggestion) => (
          <span
            key={suggestion}
            className="px-3 py-1.5 text-xs bg-bg-card border border-border-default rounded-full text-text-secondary hover:text-text-primary hover:border-accent-primary/50 cursor-pointer transition-colors"
          >
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * ChatPanel - Interactive chat interface for the interview.
 * Handles message display, input, and real-time streaming.
 */
export function ChatPanel({ className }: ChatPanelProps): ReactElement {
  const messages = useMessages();
  const isInterviewing = useIsInterviewing();
  const addMessage = useInterviewStore((s) => s.addMessage);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when interview starts
  useEffect(() => {
    if (isInterviewing) {
      inputRef.current?.focus();
    }
  }, [isInterviewing]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    // Add user message to store
    addMessage({
      id: nanoid(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // In a real app, this would call the backend to get AI response
    // For now, just reset loading state
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={cn('flex h-full flex-col bg-bg-dark', className)}
      data-testid="chat-panel"
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message: InterviewMessage, index: number) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border-default bg-bg-card p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              className={cn(
                'w-full resize-none rounded-lg border bg-bg-dark px-4 py-3 text-sm',
                'text-text-primary placeholder:text-text-tertiary',
                'border-border-default',
                'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'min-h-[48px] max-h-[150px]'
              )}
              rows={1}
              disabled={!isInterviewing || isLoading}
              data-testid="chat-input"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading || !isInterviewing}
            className={cn(
              'flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center',
              'bg-accent-primary text-white',
              'hover:bg-accent-primary/90 hover:shadow-glow-primary',
              'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
              'transition-all duration-200'
            )}
            data-testid="send-button"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>

        {/* Keyboard shortcut hint */}
        <p className="text-xs text-text-tertiary mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-bg-dark rounded border border-border-default">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 bg-bg-dark rounded border border-border-default">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
