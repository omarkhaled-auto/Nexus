import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { InterviewLayout, ChatPanel, RequirementsSidebar } from '@renderer/components/interview';
import { useInterviewStore, useIsInterviewing, useRequirements, useSessionId } from '@renderer/stores/interviewStore';
import { useCurrentProject } from '@renderer/stores/projectStore';
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
  MessageSquare,
  FileText,
} from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

/**
 * Interview Page - Genesis mode interview interface.
 *
 * Split-screen layout with chat on left, requirements sidebar on right.
 * Automatically starts the interview on mount if not already interviewing.
 * Supports draft persistence with auto-save and session recovery.
 *
 * Design: Linear/Raycast-inspired glassmorphism with animated elements.
 */
export default function InterviewPage(): ReactElement {
  const navigate = useNavigate();
  const isInterviewing = useIsInterviewing();
  const requirements = useRequirements();
  const sessionId = useSessionId();
  const currentProject = useCurrentProject();
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

      // Navigate to planning page with requirements context and projectId
      // Planning page will show progress while tasks are created, then auto-navigate to Kanban
      const projectId = currentProject?.id ?? sessionId ?? `temp-${Date.now()}`;
      void navigate('/planning', { state: { requirements, projectId } });
    } catch (err) {
      console.error('Failed to complete interview:', err);
      // Still navigate even if backend call fails - requirements are in store
      completeInterviewStore();
      const projectId = currentProject?.id ?? sessionId ?? `temp-${Date.now()}`;
      void navigate('/planning', { state: { requirements, projectId } });
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
    <AnimatedPage className="h-full flex flex-col bg-[#0D1117] relative overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-20 pointer-events-none" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Page Header - Glassmorphism style */}
      <header className="relative z-10 flex-shrink-0 border-b border-[#30363D]/50 bg-[#161B22]/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back button and title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => { void navigate(-1); }}
              className={cn(
                'p-2 -ml-2 rounded-xl',
                'text-[#8B949E] hover:text-[#F0F6FC]',
                'hover:bg-[#21262D] transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50'
              )}
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#6366F1] shadow-lg shadow-[#7C3AED]/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-lg font-semibold text-[#F0F6FC]">Genesis Interview</h1>
              </div>
              <p className="text-sm text-[#8B949E] mt-0.5">
                Define your project requirements through conversation
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-xs text-[#6E7681]">
              {isSaving ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Saved {formatLastSaved()}</span>
                </>
              ) : null}
            </div>

            {/* Save Draft button */}
            <button
              onClick={() => void handleSaveDraft()}
              disabled={isSavingDraft}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                'bg-[#21262D] border border-[#30363D] text-[#C9D1D9]',
                'hover:bg-[#30363D] hover:text-[#F0F6FC] hover:border-[#484F58]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200'
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
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium',
                'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white',
                'hover:shadow-lg hover:shadow-[#7C3AED]/25',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
                'transition-all duration-200'
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

      {/* Resume Banner - Animated entrance */}
      {showResumeBanner && (
        <div
          className={cn(
            'relative z-10 flex items-center justify-between px-6 py-4',
            'bg-[#7C3AED]/10 border-b border-[#7C3AED]/20',
            'backdrop-blur-sm animate-fade-in-up'
          )}
          data-testid="resume-banner"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-[#7C3AED]/20">
              <RotateCcw className="h-5 w-5 text-[#7C3AED]" />
            </div>
            <div>
              <span className="text-sm font-medium text-[#F0F6FC]">
                Resume your previous interview?
              </span>
              <div className="flex items-center gap-3 text-xs text-[#8B949E] mt-0.5">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {pendingDraft?.messages.length || 0} messages
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {pendingDraft?.requirements.length || 0} requirements
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartFresh}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl',
                'border border-[#30363D] text-[#8B949E] bg-[#21262D]',
                'hover:bg-[#30363D] hover:text-[#F0F6FC] hover:border-[#484F58]',
                'transition-all duration-200'
              )}
              data-testid="start-fresh-button"
            >
              Start Fresh
            </button>
            <button
              onClick={handleResume}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl',
                'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white',
                'hover:shadow-lg hover:shadow-[#7C3AED]/25',
                'transition-all duration-200'
              )}
              data-testid="resume-button"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 flex-1 min-h-0">
        <InterviewLayout
          chatPanel={<ChatPanel />}
          sidebarPanel={<RequirementsSidebar />}
        />
      </main>

      {/* Bottom Status Bar - Glassmorphism */}
      {!showResumeBanner && (
        <footer className="relative z-10 flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-[#30363D]/50 bg-[#161B22]/80 backdrop-blur-xl">
          <div className="flex items-center gap-4 text-xs text-[#6E7681]">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                requirements.length >= 3 ? 'bg-[#10B981]' : 'bg-amber-500'
              )} />
              <span className="text-[#8B949E]">
                {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} captured
              </span>
            </div>
            {requirements.length < 3 && (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-500" />
                Need at least 3 requirements to complete
              </span>
            )}
          </div>

          {/* New Interview button */}
          <button
            onClick={handleStartFresh}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs',
              'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]',
              'transition-all duration-200'
            )}
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
