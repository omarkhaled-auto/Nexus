import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactElement,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { Send, Loader2, Bot, User, Sparkles, AlertCircle, Wand2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { useMessages, useIsInterviewing, useInterviewStore, useSessionId } from '@renderer/stores/interviewStore';
import { useProjectStore } from '@renderer/stores/projectStore';
import type { InterviewMessage, RequirementCategory, RequirementPriority } from '@renderer/types/interview';
import { nanoid } from 'nanoid';

export interface ChatPanelProps {
  className?: string;
}

/**
 * MessageBubble - Individual chat message with modern glassmorphism styling.
 *
 * AI messages: Left-aligned with purple glow when streaming
 * User messages: Right-aligned with gradient background
 */
function MessageBubble({
  message,
  isLatest,
  index,
}: {
  message: InterviewMessage;
  isLatest?: boolean;
  index: number;
}): ReactElement {
  const isAI = message.role === 'assistant';
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 animate-fade-in-up',
        isUser ? 'justify-end' : 'justify-start'
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
      data-testid={isAI ? 'ai-message' : 'user-message'}
    >
      {/* AI Avatar */}
      {isAI && (
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
          'bg-gradient-to-br from-[#7C3AED] to-[#6366F1]',
          'shadow-lg shadow-[#7C3AED]/20'
        )}>
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[85%] px-4 py-3 relative',
          // AI Message styling
          isAI && [
            'rounded-2xl rounded-tl-sm',
            'bg-[#161B22] border border-[#30363D]',
            message.isStreaming && 'border-l-2 border-l-[#7C3AED] shadow-[-4px_0_20px_rgba(124,58,237,0.2)]',
          ],
          // User Message styling
          isUser && [
            'rounded-2xl rounded-tr-sm',
            'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white',
            'shadow-lg shadow-[#7C3AED]/20',
          ],
        )}
      >
        {/* Message text */}
        <p className={cn(
          'whitespace-pre-wrap text-sm leading-relaxed',
          isAI ? 'text-[#E6EDF3]' : 'text-white'
        )}>
          {message.content}
        </p>

        {/* Timestamp */}
        <span className={cn(
          'mt-2 block text-xs',
          isAI ? 'text-[#6E7681]' : 'text-white/70'
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        {/* Typing indicator for streaming messages */}
        {message.isStreaming && isLatest && (
          <div className="flex items-center gap-1.5 mt-3">
            <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
          'bg-[#21262D] border border-[#30363D]'
        )}>
          <User className="w-4 h-4 text-[#8B949E]" />
        </div>
      )}
    </div>
  );
}

/**
 * WelcomeMessage - Initial welcome screen with modern design.
 */
