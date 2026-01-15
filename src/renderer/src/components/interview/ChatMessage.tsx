import type { ReactElement } from 'react';
import type { InterviewMessage } from '@renderer/types/interview';
import { cn } from '@renderer/lib/utils';

interface ChatMessageProps {
  message: InterviewMessage;
}

/**
 * ChatMessage - Single message in the interview chat.
 *
 * User messages: Right-aligned with subtle background.
 * Assistant messages: Left-aligned with no background.
 * Streaming: Shows pulsing indicator when message is being typed.
 */
export function ChatMessage({ message }: ChatMessageProps): ReactElement {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-muted text-foreground'
            : 'bg-transparent text-foreground'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
          {message.isStreaming && (
            <span className="inline-flex ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse ml-1 animation-delay-150" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse ml-1 animation-delay-300" />
            </span>
          )}
        </p>
      </div>
      <span className="text-xs text-muted-foreground/60 px-1">
        {timestamp}
      </span>
    </div>
  );
}
