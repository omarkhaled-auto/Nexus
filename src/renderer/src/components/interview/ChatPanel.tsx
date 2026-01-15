import { useEffect, useRef, useCallback, type ReactElement } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import {
  useInterviewStore,
  useMessages,
  useInterviewStage,
} from '@renderer/stores/interviewStore';
import type { InterviewMessage, InterviewStage } from '@renderer/types/interview';
import { Sparkles } from 'lucide-react';

// Stage display labels
const STAGE_LABELS: Record<InterviewStage, string> = {
  welcome: 'Getting Started',
  project_overview: 'Project Overview',
  technical_requirements: 'Technical Details',
  features: 'Features',
  constraints: 'Constraints',
  review: 'Review',
  complete: 'Complete',
};

/**
 * ChatPanel - Main chat interface for the Genesis interview.
 *
 * Features:
 * - Stage indicator at top showing current interview phase
 * - Messages list with auto-scroll to bottom
 * - Chat input at bottom
 * - Welcome message when starting
 */
export function ChatPanel(): ReactElement {
  const messages = useMessages();
  const stage = useInterviewStage();
  const addMessage = useInterviewStore((s) => s.addMessage);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = useCallback(
    (content: string) => {
      const newMessage: InterviewMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      addMessage(newMessage);

      // TODO: Send to backend and handle streaming response
      // For now, simulate an assistant response for demo purposes
      setTimeout(() => {
        const assistantMessage: InterviewMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "Thanks for sharing! I'm collecting your thoughts. (Backend integration coming soon)",
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMessage);
      }, 500);
    },
    [addMessage]
  );

  const showWelcome = stage === 'welcome' && messages.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Stage Indicator */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="p-1.5 rounded-md bg-violet-500/10">
          <Sparkles className="h-4 w-4 text-violet-500" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {STAGE_LABELS[stage]}
        </span>
        <span className="text-xs text-muted-foreground/60 ml-auto">
          Genesis Interview
        </span>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
      >
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-violet-500/10 mb-4">
              <Sparkles className="h-8 w-8 text-violet-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Welcome to Genesis
            </h2>
            <p className="text-muted-foreground max-w-md">
              Let's build something amazing together. Tell me about the project
              you want to create, and I'll help you define the requirements.
            </p>
            <p className="text-sm text-muted-foreground/60 mt-4">
              Start by describing your idea below
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Chat Input */}
      <ChatInput
        onSend={handleSendMessage}
        placeholder="Describe your project idea..."
      />
    </div>
  );
}