function WelcomeMessage(): ReactElement {
  const suggestions = [
    { label: 'SaaS Platform', icon: '🚀' },
    { label: 'Mobile App', icon: '📱' },
    { label: 'E-commerce', icon: '🛒' },
    { label: 'Dashboard', icon: '📊' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center animate-fade-in-up">
      {/* Icon with glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-[#7C3AED]/30 blur-2xl animate-pulse" />
        <div className={cn(
          'relative w-20 h-20 rounded-2xl flex items-center justify-center',
          'bg-gradient-to-br from-[#7C3AED] to-[#6366F1]',
          'shadow-xl shadow-[#7C3AED]/30'
        )}>
          <Wand2 className="w-10 h-10 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#F0F6FC] mb-2">
        Welcome to Genesis Mode
      </h2>
      <p className="text-[#8B949E] max-w-md mb-8">
        I'll help you define your project requirements through a guided conversation.
        Tell me about the application you want to build.
      </p>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-3 justify-center max-w-lg">
        {suggestions.map((suggestion) => (
          <span
            key={suggestion.label}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm',
              'bg-[#161B22] border border-[#30363D] rounded-xl',
              'text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#7C3AED]/50',
              'cursor-pointer transition-all duration-200',
              'hover:shadow-lg hover:shadow-[#7C3AED]/10'
            )}
          >
            <span>{suggestion.icon}</span>
            {suggestion.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Map backend category to renderer category type
 */
function mapCategory(backendCategory: string): RequirementCategory {
  const mapping: Partial<Record<string, RequirementCategory>> = {
    'functional': 'functional',
    'non-functional': 'non_functional',
    'technical': 'technical',
    'constraint': 'constraint',
    'assumption': 'functional',
  };
  return mapping[backendCategory] ?? 'functional';
}

/**
 * Map backend priority to renderer priority type
 */
function mapPriority(backendPriority: string): RequirementPriority {
  const mapping: Partial<Record<string, RequirementPriority>> = {
    'must': 'must',
    'should': 'should',
    'could': 'could',
    'wont': 'wont',
  };
  return mapping[backendPriority] ?? 'should';
}

function getNexusAPI(): typeof window.nexusAPI | undefined {
  return (window as Window & { nexusAPI?: typeof window.nexusAPI }).nexusAPI;
}

/**
 * ChatPanel - Interactive chat interface for the interview.
 * Modern design with glassmorphism and smooth animations.
 */
export function ChatPanel({ className }: ChatPanelProps): ReactElement {
  const messages = useMessages();
  const isInterviewing = useIsInterviewing();
  const addMessage = useInterviewStore((s) => s.addMessage);
  const addRequirement = useInterviewStore((s) => s.addRequirement);
  const setSessionId = useInterviewStore((s) => s.setSessionId);
  const restoreSession = useInterviewStore((s) => s.restoreSession);
  const sessionId = useSessionId();
  const currentProject = useProjectStore((s) => s.currentProject);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isInitializing = useRef(false);

  /**
   * Initialize the interview session with the backend
   */
  const initializeSession = useCallback(async () => {
    if (sessionId || isInitializing.current) {
      return;
    }

    const nexusAPI = getNexusAPI();
    if (!nexusAPI) {
      setError('Backend not available. Please run in Electron to use the interview feature.');
      return;
    }

    isInitializing.current = true;
    setError(null);

    try {
      const projectId = currentProject?.id || `temp-${nanoid(8)}`;
      let session = await nexusAPI.interview.resumeByProject(projectId);

      if (!session) {
        session = await nexusAPI.interview.start(projectId, currentProject?.name);
      }

      setSessionId(session.id);

      if (session.messages.length === 0) {
        const greeting = await nexusAPI.interview.getGreeting();
        addMessage({
          id: nanoid(),
          role: 'assistant',
          content: greeting,
          timestamp: Date.now(),
        });
      } else {
        const restoredMessages: InterviewMessage[] = session.messages.map((msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date | string }) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp).getTime() : msg.timestamp.getTime(),
        }));

        const restoredRequirements = session.extractedRequirements.map((req: { id: string; category: string; text: string; priority: string }) => ({
          id: req.id,
          category: mapCategory(req.category),
          text: req.text,
          priority: mapPriority(req.priority),
          source: 'interview' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));

        restoreSession(restoredMessages, restoredRequirements);
        console.log(`[ChatPanel] Restored session with ${restoredMessages.length} messages and ${restoredRequirements.length} requirements`);
      }
    } catch (err) {
      console.error('Failed to initialize interview session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start interview session. Please try again.';
      setError(errorMessage);
    } finally {
      isInitializing.current = false;
    }
  }, [sessionId, currentProject?.id, addMessage, setSessionId, restoreSession]);

  useEffect(() => {
    if (isInterviewing && !sessionId && !isInitializing.current) {
      void initializeSession();
    }
  }, [isInterviewing, sessionId, initializeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isInterviewing) {
      inputRef.current?.focus();
    }
  }, [isInterviewing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setError(null);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  /**
   * Send a message to the backend interview engine
   */
  const sendMessageToBackend = useCallback(async (message: string, _userMessageId: string) => {
    const nexusAPI = getNexusAPI();
    if (!sessionId || !nexusAPI) {
      setError('Backend not available. Please run in Electron to use the interview feature.');
      return;
    }

    try {
      const assistantMessageId = nanoid();
      addMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      });

      const result = await nexusAPI.interview.sendMessage(sessionId, message);

      useInterviewStore.getState().updateMessage(assistantMessageId, {
        content: result.response,
        isStreaming: false,
      });

      if (result.extractedRequirements.length > 0) {
        const now = Date.now();
        for (const req of result.extractedRequirements) {
          addRequirement({
            id: req.id,
            category: mapCategory(req.category),
            text: req.text,
            priority: mapPriority(req.priority),
            source: 'interview',
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } catch (err) {
      console.error('Failed to send message to backend:', err);
      setError('Failed to send message. Please try again.');

      useInterviewStore.getState().updateMessage(
        messages[messages.length - 1]?.id || '',
        { isStreaming: false }
      );
    }
  }, [sessionId, addMessage, addRequirement, messages]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setError(null);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    const userMessageId = nanoid();
    addMessage({
      id: userMessageId,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    void sendMessageToBackend(message, userMessageId)
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-[#0D1117] relative overflow-hidden',
        className
      )}
      data-testid="chat-panel"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          <div className="max-w-3xl mx-auto p-6 space-y-5">
            {messages.map((message: InterviewMessage, index: number) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
                index={index}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Glassmorphism style */}
      <div className="relative z-10 flex-shrink-0 border-t border-[#30363D]/50 bg-[#161B22]/80 backdrop-blur-xl p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className={cn(
                  'w-full resize-none rounded-xl border px-4 py-3 text-sm',
                  'bg-[#0D1117] text-[#F0F6FC] placeholder:text-[#6E7681]',
                  'border-[#30363D]',
                  'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'min-h-[52px] max-h-[150px]',
                  'transition-all duration-200'
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
                'flex-shrink-0 h-[52px] w-[52px] rounded-xl flex items-center justify-center',
                'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white',
                'hover:shadow-lg hover:shadow-[#7C3AED]/30',
                'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:ring-offset-2 focus:ring-offset-[#0D1117]',
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
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 mt-3 px-1 text-xs text-red-400" role="alert">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Keyboard shortcut hint */}
          {!error && (
            <p className="text-xs text-[#6E7681] mt-3 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-[#21262D] rounded border border-[#30363D] text-[#8B949E]">Enter</kbd> to send,{' '}
              <kbd className="px-1.5 py-0.5 bg-[#21262D] rounded border border-[#30363D] text-[#8B949E]">Shift+Enter</kbd> for new line
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
