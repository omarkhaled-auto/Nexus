import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { InterviewLayout, ChatPanel, RequirementsSidebar } from '@renderer/components/interview';
import { useInterviewStore, useIsInterviewing, useRequirements } from '@renderer/stores/interviewStore';
import { useInterviewPersistence } from '@renderer/hooks';
import { AnimatedPage } from '@renderer/components/AnimatedPage';
import {
  RotateCcw,
  Check,
  Save,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@renderer/lib/utils';

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

  // Handle save draft
  const handleSaveDraft = () => {
    // The persistence hook auto-saves, but we can trigger a manual save here
    // For now, this is just a visual confirmation
  };

  // Handle complete interview
  const handleComplete = () => {
    // TODO: Integrate with backend to finalize requirements
    console.log('Interview complete with requirements:', requirements);
    navigate('/tasks');
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
              onClick={handleSaveDraft}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'border border-border-default bg-bg-dark text-text-secondary',
                'hover:bg-bg-hover hover:text-text-primary',
                'transition-colors'
              )}
              data-testid="save-draft-button"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>

            {/* Complete button */}
            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-accent-primary text-white',
                'hover:bg-accent-primary/90 hover:shadow-glow-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
                'transition-all'
              )}
              data-testid="complete-button"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete
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
