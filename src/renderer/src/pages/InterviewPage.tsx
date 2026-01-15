import { useEffect, type ReactElement } from 'react';
import { InterviewLayout } from '@renderer/components/interview/InterviewLayout';
import { ChatPanel } from '@renderer/components/interview/ChatPanel';
import { useInterviewStore, useIsInterviewing } from '@renderer/stores/interviewStore';

/**
 * Interview Page - Genesis mode interview interface.
 *
 * Split-screen layout with chat on left, requirements sidebar on right.
 * Automatically starts the interview on mount if not already interviewing.
 */
export default function InterviewPage(): ReactElement {
  const isInterviewing = useIsInterviewing();
  const startInterview = useInterviewStore((s) => s.startInterview);

  // Start interview on mount if not already in progress
  useEffect(() => {
    if (!isInterviewing) {
      startInterview();
    }
  }, [isInterviewing, startInterview]);

  return (
    <InterviewLayout
      chatPanel={<ChatPanel />}
      sidebarPanel={
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Requirements will appear here</p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              As you describe your project
            </p>
          </div>
        </div>
      }
    />
  );
}
