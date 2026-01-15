import { useState, useRef, useCallback, type ReactElement, type KeyboardEvent, type ChangeEvent } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput - Text input for sending messages in the interview chat.
 *
 * Features:
 * - Auto-growing textarea (up to 4 lines, then scroll)
 * - Enter to send, Shift+Enter for newline
 * - Send button with violet accent
 * - Disabled state when waiting for response
 */
export function ChatInput({ onSend, disabled = false, placeholder = 'Type your message...' }: ChatInputProps): ReactElement {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setValue(textarea.value);

    // Auto-resize logic: reset height then set to scrollHeight
    textarea.style.height = 'auto';
    const maxHeight = 120; // ~4 lines
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        size="icon"
        className="h-11 w-11 shrink-0 bg-violet-600 hover:bg-violet-700 text-white disabled:bg-violet-600/50"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}
