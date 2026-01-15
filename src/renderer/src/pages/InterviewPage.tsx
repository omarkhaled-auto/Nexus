import { useEffect, useState, type ReactElement } from 'react';
import { InterviewLayout, ChatPanel, RequirementsSidebar } from '@renderer/components/interview';
import { useInterviewStore, useIsInterviewing } from '@renderer/stores/interviewStore';
import { useInterviewPersistence } from '@renderer/hooks';
import { RotateCcw, Check } from 'lucide-react';

/**
 * Interview Page - Genesis mode interview interface.
 *
 * Split-screen layout with chat on left, requirements sidebar on right.
 * Automatically starts the interview on mount if not already interviewing.
 * Supports draft persistence with auto-save and session recovery.
 */
export default function InterviewPage(): ReactElement {
  const isInterviewing = useIsInterviewing();
  const startInterview = useInterviewStore((s) => s.startInterview);
  const reset = useInterviewStore((s) => s.reset);

  const { restore, applyDraft, clearDraft, markAsInitialized, isSaving, lastSaved } =
    useInterviewPersistence();

  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof restore>>(null);

  // Check for saved draft on mount
  useEffect(() => {
    const draft = restore();
    if (draft && draft.messages.length > 0) {
      // Show resume prompt if there's meaningful data
      setPendingDraft(draft);
      setShowResumeBanner(true);
    } else {
      // No draft to restore, start fresh
      markAsInitialized();
      if (!isInterviewing) {
        startInterview();
      }
    }
  }, []); // Only run on mount

  // Handle resume
  const handleResume = () => {
    if (pendingDraft) {
      applyDraft(pendingDraft);
      // Make sure we're interviewing
      if (!isInterviewing) {
        startInterview();
      }
    }
    setShowResumeBanner(false);
    setPendingDraft(null);
  };

  // Handle start fresh
  const handleStartFresh = () => {
    clearDraft();
    markAsInitialized();
    reset();
    startInterview();
    setShowResumeBanner(false);
    setPendingDraft(null);
  };

  // Handle new interview button
  const handleNewInterview = () => {
    clearDraft();
    reset();
    startInterview();
  };

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    } else {
      return lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Resume Banner */}
      {showResumeBanner && (
        <div className="flex items-center justify-between px-6 py-3 bg-violet-500/10 border-b border-violet-500/20">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-violet-500" />
            <span className="text-sm text-foreground">
              Resume your previous interview?
            </span>
            <span className="text-xs text-muted-foreground">
              ({pendingDraft?.messages.length || 0} messages,{' '}
              {pendingDraft?.requirements.length || 0} requirements)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartFresh}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground
                        border border-border rounded-md hover:bg-background/50 transition-colors"
            >
              Start Fresh
            </button>
            <button
              onClick={handleResume}
              className="px-3 py-1.5 text-xs text-white bg-violet-600 hover:bg-violet-500
                        rounded-md transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 relative">
        <InterviewLayout
          chatPanel={<ChatPanel />}
          sidebarPanel={<RequirementsSidebar />}
        />
      </div>

      {/* Bottom Status Bar */}
      {!showResumeBanner && (
        <div className="flex items-center justify-between px-6 py-2 border-t border-border bg-background/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {/* Draft saved indicator */}
            <div className="flex items-center gap-1.5">
              {isSaving ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Draft saved {formatLastSaved()}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* New Interview button */}
          <button
            onClick={handleNewInterview}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>New Interview</span>
          </button>
        </div>
      )}
    </div>
  );
}
