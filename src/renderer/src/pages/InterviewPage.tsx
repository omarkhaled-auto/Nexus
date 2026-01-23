import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { InterviewLayout, ChatPanel, RequirementsSidebar } from '@renderer/components/interview';
import { useInterviewStore, useIsInterviewing, useRequirements, useSessionId } from '@renderer/stores/interviewStore';
import { useInterviewPersistence } from '@renderer/hooks';
import { AnimatedPage } from '@renderer/components/AnimatedPage';
import {
  RotateCcw,
  Check,
  Save,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

/**
 * Interview Page - Genesis mode interview interface.
 *
 * Split-screen layout with chat on left, requirements sidebar on right.
 * Automatically starts the interview on mount if not already interviewing.
 * Supports draft persistence with auto-save and session recovery.
 */
export default function InterviewPage(): ReactElement {
  const navigate = useNavigate();
  const isInterviewing = useIsInterviewing();
  const requirements = useRequirements();
  const sessionId = useSessionId();
  const startInterview = useInterviewStore((s) => s.startInterview);
  const completeInterviewStore = useInterviewStore((s) => s.completeInterview);
  const reset = useInterviewStore((s) => s.reset);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

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

  // Handle save draft - persists to backend via interview.pause()
  const handleSaveDraft = async (): Promise<void> => {
    if (isSavingDraft) return;

    setIsSavingDraft(true);

    try {
      // Save to backend if we have a session
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime check for non-Electron environments
      if (sessionId && window.nexusAPI) {
        await window.nexusAPI.interview.pause(sessionId);
        toast.success('Draft saved to server');
      } else {
        // LocalStorage auto-save is already happening via useInterviewPersistence
        toast.info('Draft saved locally');
      }
    } catch (err) {
      console.error('Failed to save draft to backend:', err);
      // LocalStorage save still works, so inform user
      toast.warning('Saved locally only - server unavailable');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Handle complete interview
  const handleComplete = async (): Promise<void> => {
    if (isCompleting) return;

    setIsCompleting(true);

    try {
      // End the interview session in the backend if we have a session
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime check for non-Electron environments
      if (sessionId && window.nexusAPI) {
        await window.nexusAPI.interview.end(sessionId);
      }

      // Complete the interview in the store (emits INTERVIEW_COMPLETED event)
      completeInterviewStore();

      // Navigate to planning page with requirements context
      // Planning page will show progress while tasks are created, then auto-navigate to Kanban
      void navigate('/planning', { state: { requirements } });
    } catch (err) {
      console.error('Failed to complete interview:', err);
      // Still navigate even if backend call fails - requirements are in store
      completeInterviewStore();
      void navigate('/planning', { state: { requirements } });
    } finally {
      setIsCompleting(false);
    }
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

  // Can complete when we have at least 3 requirements
  const canComplete = requirements.length >= 3;

  return (
    <AnimatedPage className="h-full flex flex-col bg-bg-dark">
      {/* Page Header */}
      <header className="flex-shrink-0 border-b border-border-default bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back button and title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-primary" />
                <h1 className="text-lg font-semibold text-text-primary">Genesis Interview</h1>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                Define your project requirements through conversation
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              {isSaving ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-accent-warning animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-3.5 w-3.5 text-accent-success" />
                  <span>Saved {formatLastSaved()}</span>
                </>
              ) : null}
            </div>

            {/* Save Draft button */}
            <button
              onClick={() => void handleSaveDraft()}
              disabled={isSavingDraft}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'border border-border-default bg-bg-dark text-text-secondary',
                'hover:bg-bg-hover hover:text-text-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              data-testid="save-draft-button"
            >
              {isSavingDraft ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </button>

            {/* Complete button */}
            <button
              onClick={() => void handleComplete()}
              disabled={!canComplete || isCompleting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-accent-primary text-white',
                'hover:bg-accent-primary/90 hover:shadow-glow-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
                'transition-all'
              )}
              data-testid="complete-button"
            >
              {isCompleting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Resume Banner */}
      {showResumeBanner && (
        <div
          className="flex items-center justify-between px-6 py-3 bg-accent-primary/10 border-b border-accent-primary/20"
          data-testid="resume-banner"
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-accent-primary" />
            <div>
              <span className="text-sm font-medium text-text-primary">
                Resume your previous interview?
              </span>
              <span className="text-xs text-text-secondary ml-2">
                ({pendingDraft?.messages.length || 0} messages,{' '}
                {pendingDraft?.requirements.length || 0} requirements)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartFresh}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg',
                'border border-border-default text-text-secondary',
                'hover:bg-bg-hover hover:text-text-primary',
                'transition-colors'
              )}
              data-testid="start-fresh-button"
            >
              Start Fresh
            </button>
            <button
              onClick={handleResume}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg',
                'bg-accent-primary text-white',
                'hover:bg-accent-primary/90',
                'transition-colors'
              )}
              data-testid="resume-button"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        <InterviewLayout
          chatPanel={<ChatPanel />}
          sidebarPanel={<RequirementsSidebar />}
        />
      </main>

      {/* Bottom Status Bar */}
      {!showResumeBanner && (
        <footer className="flex-shrink-0 flex items-center justify-between px-6 py-2 border-t border-border-default bg-bg-card">
          <div className="flex items-center gap-4 text-xs text-text-tertiary">
            <span>
              {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} captured
            </span>
            {requirements.length < 3 && (
              <span className="text-accent-warning">
                Need at least 3 requirements to complete
              </span>
            )}
          </div>

          {/* New Interview button */}
          <button
            onClick={handleStartFresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            data-testid="new-interview-button"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Interview</span>
          </button>
        </footer>
      )}
    </AnimatedPage>
  );
}
