import { useEffect, type ReactElement } from 'react';
import { InterviewLayout, ChatPanel, RequirementsSidebar } from '@renderer/components/interview';
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
      sidebarPanel={<RequirementsSidebar />}
    />
  );
}
